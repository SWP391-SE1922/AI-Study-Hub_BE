# AI Management System - Backend

Dự án này là hệ thống Backend được xây dựng bằng **Node.js**, **ExpressJS**, **Prisma ORM** và sử dụng cơ sở dữ liệu **SQL Server**. Dự án đã được cấu hình tự động hóa toàn bộ quá trình khởi tạo cơ sở dữ liệu, chạy migration và tạo dữ liệu mẫu (seed data).

## 🚀 Quy trình Thiết lập & Khởi chạy dự án

Khi clone dự án này về máy lần đầu, bạn chỉ cần thực hiện theo các bước sau:

### Bước 1: Clone dự án và truy cập thư mục backend
```bash
git clone <URL_REPOS_GIT>
cd backend
```

### Bước 2: Cài đặt các thư viện phụ thuộc (Dependencies)
```bash
npm install
```

### Bước 3: Tạo và cấu hình file môi trường `.env`
Sao chép cấu hình từ file mẫu `.env.example` thành file `.env`:
* **Windows (Command Prompt):**
  ```cmd
  copy .env.example .env
  ```
* **PowerShell hoặc Git Bash / macOS / Linux:**
  ```bash
  cp .env.example .env
  ```
Sau đó, hãy mở file `.env` vừa tạo và chỉnh sửa lại phần thông tin đăng nhập SQL Server (password và port) của bạn:
```env
DATABASE_URL="sqlserver://localhost:<CỔNG_SQL_SERVER>;database=ai_management_system;user=sa;password=<MẬT_KHẨU_SA>;encrypt=true;trustServerCertificate=true"
```

### Bước 4: Chạy lệnh thiết lập tự động (Setup)
Chạy lệnh duy nhất sau để tự động thiết lập toàn bộ database:
```bash
npm run setup
```
Lệnh này sẽ tự động:
1. Tạo database `ai_management_system` trên SQL Server của bạn.
2. Tạo Client thư viện Prisma (`prisma generate`).
3. Chạy các migrations để tạo bảng dữ liệu (`prisma migrate dev`).
4. Chèn dữ liệu mẫu vào cơ sở dữ liệu (`prisma db seed`).

### Bước 5: Khởi chạy dự án ở chế độ Development
```bash
npm run dev
```
Dự án sẽ khởi động ở địa chỉ `http://localhost:5000` (hoặc cổng cấu hình trong file `.env`).

---

## 📁 Cấu trúc thư mục dự án
```text
backend/
├── prisma/
│   ├── migrations/      # Chứa các file lịch sử migration cơ sở dữ liệu (phải commit lên git)
│   ├── schema.prisma    # File cấu hình database engine và định nghĩa model (User)
│   └── seed.js          # File chèn dữ liệu mẫu ban đầu (Admin và Student)
├── src/
│   ├── config/
│   │   └── db.js        # Khởi tạo và export Prisma Client
│   ├── controller/      # Nơi xử lý logic nghiệp vụ các request (như login, profile...)
│   ├── middleware/      # Nơi kiểm tra xác thực JWT và phân quyền Admin
│   ├── routes/          # Định nghĩa các endpoint API (ví dụ: /api/auth)
│   ├── services/        # Các dịch vụ xử lý logic độc lập (nếu có)
│   ├── app.js           # Cấu hình Express và Middleware toàn cục
│   └── server.js        # Entrypoint khởi chạy server lắng nghe kết nối
├── .env                 # File cấu hình môi trường chứa thông tin kết nối nhạy cảm (không commit lên git)
├── .env.example         # File mẫu cấu hình môi trường (cần commit lên git)
├── package.json         # Khai báo các lệnh script và thư viện phụ thuộc
└── test-db.js           # Script kiểm tra kết nối nhanh tới DB
```

---

## 👥 Tài khoản Dữ liệu Mẫu (Seed Data)
Sau khi chạy lệnh `npm run setup`, các tài khoản mẫu sau sẽ được tự động mã hóa mật khẩu bằng `bcrypt` và thêm vào cơ sở dữ liệu:

1. **Tài khoản Admin:**
   * **Email:** `admin@gmail.com`
   * **Mật khẩu:** `123456`
   * **Role:** `admin`

2. **Tài khoản Học sinh (Student):**
   * **Email:** `student@gmail.com`
   * **Mật khẩu:** `123456`
   * **Role:** `student`
