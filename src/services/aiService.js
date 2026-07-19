const lancedb = require('vectordb');
const ollama = require('ollama').default;
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const tesseract = require('tesseract.js');
const prisma = require('../config/database');

const VECTOR_DB_PATH = path.join(__dirname, '../../uploads/vectordb');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(path.join(__dirname, '../../uploads'))) {
  fs.mkdirSync(path.join(__dirname, '../../uploads'), { recursive: true });
}

/**
 * Xác định model tuỳ thuộc vào gói plan của user.
 * Mặc định trả về qwen2.5:3b (hoặc model mặc định khác), nếu là user PRO thì dùng qwen2.5:7b.
 */
const getModelForUser = async (userId) => {
  if (!userId) return 'llama3';
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return 'llama3';
    if (user.plan === 'PREMIUM') return 'mistral';
    if (user.plan === 'VIP' || user.plan === 'UNLIMITED' || user.plan === 'PRO') return 'qwen2.5';
    return 'llama3';
  } catch (err) {
    return 'llama3';
  }
};

const embedText = async (text) => {
  const res = await ollama.embeddings({
    model: 'nomic-embed-text',
    prompt: text,
  });
  return res.embedding;
};

const extractText = async (filePath, mimeType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File không tồn tại');
  }

  // PDF
  if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
    const buf = await fs.promises.readFile(filePath);
    const data = await pdfParse(buf);
    return data.text;
  }

  // Word (DOCX)
  if (mimeType.includes('word') || filePath.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // Ảnh (OCR qua tesseract)
  if (mimeType.startsWith('image/')) {
    const { data: { text } } = await tesseract.recognize(filePath, 'vie+eng');
    return text;
  }

  // Text thuần
  if (mimeType.startsWith('text/') || filePath.endsWith('.txt')) {
    return await fs.promises.readFile(filePath, 'utf-8');
  }

  // Thử đọc như file văn bản nếu không bắt được mime-type hợp lệ
  try {
    const buf = await fs.promises.readFile(filePath);

    // Kiểm tra Magic Bytes
    if (buf.length > 4 && buf.toString('utf8', 0, 4) === '%PDF') {
      const data = await pdfParse(buf);
      return data.text;
    }
    if (buf.length > 4 && buf.toString('hex', 0, 4) === '504b0304') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        if (result.value) return result.value;
      } catch (e) {}
    }

    // Cuối cùng thử đọc thuần Tex
    return buf.toString('utf-8');
  } catch (err) {
    console.warn("Fallback extract error:", err);
    return "";
  }
};

const ingestFile = async (filePath, mimeType, metadata) => {
  try {
    const rawText = await extractText(filePath, mimeType);
    if (!rawText || rawText.trim() === '') {
      console.log('No text extracted, skipping AI ingestion for', metadata.fileName);
      return;
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 100,
    });
    const chunks = await splitter.splitText(rawText);

    const db = await lancedb.connect(VECTOR_DB_PATH);
    const records = [];

    for (const [i, chunk] of chunks.entries()) {
      const vector = await embedText(chunk);
      records.push({
        vector,
        text: chunk,
        source_file: metadata.fileName,
        subject: metadata.subject || 'Chưa phân loại',
        document_id: metadata.documentId || 'unknown',
        chunk_index: i,
      });
    }

    const tableNames = await db.tableNames();
    const tableExists = tableNames.includes('study_docs');

    if (tableExists) {
      const table = await db.openTable('study_docs');
      await table.add(records);
    } else {
      await db.createTable('study_docs', records);
    }
    console.log(`Ingested ${chunks.length} chunks for ${metadata.fileName} into LanceDB`);
  } catch (err) {
    console.error(`AI Ingestion failed for ${metadata.fileName}:`, err.message);
  }
};

const askQuestion = async (question, mode = 'qa', userId = null) => {
  const db = await lancedb.connect(VECTOR_DB_PATH);
  const tableNames = await db.tableNames();

  if (!tableNames.includes('study_docs')) {
    return { answer: "Hệ thống chưa có tài liệu nào để trả lời. Vui lòng tải lên tài liệu học tập trước.", sources: [] };
  }

  const table = await db.openTable('study_docs');
  const qVector = await embedText(question);

  // Search for top 5 relevant chunks
  const results = await table.search(qVector).limit(5).execute();

  const context = results
    .map(r => `[Tài liệu: ${r.source_file} | Môn: ${r.subject}]\n${r.text}`)
    .join('\n\n---\n\n');

  const systemPrompts = {
    qa: 'Trả lời trực tiếp câu hỏi dựa trên context, trích nguồn [Tài liệu: ...].',
    summary: 'Tóm tắt nội dung chính trong context một cách logic và dễ hiểu, không thêm ý ngoài.',
    quiz: 'Tạo 5 câu hỏi trắc nghiệm ôn tập kèm đáp án dựa trên context, đa dạng độ khó.',
  };

  const modelName = await getModelForUser(userId);

  const response = await ollama.chat({
    model: modelName,
    messages: [
      {
        role: 'system',
        content: `Bạn là trợ lý AI học tập. Dựa vào những thông tin được cung cấp trong CONTEXT dưới đây, hãy trả lời câu hỏi của người dùng. Nếu CONTEXT không có đủ thông tin, hãy nói "Tôi không tìm thấy thông tin này trong tài liệu hiện tại." Tuyệt đối không bịa đặt thông tin.\n\nYêu cầu: ${systemPrompts[mode] || systemPrompts.qa}`,
      },
      {
        role: 'user',
        content: `CONTEXT:\n${context}\n\nCÂU HỎI:\n${question}`,
      },
    ],
  });

  // Filter unique sources
  const uniqueSources = [...new Set(results.map(r => r.source_file))];

  return {
    answer: response.message.content,
    sources: uniqueSources,
    modelUsed: modelName
  };
};

module.exports = {
  embedText,
  extractText,
  ingestFile,
  askQuestion
};
