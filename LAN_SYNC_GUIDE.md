# Ghi chú đồng bộ dữ liệu nhiều máy

Để dữ liệu user và document đồng bộ, chỉ chạy 1 backend chính và 1 database chính.
Các máy khác chỉ mở frontend bằng địa chỉ IP của máy chính, ví dụ:

- Backend máy chính: `http://<IP_MAY_CHINH>:3636/api`
- Frontend máy chính: `http://<IP_MAY_CHINH>:5173`

Không chạy backend/database riêng trên từng máy, vì `DATABASE_URL=localhost` trên mỗi máy sẽ trỏ về database riêng của máy đó.

Frontend đã được sửa để nếu `.env` để trống `VITE_API_URL=`, khi người dùng mở frontend bằng IP máy chính thì API tự gọi về cùng IP đó ở port 3636.
