const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET;
const AUTH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 12;

if (!AUTH_TOKEN_SECRET || AUTH_TOKEN_SECRET.length < 32) {
  console.error("FATAL: AUTH_TOKEN_SECRET is missing or too short (min 32 chars). Set it in .env.");
  process.exit(1);
}

const requiredDatabaseEnv = ["DB_HOST", "DB_USER", "DB_NAME"];
const missingDatabaseEnv = requiredDatabaseEnv.filter(
  (key) => !process.env[key]
);

if (missingDatabaseEnv.length > 0) {
  console.error(
    `Missing required database environment variables: ${missingDatabaseEnv.join(", ")}`
  );
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "32kb" }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Qua nhieu yeu cau. Vui long thu lai sau." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Qua nhieu lan dang nhap that bai. Vui long thu lai sau 15 phut." },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);

function toInteger(value) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) ? parsedValue : null;
}

function normalizeTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  const parts = trimmedValue.split(":");

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const [hoursText, minutesText, secondsText = "00"] = parts;
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function timeToMinutes(timeValue) {
  const normalizedValue = normalizeTime(timeValue);

  if (!normalizedValue) {
    return null;
  }

  const [hoursText, minutesText] = normalizedValue.split(":");
  return Number(hoursText) * 60 + Number(minutesText);
}

function isSameOrFutureDate(dateValue) {
  if (typeof dateValue !== "string") {
    return false;
  }

  const bookingDate = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return bookingDate >= today;
}

function validatePhone(phone) {
  return /^[0-9]{9,15}$/.test(String(phone || "").trim());
}

function buildPaymentDescription(bookingId) {
  return `Thanh toan san #${bookingId}`;
}

function getBookingDurationHours(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return { isValid: false, message: "Thoi gian khong dung dinh dang HH:MM." };
  }

  if (startMinutes >= endMinutes) {
    return {
      isValid: false,
      message: "Gio ket thuc phai lon hon gio bat dau.",
    };
  }

  if (startMinutes % 60 !== 0 || endMinutes % 60 !== 0) {
    return {
      isValid: false,
      message: "He thong hien chi nhan khung gio tron theo tung tieng.",
    };
  }

  return {
    isValid: true,
    durationHours: (endMinutes - startMinutes) / 60,
    normalizedStartTime: normalizeTime(startTime),
    normalizedEndTime: normalizeTime(endTime),
  };
}

function getMissingPaymentEnv() {
  return [
    "VIETQR_CLIENT_ID",
    "VIETQR_API_KEY",
    "BANK_ACCOUNT_NO",
    "BANK_ACCOUNT_NAME",
    "BANK_ACQ_ID",
  ].filter((key) => !process.env[key]);
}

function formatDatabaseError(error) {
  if (error && error.code === "ECONNREFUSED") {
    return "Khong ket noi duoc MySQL tai localhost:3306. Hay dam bao MySQL Server da duoc cai va dang chay.";
  }

  if (error && error.code === "ENOTFOUND") {
    return "Khong tim thay DB_HOST. Hay kiem tra lai gia tri DB_HOST trong file .env.";
  }

  if (error && error.code === "ER_ACCESS_DENIED_ERROR") {
    return "Khong the ket noi MySQL. Hay kiem tra DB_USER hoac DB_PASS trong file .env.";
  }

  if (error && error.code === "ER_BAD_DB_ERROR") {
    return "Database chua ton tai. Hay tao database badminton truoc khi chay.";
  }

  return error?.message || "Da xay ra loi database.";
}

function handleUnexpectedError(res, error, fallbackMessage) {
  console.error(error);

  if (error && error.code && error.code.startsWith("ER_")) {
    return res.status(500).json({ message: fallbackMessage });
  }

  return res.status(500).json({ message: fallbackMessage });
}

function createPasswordHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalizedValue.length % 4;
  const paddedValue =
    padding === 0 ? normalizedValue : normalizedValue + "=".repeat(4 - padding);

  return Buffer.from(paddedValue, "base64").toString("utf8");
}

function signAuthToken(payload) {
  const headerSegment = toBase64Url(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  );
  const payloadSegment = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", AUTH_TOKEN_SECRET)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${headerSegment}.${payloadSegment}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token.");
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Malformed token.");
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", AUTH_TOKEN_SECRET)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (!crypto.timingSafeEqual(Buffer.from(signatureSegment), Buffer.from(expectedSignature))) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(fromBase64Url(payloadSegment));
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < nowInSeconds) {
    throw new Error("Token expired.");
  }

  return payload;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
  };
}

function buildAuthResponse(user) {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    exp: nowInSeconds + AUTH_TOKEN_EXPIRES_IN_SECONDS,
  };

  return {
    token: signAuthToken(payload),
    user: sanitizeUser(user),
    expires_in: AUTH_TOKEN_EXPIRES_IN_SECONDS,
  };
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

async function attachUserFromToken(req, _res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      req.authUser = null;
      return next();
    }

    const payload = verifyAuthToken(token);
    const [userRows] = await pool.query(
      `SELECT id, username, full_name, phone, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [payload.sub]
    );

    if (userRows.length === 0) {
      req.authUser = null;
      return next();
    }

    req.authUser = sanitizeUser(userRows[0]);
    return next();
  } catch (_error) {
    req.authUser = null;
    return next();
  }
}

function requireAuth(allowedRoles = []) {
  return async (req, res, next) => {
    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Ban can dang nhap de su dung tinh nang nay.",
      });
    }

    try {
      const payload = verifyAuthToken(token);
      const [userRows] = await pool.query(
        `SELECT id, username, full_name, phone, role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [payload.sub]
      );

      if (userRows.length === 0) {
        return res.status(401).json({
          message: "Tai khoan khong ton tai hoac da bi xoa.",
        });
      }

      req.authUser = sanitizeUser(userRows[0]);

      if (
        Array.isArray(allowedRoles) &&
        allowedRoles.length > 0 &&
        !allowedRoles.includes(req.authUser.role)
      ) {
        return res.status(403).json({
          message: "Ban khong co quyen truy cap tinh nang nay.",
        });
      }

      return next();
    } catch (_error) {
      return res.status(401).json({
        message: "Phien dang nhap khong hop le hoac da het han.",
      });
    }
  };
}

app.use(attachUserFromToken);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ message: "Backend is ready." });
  } catch (error) {
    handleUnexpectedError(res, error, "Khong the kiem tra trang thai server.");
  }
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Vui long nhap day du ten dang nhap va mat khau.",
    });
  }

  const trimmedUsername = String(username).trim().slice(0, 50);
  const trimmedPassword = String(password).slice(0, 128);

  try {
    const [userRows] = await pool.query(
      `SELECT id, username, full_name, phone, role, password_hash, password_salt
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [trimmedUsername]
    );

    if (userRows.length === 0) {
      return res.status(401).json({
        message: "Ten dang nhap hoac mat khau khong dung.",
      });
    }

    const user = userRows[0];
    const passwordHash = createPasswordHash(trimmedPassword, user.password_salt);

    if (!crypto.timingSafeEqual(
      Buffer.from(passwordHash, "hex"),
      Buffer.from(user.password_hash, "hex")
    )) {
      return res.status(401).json({
        message: "Ten dang nhap hoac mat khau khong dung.",
      });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        message: "Tai khoan nay khong dung vai tro ban dang chon.",
      });
    }

    return res.json({
      message: "Dang nhap thanh cong.",
      ...buildAuthResponse(user),
    });
  } catch (error) {
    return handleUnexpectedError(res, error, "Khong the dang nhap.");
  }
});

app.get("/api/auth/me", requireAuth(["USER", "ADMIN"]), async (req, res) => {
  res.json({
    user: req.authUser,
  });
});

app.get("/api/courts", requireAuth(["USER", "ADMIN"]), async (_req, res) => {
  try {
    const [courts] = await pool.query(
      "SELECT id, name, price_per_hour FROM courts ORDER BY id ASC"
    );

    res.json(courts);
  } catch (error) {
    handleUnexpectedError(res, error, "Khong the tai danh sach san.");
  }
});

app.post("/api/book", requireAuth(["USER"]), async (req, res) => {
  const {
    court_id: courtId,
    customer_name: customerName,
    phone,
    booking_date: bookingDate,
    start_time: startTime,
    end_time: endTime,
  } = req.body;

  const normalizedCourtId = toInteger(courtId);
  const submittedCustomerName =
    String(customerName || req.authUser.full_name || "").trim();
  const submittedPhone = String(phone || req.authUser.phone || "").trim();

  if (!normalizedCourtId) {
    return res.status(400).json({
      message: "court_id khong hop le.",
    });
  }

  if (!submittedCustomerName || submittedCustomerName.length < 2) {
    return res.status(400).json({
      message: "Ten khach hang phai co it nhat 2 ky tu.",
    });
  }

  if (!validatePhone(submittedPhone)) {
    return res.status(400).json({
      message: "So dien thoai chi duoc chua 9 den 15 chu so.",
    });
  }

  if (!bookingDate || !isSameOrFutureDate(bookingDate)) {
    return res.status(400).json({
      message: "Ngay dat san phai la hom nay hoac trong tuong lai.",
    });
  }

  const durationResult = getBookingDurationHours(startTime, endTime);

  if (!durationResult.isValid) {
    return res.status(400).json({
      message: durationResult.message,
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [courtRows] = await connection.query(
      "SELECT id, name, price_per_hour FROM courts WHERE id = ? LIMIT 1",
      [normalizedCourtId]
    );

    if (courtRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Khong tim thay san da chon.",
      });
    }

    const selectedCourt = courtRows[0];
    const totalPrice = durationResult.durationHours * selectedCourt.price_per_hour;

    if (!Number.isInteger(totalPrice) || totalPrice <= 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "So tien thanh toan phai lon hon 0.",
      });
    }

    const [overlappingBookings] = await connection.query(
      `SELECT id
       FROM bookings
       WHERE court_id = ?
         AND booking_date = ?
         AND start_time < ?
         AND end_time > ?
       LIMIT 1`,
      [
        normalizedCourtId,
        bookingDate,
        durationResult.normalizedEndTime,
        durationResult.normalizedStartTime,
      ]
    );

    if (overlappingBookings.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "Khung gio nay da co nguoi dat. Vui long chon gio khac.",
      });
    }

    const [insertResult] = await connection.query(
      `INSERT INTO bookings
      (user_id, court_id, customer_name, phone, booking_date, start_time, end_time, total_price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        req.authUser.id,
        normalizedCourtId,
        submittedCustomerName,
        submittedPhone,
        bookingDate,
        durationResult.normalizedStartTime,
        durationResult.normalizedEndTime,
        totalPrice,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Dat san thanh cong.",
      booking: {
        id: insertResult.insertId,
        user_id: req.authUser.id,
        court_id: selectedCourt.id,
        court_name: selectedCourt.name,
        customer_name: submittedCustomerName,
        phone: submittedPhone,
        booking_date: bookingDate,
        start_time: durationResult.normalizedStartTime,
        end_time: durationResult.normalizedEndTime,
        duration_hours: durationResult.durationHours,
        total_price: totalPrice,
        status: "PENDING",
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return handleUnexpectedError(res, error, "Khong the tao booking.");
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post("/api/create-qr", requireAuth(["USER", "ADMIN"]), async (req, res) => {
  const { bookingId } = req.body;
  const normalizedBookingId = toInteger(bookingId);

  if (!normalizedBookingId) {
    return res.status(400).json({
      message: "bookingId khong hop le.",
    });
  }

  const missingPaymentEnv = getMissingPaymentEnv();

  if (missingPaymentEnv.length > 0) {
    return res.status(500).json({
      message: "Thieu cau hinh VietQR hoac tai khoan ngan hang trong file .env.",
      details: `Vui long cap nhat: ${missingPaymentEnv.join(", ")}`,
    });
  }

  try {
    const [bookingRows] = await pool.query(
      `SELECT b.id, b.user_id, b.total_price, b.status, c.name AS court_name
       FROM bookings b
       JOIN courts c ON c.id = b.court_id
       WHERE b.id = ?
       LIMIT 1`,
      [normalizedBookingId]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({
        message: "Khong tim thay booking.",
      });
    }

    const booking = bookingRows[0];

    if (
      req.authUser.role !== "ADMIN" &&
      booking.user_id !== req.authUser.id
    ) {
      return res.status(403).json({
        message: "Ban khong co quyen tao QR cho booking nay.",
      });
    }

    if (booking.status === "PAID") {
      return res.status(400).json({
        message: "Booking nay da duoc thanh toan.",
      });
    }

    if (!Number.isInteger(booking.total_price) || booking.total_price <= 0) {
      return res.status(400).json({
        message: "So tien thanh toan khong hop le.",
      });
    }

    const addInfo = buildPaymentDescription(booking.id);

    const [existingPayments] = await pool.query(
      `SELECT id, amount, qr_data, status
       FROM payments
       WHERE booking_id = ? AND status = 'PENDING'
       ORDER BY id DESC
       LIMIT 1`,
      [booking.id]
    );

    if (existingPayments.length > 0 && existingPayments[0].qr_data) {
      return res.json({
        paymentId: existingPayments[0].id,
        qrDataURL: existingPayments[0].qr_data,
        amount: existingPayments[0].amount,
        addInfo,
        status: "PENDING",
        reused: true,
      });
    }

    const vietQrResponse = await axios.post(
      "https://api.vietqr.io/v2/generate",
      {
        accountNo: process.env.BANK_ACCOUNT_NO,
        accountName: process.env.BANK_ACCOUNT_NAME,
        acqId: process.env.BANK_ACQ_ID,
        amount: booking.total_price,
        addInfo,
        template: "compact",
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.VIETQR_CLIENT_ID,
          "x-api-key": process.env.VIETQR_API_KEY,
        },
      }
    );

    const responseBody = vietQrResponse.data || {};
    const qrDataURL = responseBody?.data?.qrDataURL;

    if (responseBody.code !== "00" || !qrDataURL) {
      return res.status(400).json({
        message: "VietQR tra ve loi khi tao ma QR.",
        details: responseBody.desc || "Khong lay duoc qrDataURL tu VietQR.",
      });
    }

    const [paymentResult] = await pool.query(
      `INSERT INTO payments (booking_id, amount, qr_data, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [booking.id, booking.total_price, qrDataURL]
    );

    return res.status(201).json({
      paymentId: paymentResult.insertId,
      qrDataURL,
      amount: booking.total_price,
      addInfo,
      status: "PENDING",
      reused: false,
    });
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(401).json({
        message:
          "VietQR tu choi xac thuc. Hay kiem tra VIETQR_CLIENT_ID hoac VIETQR_API_KEY.",
        details:
          error.response.data?.desc ||
          error.response.data?.message ||
          "Unauthorized",
      });
    }

    if (error.response) {
      return res.status(error.response.status || 502).json({
        message: "Khong the tao ma QR tu VietQR.",
        details:
          error.response.data?.desc ||
          error.response.data?.message ||
          "VietQR API returned an unexpected error.",
      });
    }

    return handleUnexpectedError(res, error, "Khong the tao ma QR.");
  }
});

app.get("/api/my-bookings", requireAuth(["USER"]), async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT
        b.id,
        b.court_id,
        c.name AS court_name,
        b.customer_name,
        b.phone,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.total_price,
        b.status,
        latest_payment.status AS payment_status,
        latest_payment.id AS payment_id
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      LEFT JOIN (
        SELECT p1.booking_id, p1.id, p1.status
        FROM payments p1
        INNER JOIN (
          SELECT booking_id, MAX(id) AS latest_id
          FROM payments
          GROUP BY booking_id
        ) latest ON latest.latest_id = p1.id
      ) latest_payment ON latest_payment.booking_id = b.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC, b.id DESC`,
      [req.authUser.id]
    );

    res.json(bookings);
  } catch (error) {
    handleUnexpectedError(res, error, "Khong the tai booking cua ban.");
  }
});

app.get("/api/bookings", requireAuth(["ADMIN"]), async (_req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT
        b.id,
        b.user_id,
        u.username,
        u.full_name AS account_name,
        b.court_id,
        c.name AS court_name,
        b.customer_name,
        b.phone,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.total_price,
        b.status,
        latest_payment.status AS payment_status,
        latest_payment.id AS payment_id
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN (
        SELECT p1.booking_id, p1.id, p1.status
        FROM payments p1
        INNER JOIN (
          SELECT booking_id, MAX(id) AS latest_id
          FROM payments
          GROUP BY booking_id
        ) latest ON latest.latest_id = p1.id
      ) latest_payment ON latest_payment.booking_id = b.id
      ORDER BY b.booking_date DESC, b.start_time DESC, b.id DESC`
    );

    res.json(bookings);
  } catch (error) {
    handleUnexpectedError(res, error, "Khong the tai danh sach booking.");
  }
});

app.post("/api/confirm-payment", requireAuth(["ADMIN"]), async (req, res) => {
  const { bookingId } = req.body;
  const normalizedBookingId = toInteger(bookingId);

  if (!normalizedBookingId) {
    return res.status(400).json({
      message: "bookingId khong hop le.",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [bookingRows] = await connection.query(
      "SELECT id, status FROM bookings WHERE id = ? LIMIT 1",
      [normalizedBookingId]
    );

    if (bookingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Khong tim thay booking.",
      });
    }

    if (bookingRows[0].status === "PAID") {
      await connection.rollback();
      return res.json({
        message: "Booking da o trang thai PAID.",
      });
    }

    await connection.query("UPDATE bookings SET status = 'PAID' WHERE id = ?", [
      normalizedBookingId,
    ]);

    await connection.query(
      "UPDATE payments SET status = 'SUCCESS' WHERE booking_id = ? AND status = 'PENDING'",
      [normalizedBookingId]
    );

    await connection.commit();

    return res.json({
      message: "Da xac nhan thanh toan thanh cong.",
      bookingId: normalizedBookingId,
      status: "PAID",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return handleUnexpectedError(res, error, "Khong the xac nhan thanh toan.");
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { username, password, full_name, phone } = req.body;

  if (!username || !password || !full_name || !phone) {
    return res.status(400).json({
      message: "Vui long nhap day du thong tin (username, password, full_name, phone).",
    });
  }

  const trimmedUsername = String(username).trim();
  const trimmedFullName = String(full_name).trim();
  const trimmedPhone = String(phone).trim();
  const trimmedPassword = String(password);

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmedUsername)) {
    return res.status(400).json({ message: "Username chi duoc chua chu cai, so, dau gach duoi (3-30 ky tu)." });
  }
  if (trimmedPassword.length < 8 || trimmedPassword.length > 128) {
    return res.status(400).json({ message: "Mat khau phai tu 8 den 128 ky tu." });
  }
  if (trimmedFullName.length < 2 || trimmedFullName.length > 100) {
    return res.status(400).json({ message: "Ho ten phai tu 2 den 100 ky tu." });
  }
  if (!validatePhone(trimmedPhone)) {
    return res.status(400).json({ message: "So dien thoai khong hop le (9-15 chu so)." });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE username = ?", [trimmedUsername]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Ten dang nhap da ton tai." });
    }

    const passwordSalt = crypto.randomBytes(16).toString("hex");
    const passwordHash = createPasswordHash(trimmedPassword, passwordSalt);

    const [insertResult] = await pool.query(
      `INSERT INTO users (username, password_hash, password_salt, full_name, phone, role)
       VALUES (?, ?, ?, ?, ?, 'USER')`,
      [trimmedUsername, passwordHash, passwordSalt, trimmedFullName, trimmedPhone]
    );

    return res.status(201).json({
      message: "Dang ky thanh cong.",
      userId: insertResult.insertId
    });
  } catch (error) {
    return handleUnexpectedError(res, error, "Khong the dang ky tai khoan.");
  }
});

app.post("/api/courts", requireAuth(["ADMIN"]), async (req, res) => {
  const { name, price_per_hour } = req.body;
  if (!name || !Number.isInteger(Number(price_per_hour)) || Number(price_per_hour) <= 0) {
    return res.status(400).json({ message: "Thong tin san khong hop le." });
  }

  try {
    const [result] = await pool.query("INSERT INTO courts (name, price_per_hour) VALUES (?, ?)", [name, Number(price_per_hour)]);
    return res.status(201).json({ message: "Them san thanh cong.", id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "Ten san da ton tai." });
    }
    return handleUnexpectedError(res, error, "Khong the them san.");
  }
});

app.put("/api/courts/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const { name, price_per_hour } = req.body;
  const courtId = toInteger(req.params.id);

  if (!courtId || !name || !Number.isInteger(Number(price_per_hour)) || Number(price_per_hour) <= 0) {
    return res.status(400).json({ message: "Thong tin san khong hop le." });
  }

  try {
    const [result] = await pool.query("UPDATE courts SET name = ?, price_per_hour = ? WHERE id = ?", [name, Number(price_per_hour), courtId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Khong tim thay san." });
    return res.json({ message: "Cap nhat san thanh cong." });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "Ten san da ton tai." });
    }
    return handleUnexpectedError(res, error, "Khong the cap nhat san.");
  }
});

app.delete("/api/courts/:id", requireAuth(["ADMIN"]), async (req, res) => {
  const courtId = toInteger(req.params.id);
  if (!courtId) return res.status(400).json({ message: "id khong hop le." });

  try {
    const [result] = await pool.query("DELETE FROM courts WHERE id = ?", [courtId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Khong tim thay san." });
    return res.json({ message: "Xoa san thanh cong." });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: "San nay da co booking, khong the xoa." });
    }
    return handleUnexpectedError(res, error, "Khong the xoa san.");
  }
});

app.post("/api/bookings/:id/cancel", requireAuth(["USER", "ADMIN"]), async (req, res) => {
  const bookingId = toInteger(req.params.id);
  if (!bookingId) return res.status(400).json({ message: "bookingId khong hop le." });

  try {
    const [bookings] = await pool.query("SELECT user_id, status FROM bookings WHERE id = ?", [bookingId]);
    if (bookings.length === 0) return res.status(404).json({ message: "Khong tim thay booking." });

    const booking = bookings[0];
    if (req.authUser.role !== "ADMIN" && booking.user_id !== req.authUser.id) {
      return res.status(403).json({ message: "Ban khong co quyen huy booking nay." });
    }

    if (booking.status !== "PENDING") {
      return res.status(400).json({ message: "Chi the huy booking dang cho thanh toan." });
    }

    await pool.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", [bookingId]);
    return res.json({ message: "Huy booking thanh cong." });
  } catch (error) {
    return handleUnexpectedError(res, error, "Khong the huy booking.");
  }
});

app.post("/api/chat/send", requireAuth(["USER"]), async (req, res) => {
  const { content } = req.body;
  const trimmed = String(content || "").trim();
  if (!trimmed) return res.status(400).json({ message: "Tin nhắn không được để trống." });
  if (trimmed.length > 2000) return res.status(400).json({ message: "Tin nhắn quá dài (tối đa 2000 ký tự)." });

  try {
    const [result] = await pool.query(
      "INSERT INTO messages (user_id, sender_role, content) VALUES (?, 'USER', ?)",
      [req.authUser.id, trimmed]
    );
    return res.status(201).json({
      id: result.insertId,
      sender_role: "USER",
      content: trimmed,
      created_at: new Date().toISOString(),
      is_read: false,
    });
  } catch (error) {
    return handleUnexpectedError(res, error, "Không thể gửi tin nhắn.");
  }
});

app.get("/api/chat/messages", requireAuth(["USER"]), async (req, res) => {
  try {
    const [messages] = await pool.query(
      `SELECT id, sender_role, content, is_read, created_at
       FROM messages
       WHERE user_id = ?
       ORDER BY created_at ASC
       LIMIT 200`,
      [req.authUser.id]
    );
    await pool.query(
      "UPDATE messages SET is_read = TRUE WHERE user_id = ? AND sender_role = 'ADMIN' AND is_read = FALSE",
      [req.authUser.id]
    );
    return res.json(messages);
  } catch (error) {
    return handleUnexpectedError(res, error, "Không thể tải tin nhắn.");
  }
});
app.get("/api/admin/conversations", requireAuth(["ADMIN"]), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         u.id AS user_id,
         u.username,
         u.full_name,
         u.phone,
         m_last.content AS last_message,
         m_last.sender_role AS last_sender,
         m_last.created_at AS last_at,
         COUNT(CASE WHEN m.sender_role = 'USER' AND m.is_read = FALSE THEN 1 END) AS unread_count
       FROM users u
       INNER JOIN messages m ON m.user_id = u.id
       INNER JOIN (
         SELECT user_id, content, sender_role, created_at
         FROM messages m2
         WHERE m2.id = (SELECT MAX(id) FROM messages WHERE user_id = m2.user_id)
       ) m_last ON m_last.user_id = u.id
       WHERE u.role = 'USER'
       GROUP BY u.id, u.username, u.full_name, u.phone, m_last.content, m_last.sender_role, m_last.created_at
       ORDER BY m_last.created_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    return handleUnexpectedError(res, error, "Không thể tải danh sách hội thoại.");
  }
});
app.get("/api/admin/messages/:userId", requireAuth(["ADMIN"]), async (req, res) => {
  const userId = toInteger(req.params.userId);
  if (!userId) return res.status(400).json({ message: "userId không hợp lệ." });

  try {
    const [messages] = await pool.query(
      `SELECT id, sender_role, content, is_read, created_at
       FROM messages
       WHERE user_id = ?
       ORDER BY created_at ASC
       LIMIT 300`,
      [userId]
    );
    await pool.query(
      "UPDATE messages SET is_read = TRUE WHERE user_id = ? AND sender_role = 'USER' AND is_read = FALSE",
      [userId]
    );
    return res.json(messages);
  } catch (error) {
    return handleUnexpectedError(res, error, "Không thể tải tin nhắn.");
  }
});
app.post("/api/admin/messages/:userId", requireAuth(["ADMIN"]), async (req, res) => {
  const userId = toInteger(req.params.userId);
  if (!userId) return res.status(400).json({ message: "userId không hợp lệ." });

  const { content } = req.body;
  const trimmed = String(content || "").trim();
  if (!trimmed) return res.status(400).json({ message: "Tin nhắn không được để trống." });
  if (trimmed.length > 2000) return res.status(400).json({ message: "Tin nhắn quá dài." });

  try {
    const [userRows] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'USER' LIMIT 1", [userId]);
    if (userRows.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const [result] = await pool.query(
      "INSERT INTO messages (user_id, sender_role, content) VALUES (?, 'ADMIN', ?)",
      [userId, trimmed]
    );
    return res.status(201).json({
      id: result.insertId,
      sender_role: "ADMIN",
      content: trimmed,
      created_at: new Date().toISOString(),
      is_read: false,
    });
  } catch (error) {
    return handleUnexpectedError(res, error, "Không thể gửi tin nhắn.");
  }
});


app.use((req, res) => {
  res.status(404).json({
    message: `Khong tim thay endpoint ${req.method} ${req.originalUrl}.`,
  });
});

async function startServer() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Cannot start server because database connection failed.");
    console.error(formatDatabaseError(error));
    if (error?.code) {
      console.error(`Database error code: ${error.code}`);
    }
    if (error?.message) {
      console.error(`Database error message: ${error.message}`);
    }
    process.exit(1);
  }
}

startServer();
