const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Đọc nội dung văn bản thuần từ file vật lý
 * Hỗ trợ các định dạng: .txt, .pdf, .docx
 * 
 * @param {string} filePath Đường dẫn tuyệt đối tới file vật lý
 * @returns {Promise<string>} Nội dung text đã trích xuất
 */
const parseDocumentText = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File không tồn tại trên hệ thống!');
  }

  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.txt') {
      return fs.promises.readFile(filePath, 'utf-8');
    }

    if (ext === '.pdf') {
      const dataBuffer = await fs.promises.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    throw new Error('Định dạng file không được hỗ trợ để đọc nội dung (chỉ hỗ trợ txt, pdf, docx).');
  } catch (error) {
    console.error(`Lỗi trích xuất text từ file ${filePath}:`, error);
    throw new Error('Không thể đọc nội dung file.');
  }
};

module.exports = {
  parseDocumentText,
};
