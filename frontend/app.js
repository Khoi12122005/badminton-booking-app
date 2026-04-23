const API_BASE_URL = "http://localhost:5000/api";

const state = {
  courts: [],
  selectedCourtId: null,
  latestBooking: null,
};

const elements = {
  globalMessage: document.getElementById("global-message"),
  courtsGrid: document.getElementById("courts-grid"),
  bookingForm: document.getElementById("booking-form"),
  customerName: document.getElementById("customer-name"),
  phone: document.getElementById("phone"),
  bookingDate: document.getElementById("booking-date"),
  startTime: document.getElementById("start-time"),
  endTime: document.getElementById("end-time"),
  submitBookingBtn: document.getElementById("submit-booking-btn"),
  bookingResult: document.getElementById("booking-result"),
  paymentCard: document.getElementById("payment-card"),
  createQrBtn: document.getElementById("create-qr-btn"),
  qrResult: document.getElementById("qr-result"),
  qrImage: document.getElementById("qr-image"),
  qrAmount: document.getElementById("qr-amount"),
  qrAddInfo: document.getElementById("qr-add-info"),
  paymentStatusBadge: document.getElementById("payment-status-badge"),
  bookingsTableBody: document.getElementById("bookings-table-body"),
  refreshBookingsBtn: document.getElementById("refresh-bookings-btn"),
  reloadCourtsBtn: document.getElementById("reload-courts-btn"),
};

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function toTimeLabel(timeValue) {
  return String(timeValue || "").slice(0, 5);
}

function setMessage(message, type = "success") {
  if (!elements.globalMessage) {
    return;
  }

  if (!message) {
    elements.globalMessage.className = "message hidden";
    elements.globalMessage.textContent = "";
    return;
  }

  elements.globalMessage.className = `message ${type}`;
  elements.globalMessage.textContent = message;
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) {
    return;
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Yêu cầu thất bại.");
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

function buildTimeOptions() {
  const options = [];

  for (let hour = 5; hour <= 23; hour += 1) {
    const formattedHour = String(hour).padStart(2, "0");
    options.push(`${formattedHour}:00`);
  }

  return options;
}

function renderTimeOptions() {
  if (!elements.startTime || !elements.endTime) {
    return;
  }

  const options = buildTimeOptions();
  const startOptions = ['<option value="">Chọn giờ</option>']
    .concat(
      options
        .filter((value) => value !== "23:00")
        .map((value) => `<option value="${value}">${value}</option>`)
    )
    .join("");

  const endOptions = ['<option value="">Chọn giờ</option>']
    .concat(options.slice(1).map((value) => `<option value="${value}">${value}</option>`))
    .join("");

  elements.startTime.innerHTML = startOptions;
  elements.endTime.innerHTML = endOptions;
}

function renderCourts() {
  if (!elements.courtsGrid) {
    return;
  }

  if (state.courts.length === 0) {
    elements.courtsGrid.innerHTML = `
      <article class="court-card">
        <h3>Chưa có sân trong database</h3>
        <p>Hãy chạy file schema SQL để tạo dữ liệu bảng courts trước.</p>
      </article>
    `;
    return;
  }

  elements.courtsGrid.innerHTML = state.courts
    .map((court) => {
      const selectedClass = court.id === state.selectedCourtId ? "selected" : "";
      return `
        <article class="court-card ${selectedClass}" data-court-id="${court.id}">
          <h3>${court.name}</h3>
          <p>${formatCurrency(court.price_per_hour)} / giờ</p>
        </article>
      `;
    })
    .join("");

  elements.courtsGrid.querySelectorAll(".court-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedCourtId = Number(card.dataset.courtId);
      renderCourts();
    });
  });
}

function renderBookingSummary() {
  if (!elements.bookingResult || !elements.paymentCard) {
    return;
  }

  if (!state.latestBooking) {
    elements.bookingResult.className = "summary-card empty-state";
    elements.bookingResult.innerHTML = `
      <h3>Chưa có booking mới</h3>
      <p>Hoàn tất form bên trái để xem tổng tiền và tạo VietQR thanh toán.</p>
    `;
    elements.paymentCard.classList.add("hidden");
    return;
  }

  const booking = state.latestBooking;

  elements.bookingResult.className = "summary-card";
  elements.bookingResult.innerHTML = `
    <p class="section-label">Booking #${booking.id}</p>
    <h3>${booking.court_name}</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <span>Khách hàng</span>
        <strong>${booking.customer_name}</strong>
      </div>
      <div class="summary-item">
        <span>Số điện thoại</span>
        <strong>${booking.phone}</strong>
      </div>
      <div class="summary-item">
        <span>Ngày đặt</span>
        <strong>${booking.booking_date}</strong>
      </div>
      <div class="summary-item">
        <span>Khung giờ</span>
        <strong>${toTimeLabel(booking.start_time)} - ${toTimeLabel(booking.end_time)}</strong>
      </div>
      <div class="summary-item">
        <span>Số giờ</span>
        <strong>${booking.duration_hours} giờ</strong>
      </div>
      <div class="summary-item">
        <span>Tổng tiền</span>
        <strong>${formatCurrency(booking.total_price)}</strong>
      </div>
    </div>
  `;

  elements.paymentCard.classList.remove("hidden");
  updatePaymentBadge(booking.status);
}

function updatePaymentBadge(status) {
  if (!elements.paymentStatusBadge) {
    return;
  }

  const isPaid = status === "PAID";
  elements.paymentStatusBadge.textContent = isPaid
    ? "Đã thanh toán"
    : "Đang chờ thanh toán";
  elements.paymentStatusBadge.className = `status-badge ${isPaid ? "paid" : "pending"}`;
}

async function loadCourts() {
  if (!elements.courtsGrid) {
    return;
  }

  try {
    setMessage("");
    elements.courtsGrid.innerHTML = `
      <article class="court-card">
        <h3>Đang tải danh sách sân...</h3>
        <p>Vui lòng chờ trong giây lát.</p>
      </article>
    `;

    const courts = await request("/courts", { method: "GET" });
    state.courts = courts;

    if (!state.selectedCourtId && courts.length > 0) {
      state.selectedCourtId = courts[0].id;
    }

    renderCourts();
  } catch (error) {
    setMessage(error.details || error.message, "error");
  }
}

function buildBookingPayload() {
  return {
    court_id: state.selectedCourtId,
    customer_name: elements.customerName.value.trim(),
    phone: elements.phone.value.trim(),
    booking_date: elements.bookingDate.value,
    start_time: elements.startTime.value,
    end_time: elements.endTime.value,
  };
}

async function handleBookingSubmit(event) {
  event.preventDefault();

  if (!state.selectedCourtId) {
    setMessage("Bạn cần chọn một sân trước khi đặt.", "error");
    return;
  }

  setButtonLoading(elements.submitBookingBtn, true, "Đang tạo booking...", "Đặt sân ngay");

  try {
    const payload = buildBookingPayload();
    const response = await request("/book", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    state.latestBooking = response.booking;
    renderBookingSummary();
    elements.qrResult.classList.add("hidden");
    elements.qrImage.removeAttribute("src");
    setMessage(response.message, "success");
    elements.paymentCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    await loadBookings();
  } catch (error) {
    const errorMessage = error.details
      ? `${error.message} ${error.details}`
      : error.message;
    setMessage(errorMessage, "error");
  } finally {
    setButtonLoading(elements.submitBookingBtn, false, "Đang tạo booking...", "Đặt sân ngay");
  }
}

async function createQr() {
  if (!state.latestBooking) {
    setMessage("Bạn cần tạo booking trước khi thanh toán.", "error");
    return;
  }

  setButtonLoading(elements.createQrBtn, true, "Đang lấy VietQR...", "Thanh toán QR");

  try {
    const response = await request("/create-qr", {
      method: "POST",
      body: JSON.stringify({ bookingId: state.latestBooking.id }),
    });

    elements.qrImage.src = response.qrDataURL;
    elements.qrAmount.textContent = formatCurrency(response.amount);
    elements.qrAddInfo.textContent = response.addInfo;
    elements.qrResult.classList.remove("hidden");
    updatePaymentBadge(response.status);
    setMessage(
      response.reused
        ? "Đã dùng lại mã QR PENDING gần nhất cho booking này."
        : "Tạo mã VietQR thành công.",
      "success"
    );
  } catch (error) {
    const details = error.details ? ` ${error.details}` : "";
    const prefix =
      error.status === 401
        ? "VietQR báo sai thông tin xác thực."
        : "Không thể tạo QR.";
    setMessage(`${prefix} ${error.message}${details}`, "error");
  } finally {
    setButtonLoading(elements.createQrBtn, false, "Đang lấy VietQR...", "Thanh toán QR");
  }
}

function renderBookingsTable(bookings) {
  if (!elements.bookingsTableBody) {
    return;
  }

  if (!Array.isArray(bookings) || bookings.length === 0) {
    elements.bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">Chưa có booking nào trong hệ thống.</td>
      </tr>
    `;
    return;
  }

  elements.bookingsTableBody.innerHTML = bookings
    .map((booking) => {
      const isPaid = booking.status === "PAID";
      return `
        <tr>
          <td>#${booking.id}</td>
          <td>${booking.court_name}</td>
          <td>
            <strong>${booking.customer_name}</strong><br />
            <span>${booking.phone}</span>
          </td>
          <td>${booking.booking_date}</td>
          <td>${toTimeLabel(booking.start_time)} - ${toTimeLabel(booking.end_time)}</td>
          <td>${formatCurrency(booking.total_price)}</td>
          <td>
            <span class="status-badge ${isPaid ? "paid" : "pending"}">
              ${booking.status}
            </span>
          </td>
          <td>
            <button
              class="action-btn ${isPaid ? "" : "success"}"
              type="button"
              data-booking-id="${booking.id}"
              ${isPaid ? "disabled" : ""}
            >
              ${isPaid ? "Đã thanh toán" : "Xác nhận đã thanh toán"}
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.bookingsTableBody.querySelectorAll("[data-booking-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const bookingId = Number(button.dataset.bookingId);
      await confirmPayment(bookingId, button);
    });
  });
}

async function loadBookings() {
  if (!elements.bookingsTableBody) {
    return;
  }

  try {
    elements.bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">Đang tải dữ liệu booking...</td>
      </tr>
    `;

    const bookings = await request("/bookings", { method: "GET" });
    renderBookingsTable(bookings);
  } catch (error) {
    elements.bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">${error.message}</td>
      </tr>
    `;
  }
}

async function confirmPayment(bookingId, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Đang xác nhận...";

  try {
    const response = await request("/confirm-payment", {
      method: "POST",
      body: JSON.stringify({ bookingId }),
    });

    if (state.latestBooking && state.latestBooking.id === bookingId) {
      state.latestBooking.status = "PAID";
      renderBookingSummary();
    }

    setMessage(response.message, "success");
    await loadBookings();
  } catch (error) {
    const details = error.details ? ` ${error.details}` : "";
    setMessage(`${error.message}${details}`, "error");
    button.disabled = false;
    button.textContent = originalText;
  }
}

function setDefaultDate() {
  if (!elements.bookingDate) {
    return;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  const normalizedDate = `${year}-${month}-${date}`;
  elements.bookingDate.min = normalizedDate;
  elements.bookingDate.value = normalizedDate;
}

function bindEvents() {
  if (elements.bookingForm) {
    elements.bookingForm.addEventListener("submit", handleBookingSubmit);
  }

  if (elements.createQrBtn) {
    elements.createQrBtn.addEventListener("click", createQr);
  }

  if (elements.refreshBookingsBtn) {
    elements.refreshBookingsBtn.addEventListener("click", loadBookings);
  }

  if (elements.reloadCourtsBtn) {
    elements.reloadCourtsBtn.addEventListener("click", loadCourts);
  }
}

async function init() {
  bindEvents();

  const tasks = [];

  if (elements.bookingForm) {
    renderTimeOptions();
    setDefaultDate();
    renderBookingSummary();
    tasks.push(loadCourts());
  }

  if (elements.bookingsTableBody) {
    tasks.push(loadBookings());
  }

  await Promise.all(tasks);
}

init();
