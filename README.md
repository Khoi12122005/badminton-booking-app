<div align="center">

<h1>🏸 Sân Cầu Lông Thiên Minh</h1>
<p><strong>Hệ thống đặt sân trực tuyến — Thanh toán QR — Chat hỗ trợ thời gian thực</strong></p>

<p>
  <img src="https://img.shields.io/badge/Node.js-Express-brightgreen?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MySQL-8.4-blue?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-orange" alt="Frontend" />
  <img src="https://img.shields.io/badge/Payment-VietQR-purple" alt="VietQR" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="License" />
</p>

</div>

---

## 📖 Giới thiệu

**Sân Cầu Lông Thiên Minh** là hệ thống đặt sân cầu lông trực tuyến đầy đủ tính năng, được xây dựng từ đầu với giao diện premium và luồng nghiệp vụ thực tế:

- Người dùng chọn sân, đặt giờ, thanh toán qua **VietQR ngân hàng thật**
- Admin quản lý booking, xác nhận thanh toán và trả lời hỗ trợ từ khách hàng
- **Chat trực tiếp User ↔ Admin** không cần API bên ngoài

> Phù hợp cho demo thực tế, đồ án tốt nghiệp, hoặc portfolio cá nhân mang cảm giác production.

---

## ✨ Tính năng nổi bật

### 👤 Người dùng
| Tính năng | Mô tả |
|---|---|
| 🔐 Xác thực | Đăng ký / Đăng nhập với JWT token |
| 🏸 Đặt sân | Chọn sân, ngày, giờ — tính tiền tự động |
| 🚫 Chống trùng lịch | Không cho phép đặt trùng khung giờ |
| 💳 Thanh toán QR | Tạo mã VietQR thật từ API ngân hàng |
| 📋 Lịch sử | Xem và hủy booking cá nhân |
| 💬 Chat hỗ trợ | Nhắn tin trực tiếp với quản trị viên |

### 🛡️ Quản trị viên
| Tính năng | Mô tả |
|---|---|
| 📊 Dashboard | Tổng quan toàn bộ booking theo thời gian thực |
| ✅ Xác nhận thanh toán | Duyệt PENDING → PAID bằng 1 click |
| ❌ Hủy booking | Xử lý yêu cầu hủy từ khách |
| 🏟️ Quản lý sân | Thêm, sửa, xóa sân và cập nhật giá |
| 📥 Hộp thư hỗ trợ | Nhận và phản hồi tin nhắn từ user |

---

## 🛠️ Tech Stack

```
Backend      Node.js + Express 5 — REST API
Database     MySQL 8.4 với mysql2/promise (connection pool)
Auth         JWT tự implement (không dùng thư viện)
Frontend     HTML5 + Vanilla CSS + Vanilla JS (không framework)
Payment      VietQR API v2 (qrDataURL thật)
Chat         HTTP Polling mỗi 4–5 giây (không cần WebSocket)
```

---

## 📁 Cấu trúc dự án

```
badminton-booking-qr/
├── backend/
│   ├── server.js          # Express app + tất cả API endpoints
│   ├── .env               # Biến môi trường (không commit)
│   └── .env.example       # Template cấu hình
│
├── frontend/
│   ├── index.html         # Trang người dùng
│   ├── admin.html         # Trang quản trị
│   ├── login.html         # Đăng nhập người dùng
│   ├── admin-login.html   # Đăng nhập admin
│   ├── register.html      # Đăng ký tài khoản
│   ├── app.js             # Toàn bộ logic frontend
│   └── style.css          # Design system + components
│
└── database/
    ├── schema.sql          # Tạo bảng + dữ liệu mẫu
    └── start-mysql.ps1     # Script khởi động MySQL (Windows)
```

---

## 🗄️ Database Schema

```sql
users        -- Tài khoản người dùng và admin (JWT auth)
courts       -- Danh sách sân và giá thuê
bookings     -- Lịch đặt sân (PENDING / PAID / CANCELLED)
payments     -- Lịch sử thanh toán và mã QR
messages     -- Chat user ↔ admin
```

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu

- **Node.js** >= 18
- **MySQL** >= 8.0
- **VietQR API Key** — đăng ký miễn phí tại [vietqr.io](https://www.vietqr.io)

---

### Bước 1 — Clone & cài đặt

```bash
git clone https://github.com/Khoi12122005/badminton-booking-app.git
cd badminton-booking-app
cd backend && npm install
```

---

### Bước 2 — Cấu hình môi trường

```bash
cp backend/.env.example backend/.env
```

Mở `backend/.env` và điền thông tin thực tế:

```env
PORT=5000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=badminton

# VietQR (đăng ký tại vietqr.io)
VIETQR_CLIENT_ID=your_client_id
VIETQR_API_KEY=your_api_key
BANK_ACCOUNT_NO=your_account_number
BANK_ACCOUNT_NAME=YOUR_NAME
BANK_ACQ_ID=970423

# JWT Secret (đặt chuỗi ngẫu nhiên dài)
AUTH_TOKEN_SECRET=replace_with_a_strong_random_secret
```

---

### Bước 3 — Tạo Database

Khởi động MySQL, sau đó chạy:

```bash
# Windows (MySQL Server 8.4)
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS badminton;"
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root badminton -e "source database/schema.sql"
```

Hoặc mở MySQL Workbench / phpMyAdmin và chạy file `database/schema.sql`.

> Dữ liệu mẫu (4 sân + tài khoản admin mặc định) được tạo tự động.

---

### Bước 4 — Chạy Backend

```bash
cd backend
npm start
# → Server running at http://localhost:5000
```

---

### Bước 5 — Mở Frontend

Mở bằng **Live Server** (VS Code Extension) hoặc trực tiếp trong trình duyệt:

| Trang | Đường dẫn |
|---|---|
| Người dùng | `frontend/index.html` |
| Quản trị | `frontend/admin.html` |
| Đăng nhập | `frontend/login.html` |
| Đăng ký | `frontend/register.html` |

---

## 🔑 Tài khoản mặc định

| Vai trò | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |

> Tạo tài khoản người dùng mới qua trang `/frontend/register.html`

---

## 📡 API Reference

### Auth

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Đăng nhập — trả về JWT |
| `GET` | `/api/auth/me` | Thông tin người dùng hiện tại |

### Courts

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/courts` | Danh sách sân |
| `POST` | `/api/courts` | Tạo sân mới (Admin) |
| `PUT` | `/api/courts/:id` | Cập nhật sân (Admin) |
| `DELETE` | `/api/courts/:id` | Xóa sân (Admin) |

### Bookings

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/book` | Đặt sân mới |
| `GET` | `/api/my-bookings` | Booking của tôi |
| `POST` | `/api/bookings/:id/cancel` | Hủy booking |
| `GET` | `/api/bookings` | Tất cả booking (Admin) |
| `POST` | `/api/confirm-payment` | Xác nhận thanh toán (Admin) |

### Payment

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/create-qr` | Tạo mã QR VietQR thật |

### Chat User ↔ Admin

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/chat/send` | Gửi tin nhắn (User) |
| `GET` | `/api/chat/messages` | Lịch sử chat (User) |
| `GET` | `/api/admin/conversations` | Danh sách hội thoại (Admin) |
| `GET` | `/api/admin/messages/:userId` | Chat với user (Admin) |
| `POST` | `/api/admin/messages/:userId` | Trả lời user (Admin) |

---

## 📐 Luồng nghiệp vụ

```
[User đăng ký / đăng nhập]
       ↓
[Chọn sân + khung giờ]
       ↓
[Hệ thống kiểm tra trùng lịch]
       ↓
[Tạo booking → PENDING]
       ↓
[Tạo mã QR từ VietQR API]
       ↓
[User chuyển khoản]
       ↓
[Admin duyệt → PAID]
```

---

## 🔒 Bảo mật

- **JWT tự implement** — không dùng thư viện auth
- **Password hashing** với SHA-512 + random salt
- **Role-based authorization** — USER / ADMIN tách biệt
- **SQL injection protection** — sử dụng parameterized queries
- **Không commit `.env`** — sử dụng `.env.example` để chia sẻ

---

## 📝 Ghi chú

- Xác nhận thanh toán hiện tại là **thủ công** (admin duyệt sau khi nhận chuyển khoản)
- Để tự động hóa, cần tích hợp **banking webhook** hoặc dịch vụ đối soát giao dịch

---

## 🔗 Tài liệu tham khảo

- [VietQR API Docs](https://vietqr.io/en/generate/)
- [VietQR Bank List](https://www.vietqr.io/en/danh-sach-api/api-danh-sach-ma-ngan-hang/)
- [Express.js](https://expressjs.com/)
- [mysql2](https://github.com/sidorares/node-mysql2)

