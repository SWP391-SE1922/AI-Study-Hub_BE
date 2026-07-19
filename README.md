# AI Study Hub - Backend Service

Dự án này là hệ thống Backend cho nền tảng **AI Study Hub**, được xây dựng bằng **Node.js**, **ExpressJS**, **Prisma ORM** và sử dụng cơ sở dữ liệu **SQL Server**. Dự án hỗ trợ quản lý tài liệu học tập, tích hợp thanh toán VNPay và cung cấp API tương tác AI.

## 🚀 Quy trình Thiết lập & Khởi chạy dự án (Setup Guide)

Khi tải dự án về máy, hãy thực hiện theo các bước sau để khởi chạy Backend:

### Bước 1: Cài đặt các thư viện phụ thuộc (Dependencies)
Mở terminal tại thư mục `AI-Study-Hub_BE` và chạy lệnh:
```bash
npm install
```

### Bước 2: Tạo và cấu hình file môi trường `.env`
Sao chép cấu hình từ file mẫu `.env.example` thành file `.env`:
* **Windows (Command Prompt):**
  ```cmd
  copy .env.example .env
  ```
* **PowerShell / macOS / Linux:**
  ```bash
  cp .env.example .env
  ```

Sau đó, hãy mở file `.env` vừa tạo và cập nhật lại thông tin cấu hình của bạn:
1. **Cấu hình SQL Server:**
   Chỉnh sửa cổng kết nối (port), user và password cho đúng với máy của bạn.
   ```env
   DATABASE_URL="sqlserver://localhost:<PORT_CỦA_BẠN>;database=ai_management_system;user=sa;password=<MẬT_KHẨU_SA>;encrypt=true;trustServerCertificate=true"
   ```
2. **Cấu hình VNPay (Nếu cần test thanh toán):**
   ```env
   VNP_TMNCODE=your_tmn_code
   VNP_HASHSECRET=your_hash_secret
   ```

### Bước 3: Khởi tạo Database tự động (Setup)
Chạy lệnh sau để hệ thống tự động khởi tạo database:
```bash
npm run setup
```
Lệnh này (`npm run db:fix`) sẽ tự động:
1. Tạo Prisma Client (`prisma generate`).
2. Đẩy schema vào cơ sở dữ liệu để tạo các bảng (`prisma db push`).
3. Chạy script để tạo sẵn tài khoản Admin mặc định (`node prisma/create-admin.js`).

### Bước 4: Cài đặt và cấu hình Model AI (Ollama)
Hệ thống sử dụng **Ollama** để chạy các model AI cục bộ (Local AI). Để tính năng Chat AI hoạt động phân cấp theo User, bạn cần cài đặt và tải đúng 3 model tương ứng:
1. Tải và cài đặt Ollama tại: [https://ollama.com/download](https://ollama.com/download)
2. Mở Terminal / Command Prompt và chạy 4 lệnh sau để tải các model:
   ```bash
   ollama pull llama3
   ollama pull mistral
   ollama pull qwen2.5
   ollama pull nomic-embed-text
   ```
   *(Ghi chú: Các model LLM được phân cấp theo gói: `llama3` cho gói BASIC/Free, `mistral` cho gói PREMIUM, `qwen2.5` cho gói VIP/UNLIMITED. Và `nomic-embed-text` dùng chung để vector hóa dữ liệu tài liệu).*
3. Đảm bảo Ollama luôn chạy ngầm (icon ở thanh taskbar hoặc chạy lệnh `ollama serve`) trước khi khởi chạy Backend.

### Bước 5: Khởi chạy dự án ở chế độ Development
```bash
npm run dev
```
Dự án sẽ khởi động tại địa chỉ: `http://localhost:3636` (theo cấu hình PORT trong file `.env`).

---

## 📦 Các lệnh Scripts có sẵn (NPM Scripts)

- `npm run dev`: Chạy server chế độ dev với nodemon (tự động reload khi code thay đổi).
- `npm start`: Chạy server chế độ production.
- `npm run setup`: Thiết lập database nhanh chóng (generate, push, create admin).
- `npm run db:generate`: Cập nhật lại Prisma Client dựa trên schema.
- `npm run db:push`: Đẩy các thay đổi schema.prisma lên database mà không cần tạo file migration.
- `npm run studio`: Mở giao diện Prisma Studio để xem và quản lý dữ liệu trực quan trên trình duyệt (thường ở `http://localhost:5555`).

---

## 📁 Cấu trúc thư mục dự án

```text
AI-Study-Hub_BE/
├── prisma/
│   ├── schema.prisma    # File cấu hình cấu trúc Database và ORM Model
│   ├── create-admin.js  # Script tự động khởi tạo tài khoản Admin
│   └── seed.js          # File chèn dữ liệu mẫu bổ sung (nếu có)
├── src/
│   ├── config/          # Các cấu hình hệ thống (DB, VNPay, v.v)
│   ├── controllers/     # Xử lý logic nghiệp vụ cho từng API Endpoint
│   ├── middlewares/     # Chức năng bảo mật, kiểm tra JWT, chặn quyền
│   ├── routes/          # Khai báo đường dẫn API (Routers)
│   ├── services/        # Logic tích hợp (Ollama AI, Email, VNPay, Langchain)
│   └── server.js        # File khởi chạy ứng dụng (Entrypoint)
├── uploads/             # Thư mục chứa các file upload nội bộ (nếu dùng local storage)
├── .env                 # File chứa các cấu hình nhạy cảm (không commit lên git)
├── .env.example         # File mẫu cấu hình môi trường
└── package.json         # Định nghĩa các dependencies và script khởi chạy
```
