# Đã bỏ OpenAI khỏi backend

Các phần đã được bỏ:

- Dependency `openai` trong `package.json` và `package-lock.json`
- `src/services/aiService.js`
- `src/controllers/aiController.js`
- `src/routes/aiRoutes.js`
- Mount route `/api/ai` trong `src/app.js` và `src/routes/index.js`

Backend không còn cần `OPENAI_API_KEY` để chạy.

Cách chạy backend local:

```bash
npm install
npx prisma generate
npm run dev
```

Frontend không kết nối database trực tiếp. Frontend gọi API tại `http://localhost:3636/api`; backend kết nối SQL Server bằng `DATABASE_URL` trong file `.env`.
