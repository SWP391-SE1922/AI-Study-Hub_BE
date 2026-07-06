const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const { randomUUID } = require('crypto');

const MAX_PREVIEW_CHARS = Number(process.env.FILE_PREVIEW_MAX_CHARS || 1800);
const MAX_REMOTE_BYTES = Number(process.env.FILE_PREVIEW_MAX_REMOTE_BYTES || 15 * 1024 * 1024);

const SUPPORTED_OFFICE_EXTENSIONS = new Set(['.docx', '.pptx', '.xlsx']);
const SUPPORTED_TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.java', '.py', '.sql', '.log',
]);

function trimPreview(text, maxChars = MAX_PREVIEW_CHARS) {
  const normalized = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n[\s\n]+/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!normalized) return null;
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars).trim()}...` : normalized;
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripXmlTags(value) {
  return String(value || '')
    .replace(/<\/?[a-zA-Z0-9:_-]+(?:\s[^>]*)?>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanExtractedText(value) {
  const decoded = decodeXmlEntities(value);
  return stripXmlTags(decoded)
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function extractTagText(xml, tagPattern) {
  const parts = [];
  let match;
  const regex = new RegExp(tagPattern, 'g');

  while ((match = regex.exec(xml)) !== null) {
    const text = cleanExtractedText(match[1]);
    if (text) parts.push(text);
  }

  return parts.join(' ');
}

function sortOfficeEntries(names) {
  return names.sort((a, b) => {
    const aNumber = Number(a.match(/(\d+)/)?.[1] || 0);
    const bNumber = Number(b.match(/(\d+)/)?.[1] || 0);
    return aNumber - bNumber || a.localeCompare(b);
  });
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      return offset;
    }
  }

  return -1;
}

function readZipTextEntries(filePath, shouldReadEntry) {
  const buffer = fs.readFileSync(filePath);
  const eocdOffset = findEndOfCentralDirectory(buffer);

  if (eocdOffset < 0) {
    return {};
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = {};
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) break;

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.slice(offset + 46, offset + 46 + fileNameLength).toString('utf8');

    offset += 46 + fileNameLength + extraLength + commentLength;

    if (!shouldReadEntry(fileName)) continue;
    if (localHeaderOffset + 30 > buffer.length || buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;

    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

    try {
      const inflated = compressionMethod === 0
        ? compressedData
        : compressionMethod === 8
          ? zlib.inflateRawSync(compressedData)
          : null;

      if (inflated) {
        entries[fileName] = inflated.toString('utf8');
      }
    } catch (error) {
      console.warn(`Không thể đọc nội dung preview từ ${fileName}:`, error.message);
    }
  }

  return entries;
}

function extractOfficeText(filePath, extension) {
  if (extension === '.pptx') {
    const entries = readZipTextEntries(filePath, (name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
    const text = sortOfficeEntries(Object.keys(entries))
      .map((name, index) => {
        const slideText = extractTagText(entries[name], '<a:t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/a:t>');
        return slideText ? `Slide ${index + 1}: ${slideText}` : '';
      })
      .filter(Boolean)
      .join('\n');
    return trimPreview(text);
  }

  if (extension === '.docx') {
    const entries = readZipTextEntries(filePath, (name) => /^word\/(document|header\d+|footer\d+)\.xml$/i.test(name));
    const text = sortOfficeEntries(Object.keys(entries))
      .map((name) => extractTagText(entries[name], '<w:t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/w:t>'))
      .filter(Boolean)
      .join('\n');
    return trimPreview(text);
  }

  if (extension === '.xlsx') {
    const entries = readZipTextEntries(filePath, (name) => name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/i.test(name));
    const sharedStrings = entries['xl/sharedStrings.xml']
      ? extractTagText(entries['xl/sharedStrings.xml'], '<t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/t>')
      : '';

    const worksheetNumbers = sortOfficeEntries(Object.keys(entries).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)))
      .map((name) => extractTagText(entries[name], '<v[^>]*>([\\s\\S]*?)<\\/v>'))
      .filter(Boolean)
      .join(' ');

    return trimPreview([sharedStrings, worksheetNumbers].filter(Boolean).join('\n'));
  }

  return null;
}

function isLikelyTextFile(file, extension) {
  const mimeType = file?.mimetype || file?.mimeType || '';
  return SUPPORTED_TEXT_EXTENSIONS.has(extension)
    || mimeType.startsWith('text/')
    || mimeType.includes('json')
    || mimeType.includes('xml');
}

async function extractFilePreview(file) {
  if (!file?.path || !fs.existsSync(file.path)) return null;

  const extension = path.extname(file.originalname || file.fileName || file.path).toLowerCase();

  try {
    if (SUPPORTED_OFFICE_EXTENSIONS.has(extension)) {
      return extractOfficeText(file.path, extension);
    }

    if (isLikelyTextFile(file, extension)) {
      const fd = fs.openSync(file.path, 'r');
      const buffer = Buffer.alloc(Math.min(256 * 1024, file.size || 256 * 1024));
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      return trimPreview(buffer.slice(0, bytesRead).toString('utf8'));
    }
  } catch (error) {
    console.warn('Không thể trích xuất nội dung xem trước:', error.message);
  }

  return null;
}

function downloadToTempFile(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https://') ? https : http;
    const tempPath = path.join(os.tmpdir(), `ai-study-hub-preview-${randomUUID()}${path.extname(new URL(url).pathname)}`);
    const fileStream = fs.createWriteStream(tempPath);
    let receivedBytes = 0;
    let finished = false;

    const cleanup = () => {
      if (!finished) {
        finished = true;
        fileStream.destroy();
        fs.unlink(tempPath, () => {});
      }
    };

    const request = client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        cleanup();
        return resolve(downloadToTempFile(new URL(response.headers.location, url).toString()));
      }

      if (response.statusCode !== 200) {
        cleanup();
        return resolve(null);
      }

      response.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_REMOTE_BYTES) {
          request.destroy();
          cleanup();
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        if (!finished) {
          finished = true;
          fileStream.close(() => resolve(tempPath));
        }
      });
    });

    request.setTimeout(8000, () => {
      request.destroy();
      cleanup();
      resolve(null);
    });

    request.on('error', () => {
      cleanup();
      resolve(null);
    });

    fileStream.on('error', () => {
      cleanup();
      resolve(null);
    });
  });
}

async function extractFilePreviewFromUrl(fileUrl, metadata = {}) {
  if (!/^https?:\/\//i.test(fileUrl || '')) return null;

  const tempPath = await downloadToTempFile(fileUrl);
  if (!tempPath) return null;

  try {
    return await extractFilePreview({
      path: tempPath,
      originalname: metadata.fileName || path.basename(new URL(fileUrl).pathname),
      mimetype: metadata.mimeType,
      size: metadata.fileSize,
    });
  } finally {
    fs.unlink(tempPath, () => {});
  }
}

module.exports = {
  extractFilePreview,
  extractFilePreviewFromUrl,
  cleanExtractedText,
};
