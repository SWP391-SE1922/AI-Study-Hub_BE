const path = require('path');

// Nhận diện ký tự tiếng Việt chuẩn để tránh decode nhầm tên file đang đúng.
const VIETNAMESE_REGEX = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơưẠ-ỹ]/g;

// Các dấu hiệu tên file bị lỗi encoding kiểu: Ä‘á»‘i tÆ°á»£ng, phÆ°Æ¡ng phÃ¡p...
const MOJIBAKE_REGEX = /(?:Ã|Â|Ä|Å|Æ|Ð|á[º»]|à[\u00A0-\u00BF]|�)/g;

function scoreFileName(name) {
  const mojibakeCount = (name.match(MOJIBAKE_REGEX) || []).length;
  const vietnameseCount = (name.match(VIETNAMESE_REGEX) || []).length;
  const controlCount = (name.match(/[\u0000-\u001f\u007f-\u009f]/g) || []).length;

  // Điểm càng thấp càng tốt.
  return mojibakeCount * 5 + controlCount * 10 - vietnameseCount;
}

function stripUnsafePath(originalName) {
  const value = String(originalName || '').replace(/\\/g, '/');
  return path.basename(value).trim();
}

/**
 * Sửa lỗi tên file tiếng Việt bị hiển thị sai do multipart/multer đọc filename theo latin1.
 */
function normalizeUploadedFileName(originalName) {
  const safeName = stripUnsafePath(originalName);
  if (!safeName) return 'document';

  const candidates = [safeName];

  try {
    const decoded = Buffer.from(safeName, 'latin1').toString('utf8');
    if (decoded && decoded !== safeName) {
      candidates.push(decoded);
    }
  } catch (error) {
    // Nếu không decode được thì dùng tên gốc đã làm sạch.
  }

  const bestName = candidates.sort((a, b) => scoreFileName(a) - scoreFileName(b))[0];

  return bestName
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim() || safeName;
}

function normalizeDocumentFileNames(document) {
  if (!document) return document;

  if (Array.isArray(document)) {
    return document.map(normalizeDocumentFileNames);
  }

  return {
    ...document,
    fileName: normalizeUploadedFileName(document.fileName),
    versions: Array.isArray(document.versions)
      ? document.versions.map((version) => ({
          ...version,
          fileName: normalizeUploadedFileName(version.fileName),
        }))
      : document.versions,
  };
}

module.exports = {
  normalizeUploadedFileName,
  normalizeDocumentFileNames,
};
