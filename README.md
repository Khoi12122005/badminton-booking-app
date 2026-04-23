# CourtFlow

Modern local web app for badminton court booking with real VietQR payment generation.

Built to feel like a small SaaS product, but simple enough for students to understand, extend, and present in a portfolio.

## Highlights

- Book badminton courts by date and time slot
- Automatically calculate total price by court hourly rate
- Prevent overlapping bookings on the same court
- Generate real bank transfer QR codes via VietQR API
- Separate user booking page and admin management page
- Confirm payment manually from the admin dashboard
- Responsive premium UI using only HTML, CSS, and vanilla JavaScript

## Tech Stack

- Backend: Node.js, Express, mysql2, axios, dotenv
- Frontend: HTML, CSS, vanilla JavaScript
- Database: MySQL
- Payment QR: VietQR API

## Project Structure

```text
D:\badminton-booking-qr
├── backend
├── frontend
└── database
```

## Features

### User Flow

1. View available courts and hourly prices
2. Fill in booking information
3. Submit a booking
4. See booking summary and total amount
5. Click `Thanh toan QR`
6. Receive a real `qrDataURL` from VietQR
7. Transfer money with the exact amount and booking note

### Admin Flow

1. Open the admin page
2. Review all bookings
3. Check payment status: `PENDING` or `PAID`
4. Confirm payment manually after receiving transfer

## Database Schema

Main tables:

- `courts`
- `bookings`
- `payments`

Seed data:

- 4 sample courts are inserted automatically from `database/schema.sql`

## API Endpoints

### `GET /api/health`

Health check for backend.

### `GET /api/courts`

Return all courts.

### `POST /api/book`

Create a new booking.

Request:

```json
{
  "court_id": 1,
  "customer_name": "Nguyen Van A",
  "phone": "0901234567",
  "booking_date": "2026-04-23",
  "start_time": "18:00",
  "end_time": "20:00"
}
```

Response:

```json
{
  "message": "Dat san thanh cong.",
  "booking": {
    "id": 10,
    "court_id": 1,
    "court_name": "San 1 - Trung tam",
    "customer_name": "Nguyen Van A",
    "phone": "0901234567",
    "booking_date": "2026-04-23",
    "start_time": "18:00:00",
    "end_time": "20:00:00",
    "duration_hours": 2,
    "total_price": 240000,
    "status": "PENDING"
  }
}
```

### `POST /api/create-qr`

Generate a real VietQR image using `qrDataURL`.

Request:

```json
{
  "bookingId": 10
}
```

Response:

```json
{
  "paymentId": 5,
  "qrDataURL": "data:image/png;base64,...",
  "amount": 240000,
  "addInfo": "Thanh toan san #10",
  "status": "PENDING",
  "reused": false
}
```

### `GET /api/bookings`

Return booking list for admin.

### `POST /api/confirm-payment`

Mark a booking as paid.

Request:

```json
{
  "bookingId": 10
}
```

Response:

```json
{
  "message": "Da xac nhan thanh toan thanh cong.",
  "bookingId": 10,
  "status": "PAID"
}
```

## Business Rules

- No overlapping bookings for the same court
- `amount > 0`
- Total price = duration hours x court hourly rate
- Only full-hour slots are accepted
- Transfer description is unique by booking:
  - `Thanh toan san #ID`
- QR must come from VietQR `qrDataURL`
- 401 errors from VietQR are returned clearly
- Validation and database errors return JSON messages for debugging

## Local Setup

### 1. Start MySQL

If your MySQL is not running as a Windows service:

```powershell
PowerShell -ExecutionPolicy Bypass -File D:\badminton-booking-qr\database\start-mysql.ps1
```

Stop it when needed:

```powershell
PowerShell -ExecutionPolicy Bypass -File D:\badminton-booking-qr\database\stop-mysql.ps1
```

### 2. Create Database and Tables

Open MySQL and run:

```sql
SOURCE D:/badminton-booking-qr/database/schema.sql;
```

### 3. Configure Environment Variables

Copy the example file:

```powershell
Copy-Item D:\badminton-booking-qr\backend\.env.example D:\badminton-booking-qr\backend\.env
```

Then update `backend/.env` with your real values:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=badminton

VIETQR_CLIENT_ID=your_vietqr_client_id
VIETQR_API_KEY=your_vietqr_api_key
BANK_ACCOUNT_NO=your_bank_account_number
BANK_ACCOUNT_NAME=YOUR_BANK_ACCOUNT_NAME
BANK_ACQ_ID=970423
AUTH_TOKEN_SECRET=replace_with_a_long_random_secret
```

## Run the App

### Backend

```powershell
cd D:\badminton-booking-qr\backend
npm install
node server.js
```

Backend URL:

```text
http://localhost:5000
```

### Frontend

Open the `frontend` folder with Live Server.

Example:

```text
http://127.0.0.1:5500/frontend/index.html
http://127.0.0.1:5500/frontend/admin.html
```

## UI Notes

- Premium SaaS-inspired design
- Glassmorphism topbar
- Responsive cards and dashboard layout
- Hover lift effects and smooth transitions
- Clean form styling and QR payment section
- Admin table with clear status badges

## Production Notes

- This project uses the real VietQR API, not mock QR images
- Current payment confirmation is manual
- Automatic payment reconciliation would require an additional banking webhook or transaction-checking service
- Suitable for local demos, graduation projects, and frontend/backend portfolios

## Security Notes

- Do not commit your real `.env`
- Keep VietQR credentials private
- Use `.env.example` for sharing setup with other developers

## VietQR References

- [VietQR Generate](https://vietqr.io/en/generate/)
- [VietQR Overview](https://www.vietqr.io/en/)
- [VietQR Bank List](https://www.vietqr.io/en/danh-sach-api/api-danh-sach-ma-ngan-hang/)
