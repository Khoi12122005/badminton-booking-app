CREATE DATABASE IF NOT EXISTS badminton
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE badminton;

CREATE TABLE IF NOT EXISTS courts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_per_hour INT NOT NULL,
  UNIQUE KEY uq_court_name (name),
  CHECK (price_per_hour > 0)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  court_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price INT NOT NULL,
  status ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_court
    FOREIGN KEY (court_id) REFERENCES courts(id),
  INDEX idx_booking_lookup (court_id, booking_date, start_time, end_time),
  CHECK (total_price > 0)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount INT NOT NULL,
  qr_data MEDIUMTEXT NOT NULL,
  status ENUM('PENDING', 'SUCCESS') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
  INDEX idx_payment_booking (booking_id),
  CHECK (amount > 0)
);

INSERT INTO courts (name, price_per_hour)
VALUES
  ('San 1 - Trung tam', 120000),
  ('San 2 - VIP', 150000),
  ('San 3 - Tieu chuan', 100000),
  ('San 4 - Tap luyen', 90000)
ON DUPLICATE KEY UPDATE
  price_per_hour = VALUES(price_per_hour);
