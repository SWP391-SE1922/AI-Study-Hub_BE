# Sửa database AI Study Hub

Không dùng file SQL cũ `AIStudyHub.sql` cho bản code này vì schema cũ có bảng/cột khác Prisma hiện tại.
Bản này dùng Prisma để tự tạo đúng bảng: `users`, `documents`, `categories`, `subjects`, `chat_sessions`, `chat_messages`, ...

## Chạy nhanh

```bash
cd AI-Study-Hub_BE
npm install
npm run db:fix
npm run dev
```

`npm run db:fix` sẽ chạy:

```bash
prisma generate
prisma db push
node prisma/create-admin.js
```

## Tài khoản admin mặc định

```txt
Email: admin@gmail.com
Password: 123456
```

Có thể đổi trong `.env`:

```env
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=123456
ADMIN_FULL_NAME=Admin System
AUTO_CREATE_ADMIN=true
```

## Đồng bộ nhiều máy

Không dùng `localhost` trên từng máy nếu muốn dùng chung dữ liệu. Chỉ để 1 máy chạy SQL Server + Backend, các máy khác gọi API về máy đó.

Ví dụ máy chính có IP `192.168.1.10`:

```env
# BE trên máy chính
DATABASE_URL="sqlserver://localhost:1433;database=ai_management_system;user=sa;password=12345;encrypt=true;trustServerCertificate=true"

# FE trên các máy khác
VITE_API_URL=http://192.168.1.10:3636/api
```
