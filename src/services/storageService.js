const fs = require('fs');
const path = require('path');

/**
 * Giao diện (Interface) trừu tượng của Storage Service
 * (Mô tả các phương thức cần có, giúp dễ dàng mở rộng sang S3, Cloudinary...)
 */
class IStorageService {
  upload(file) { throw new Error('Phương thức upload chưa được định nghĩa'); }
  delete(fileUrl) { throw new Error('Phương thức delete chưa được định nghĩa'); }
  getDownloadUrl(fileUrl) { throw new Error('Phương thức getDownloadUrl chưa được định nghĩa'); }
  getPreviewUrl(fileUrl) { throw new Error('Phương thức getPreviewUrl chưa được định nghĩa'); }
}

/**
 * Local Disk Storage Implementation
 */
class LocalStorageService extends IStorageService {
  /**
   * @param {string} uploadPath - Đường dẫn tuyệt đối tới thư mục uploads
   */
  constructor(uploadPath) {
    super();
    this.uploadPath = uploadPath;
  }


  /**
   * Lưu thông tin file đã upload (Multer đã lưu file trên disk trước đó)
   * @param {object} file - Express Multer file object
   * @returns {object} { fileUrl, fileName, fileSize, mimeType }
   */
  async upload(file) {
    if (!file) {
      throw new Error('Không tìm thấy tệp tin tải lên');
    }

    // file.filename là tên duy nhất (uuid) được đặt bởi multer.
    // Lưu fileUrl dạng tương đối để dễ quản lý: /uploads/{uuid.ext}
    const fileUrl = `/uploads/${file.filename}`;

    return {
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Xóa file khỏi ổ đĩa
   * @param {string} fileUrl - Đường dẫn tương đối lưu trong DB (ví dụ: /uploads/abc.pdf)
   */
  async delete(fileUrl) {
    if (!fileUrl) return;

    // Trích xuất tên tệp từ fileUrl
    const filename = path.basename(fileUrl);
    const absolutePath = path.join(this.uploadPath, filename);

    // Tiến hành xóa file nếu tồn tại
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`🗑️ Đã xóa file trên disk: ${absolutePath}`);
    }
  }

  /**
   * Lấy đường dẫn tuyệt đối phục vụ tải file về (res.download)
   * @param {string} fileUrl - Đường dẫn tương đối lưu trong DB
   */
  getDownloadUrl(fileUrl) {
    const filename = path.basename(fileUrl);
    return path.join(this.uploadPath, filename);
  }

  /**
   * Lấy URL để xem trước file tĩnh (static file)
   * @param {string} fileUrl - Đường dẫn tương đối lưu trong DB
   */
  getPreviewUrl(fileUrl) {
    return fileUrl; // Vì express.static đã mount /uploads vào root, nên đường dẫn tương đối chính là preview URL
  }
}



class CloudinaryStorageService extends IStorageService {
  constructor() {
    super();

    const { v2: cloudinary } = require('cloudinary');

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    this.cloudinary = cloudinary;
    this.folder = process.env.CLOUDINARY_FOLDER || 'ai-study-hub';
  }

  async upload(file) {
    if (!file) {
      throw new Error('Không tìm thấy tệp tin tải lên');
    }

    const result = await this.cloudinary.uploader.upload(file.path, {
      folder: this.folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
    });

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      fileUrl: result.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(fileUrl) {
    return true;
  }

  getDownloadUrl(fileUrl) {
    return fileUrl;
  }

  getPreviewUrl(fileUrl) {
    return fileUrl;
  }
}



module.exports = {
  IStorageService,
  LocalStorageService,
  CloudinaryStorageService,
};
