# Admin panel fix v6

- Sửa FE AdminPage không còn gọi `GET /api/documents?limit=100` vì backend chỉ cho phép `limit <= 50`.
- Sửa cách load dữ liệu admin: API tài liệu hoặc chat lỗi thì danh sách người dùng vẫn hiển thị bình thường.
- Sửa script Prisma trong package.json dùng `npx prisma ...` để tránh lỗi Windows: `'prisma' is not recognized`.
