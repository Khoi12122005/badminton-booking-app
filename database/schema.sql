CREATE DATABASE IF NOT EXISTS badminton
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE badminton;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_per_hour INT NOT NULL,
  UNIQUE KEY uq_court_name (name),
  CHECK (price_per_hour > 0)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  court_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price INT NOT NULL,
  status ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_court
    FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
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
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_payment_booking (booking_id),
  CHECK (amount > 0)
);

INSERT INTO users (username, password_hash, password_salt, full_name, phone, role)
VALUES (
  'admin',
  '83e68cbdf9a8ca1f985dfe59a403fbace8aad9d343f5768a6267e06a29e9d85a67a4bc482bab64142a8c660b128c74053a6c718450e02315328bf6919bdd0ca1',
  '5a47b5ef5b18398bb8cfb81d9c91e899',
  'System Admin',
  '0999999999',
  'ADMIN'
) ON DUPLICATE KEY UPDATE role = 'ADMIN';

INSERT INTO courts (name, price_per_hour)
VALUES
  ('San 1 - Trung tam', 120000),
  ('San 2 - VIP', 150000),
  ('San 3 - Tieu chuan', 100000),
  ('San 4 - Tap luyen', 90000)
ON DUPLICATE KEY UPDATE
  price_per_hour = VALUES(price_per_hour);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sender_role ENUM('USER', 'ADMIN') NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_user (user_id, created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

