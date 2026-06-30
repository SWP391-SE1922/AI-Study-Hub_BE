# Cấu hình gửi email quên mật khẩu

Frontend hiện đã gọi API thật:

```txt
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

Backend sẽ gửi link về trang:

```txt
http://localhost:5173/reset-password?token=...
```

## .env cần có

```env
SEND_EMAIL=true
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM="AI Study Hub" <your_gmail@gmail.com>
```

Với Gmail, `SMTP_PASS` phải là App Password, không phải mật khẩu Gmail đăng nhập bình thường.

Nếu SMTP sai hoặc `SEND_EMAIL=false`, hệ thống không crash. Backend sẽ in link reset trong terminal để test local.
