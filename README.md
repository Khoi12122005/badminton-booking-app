# Badminton Booking + VietQR

Web app local hoàn chỉnh cho bài toán đặt sân cầu lông và thanh toán QR ngân hàng bằng VietQR API thật.

## 1. Cấu trúc project

```text
D:\badminton-booking-qr
├── backend
├── frontend
└── database
```

## 2. Tech stack

- Backend: Node.js + Express
- Database: MySQL + `mysql2`
- Frontend: HTML, CSS, JavaScript thuần
- Thanh toán QR: VietQR `POST https://api.vietqr.io/v2/generate`

## 3. Chuẩn bị MySQL

1. Tạo database và bảng bằng file:

```sql
SOURCE D:/badminton-booking-qr/database/schema.sql;
```

2. File SQL đã có sẵn 4 sân mẫu trong bảng `courts` để app mở lên là dùng được ngay.

## 4. Cấu hình backend

Mở file `D:\badminton-booking-qr\backend\.env` và cập nhật:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=badminton

VIETQR_CLIENT_ID=your_client_id
VIETQR_API_KEY=your_api_key
BANK_ACCOUNT_NO=your_account_number
BANK_ACCOUNT_NAME=YOUR_ACCOUNT_NAME
BANK_ACQ_ID=970422
```

Lưu ý:

- `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`, `BANK_ACQ_ID` là tài khoản nhận tiền thật để VietQR tạo mã QR.
- `BANK_ACQ_ID=970422` tương ứng MB Bank. Nếu dùng ngân hàng khác, thay bằng BIN đúng của ngân hàng đó.
- Bản local mình vừa khởi tạo đang dùng tài khoản `root` với mật khẩu rỗng, nên `DB_PASS=` là đúng cho máy này.

## 5. Chạy project local

### Backend

```bash
cd D:\badminton-booking-qr\backend
npm install
node server.js
```

Backend chạy tại: `http://localhost:5000`

### Bat MySQL local neu may chua co Windows service

Trong PowerShell:

```powershell
PowerShell -ExecutionPolicy Bypass -File D:\badminton-booking-qr\database\start-mysql.ps1
```

Dung MySQL:

```powershell
PowerShell -ExecutionPolicy Bypass -File D:\badminton-booking-qr\database\stop-mysql.ps1
```

### Frontend

Mở thư mục `D:\badminton-booking-qr\frontend` bằng Live Server.

Ví dụ:

- Trang chính: `http://127.0.0.1:5500/frontend/index.html`
- Trang admin riêng: `http://127.0.0.1:5500/frontend/admin.html`

## 6. API endpoints

### GET `/api/courts`

Response mẫu:

```json
[
  {
    "id": 1,
    "name": "San 1 - Trung tam",
    "price_per_hour": 120000
  }
]
```

### POST `/api/book`

Request:

```json
{
  "court_id": 1,
  "customer_name": "Nguyen Van A",
  "phone": "0901234567",
  "booking_date": "2026-04-20",
  "start_time": "18:00",
  "end_time": "20:00"
}
```

Response:

```json
{
  "message": "Đặt sân thành công.",
  "booking": {
    "id": 5,
    "court_id": 1,
    "court_name": "San 1 - Trung tam",
    "customer_name": "Nguyen Van A",
    "phone": "0901234567",
    "booking_date": "2026-04-20",
    "start_time": "18:00:00",
    "end_time": "20:00:00",
    "duration_hours": 2,
    "total_price": 240000,
    "status": "PENDING"
  }
}
```

### POST `/api/create-qr`

Request:

```json
{
  "bookingId": 5
}
```

Response:

```json
{
  "paymentId": 3,
  "qrDataURL": "data:image/png;base64,...",
  "amount": 240000,
  "addInfo": "Thanh toan san #5",
  "status": "PENDING",
  "reused": false
}
```

### GET `/api/bookings`

Response:

```json
[
  {
    "id": 5,
    "court_id": 1,
    "court_name": "San 1 - Trung tam",
    "customer_name": "Nguyen Van A",
    "phone": "0901234567",
    "booking_date": "2026-04-20",
    "start_time": "18:00:00",
    "end_time": "20:00:00",
    "total_price": 240000,
    "status": "PENDING",
    "payment_status": "PENDING",
    "payment_id": 3
  }
]
```

### POST `/api/confirm-payment`

Request:

```json
{
  "bookingId": 5
}
```

Response:

```json
{
  "message": "Đã xác nhận thanh toán thành công.",
  "bookingId": 5,
  "status": "PAID"
}
```

## 7. Business logic đã xử lý

- Không cho đặt trùng giờ cùng một sân trong cùng một ngày.
- Chỉ nhận khung giờ tròn theo từng tiếng để tính `total_price` chính xác.
- `amount > 0`.
- Format tiền VND ở frontend.
- `addInfo` unique theo booking: `Thanh toan san #ID`.
- API VietQR lỗi `401` sẽ trả message rõ ràng.
- Lỗi database và lỗi validate đều trả JSON dễ debug.

## 8. Ghi chú production

- Luồng hiện tại dùng VietQR thật để sinh mã QR thanh toán.
- Việc tự động kiểm tra khách đã chuyển khoản chưa chưa được bật, vì muốn auto-confirm cần tích hợp thêm dịch vụ đối soát giao dịch như payOS/Open Banking webhook.
- Bản hiện tại dùng admin xác nhận thủ công, phù hợp để demo local, bài tập lớn hoặc portfolio.

## 9. Tài liệu VietQR đã bám theo

- Official docs: https://vietqr.io/en/generate/
- Official overview: https://www.vietqr.io/en/
