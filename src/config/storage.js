const path = require('path');

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // Mặc định 10MB

// Đường dẫn tuyệt đối của thư mục upload
const UPLOAD_PATH = path.join(__dirname, '../../', UPLOAD_DIR);

/**
 * Factory function lấy Service Storage dựa vào cấu hình STORAGE_TYPE
 */
const getStorageService = () => {
  // Tránh vòng lặp phụ thuộc (circular dependency) bằng cách require động tại runtime
  const { LocalStorageService } = require('../services/storageService');
  
  switch (STORAGE_TYPE.toLowerCase()) {
    case 'local':
    default:
      return new LocalStorageService(UPLOAD_PATH);
  }
};

module.exports = {
  STORAGE_TYPE,
  UPLOAD_DIR,
  UPLOAD_PATH,
  MAX_FILE_SIZE,
  getStorageService,
};
