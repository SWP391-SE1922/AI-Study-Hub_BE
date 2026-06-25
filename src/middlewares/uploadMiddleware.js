const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { UPLOAD_PATH, MAX_FILE_SIZE } = require('../config/storage');
const { normalizeUploadedFileName } = require('../utils/fileName');

// 1. Cấu hình nơi lưu và tên file lưu trữ trên disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    // Chuẩn hóa tên file tiếng Việt trước khi lấy đuôi và lưu vào DB.
    file.originalname = normalizeUploadedFileName(file.originalname);

    // Tên file trên disk là uuid + đuôi mở rộng gốc
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// 2. Danh sách MIME types được phép tải lên
const allowedMimeTypes = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
];

// 3. Bộ lọc file (File Filter)
const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isDocument = allowedMimeTypes.includes(file.mimetype);

  if (isImage || isDocument) {
    cb(null, true);
  } else {
    const error = new Error('Loại file không được hỗ trợ');
    error.name = 'MulterCustomError';
    cb(error, false);
  }
};

// 4. Khởi tạo instance upload của Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = upload;
