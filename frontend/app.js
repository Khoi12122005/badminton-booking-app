const API_BASE_URL = "http://localhost:5000/api";

const state = {
  courts: [],
  selectedCourtId: null,
  latestBooking: null,
  user: null,
  token: localStorage.getItem("auth_token") || null,
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
  
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  adminLoginForm: document.getElementById("admin-login-form"),
  logoutBtn: document.getElementById("logout-btn"),
  
  myBookingsTableBody: document.getElementById("my-bookings-table-body"),
  
  chatWidgetBtn: document.getElementById("chat-widget-btn"),
  chatWindow: document.getElementById("chat-window"),
  chatBody: document.getElementById("chat-body"),
  chatInputForm: document.getElementById("chat-input-form"),
  chatInputMessage: document.getElementById("chat-input-message"),
  
  adminCourtsTableBody: document.getElementById("admin-courts-table-body"),
  createCourtBtn: document.getElementById("create-court-btn"),
  courtModal: document.getElementById("court-modal"),
  courtModalClose: document.getElementById("court-modal-close"),
  courtForm: document.getElementById("court-form"),
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

function setMessage(message, type = "success", element = elements.globalMessage) {
  if (!element) return;
  if (!message) {
    element.className = "message hidden";
    element.textContent = "";
    return;
  }
  element.className = `message ${type}`;
  element.textContent = message;
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !path.includes("/auth/login")) {
      logout();
    }
    const error = new Error(data.message || "Yêu cầu thất bại.");
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

function logout() {
  localStorage.removeItem("auth_token");
  state.token = null;
  state.user = null;
  window.location.href = "./login.html";
}

async function checkAuth() {
  if (!state.token) {
    handleUnauthenticated();
    return;
  }
  try {
    const data = await request("/auth/me");
    state.user = data.user;
    const isPathAdmin = window.location.pathname.includes("admin.html");
    const isPathUser = window.location.pathname.includes("index.html") || window.location.pathname === "/" || window.location.pathname === "";
    
    if (isPathAdmin && state.user.role !== "ADMIN") {
      window.location.href = "./index.html";
    }
  } catch (error) {
    handleUnauthenticated();
  }
}

function handleUnauthenticated() {
  const isPathAdmin = window.location.pathname.includes("admin.html");
  const isPathUser = window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/");
  if (isPathAdmin) {
    window.location.href = "./admin-login.html";
  } else if (isPathUser) {
    window.location.href = "./login.html";
  }
}

// ----------------------------------------------------------------------
// Auth Logic
// ----------------------------------------------------------------------
if (elements.loginForm) {
  elements.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("login-btn");
    setButtonLoading(btn, true, "Đang xử lý...", "Đăng nhập");
    try {
      const payload = {
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      };
      const data = await request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("auth_token", data.token);
      window.location.href = "./index.html";
    } catch (err) {
      setMessage(err.message, "error");
    } finally {
      setButtonLoading(btn, false, "Đang xử lý...", "Đăng nhập");
    }
  });
}

if (elements.registerForm) {
  elements.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("register-btn");
    setButtonLoading(btn, true, "Đang đăng ký...", "Đăng ký");
    try {
      const payload = {
        username: document.getElementById("reg-username").value,
        full_name: document.getElementById("reg-fullname").value,
        phone: document.getElementById("reg-phone").value,
        password: document.getElementById("reg-password").value,
      };
      await request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
      window.location.href = "./login.html";
    } catch (err) {
      setMessage(err.message, "error");
    } finally {
      setButtonLoading(btn, false, "Đang đăng ký...", "Đăng ký");
    }
  });
}

if (elements.adminLoginForm) {
  elements.adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("admin-login-btn");
    setButtonLoading(btn, true, "Đang xử lý...", "Đăng nhập hệ thống");
    try {
      const payload = {
        username: document.getElementById("admin-username").value,
        password: document.getElementById("admin-password").value,
        role: "ADMIN"
      };
      const data = await request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("auth_token", data.token);
      window.location.href = "./admin.html";
    } catch (err) {
      setMessage(err.message, "error");
    } finally {
      setButtonLoading(btn, false, "Đang xử lý...", "Đăng nhập hệ thống");
    }
  });
}

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

// ----------------------------------------------------------------------
// Booking Logic
// ----------------------------------------------------------------------
function buildTimeOptions() {
  const options = [];
  for (let hour = 5; hour <= 23; hour += 1) {
    options.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return options;
}

function renderTimeOptions() {
  if (!elements.startTime || !elements.endTime) return;
  const options = buildTimeOptions();
  elements.startTime.innerHTML = ['<option value="">Chọn giờ</option>'].concat(options.filter(v => v !== "23:00").map(v => `<option value="${v}">${v}</option>`)).join("");
  elements.endTime.innerHTML = ['<option value="">Chọn giờ</option>'].concat(options.slice(1).map(v => `<option value="${v}">${v}</option>`)).join("");
}

async function loadCourts() {
  if (!elements.courtsGrid) return;
  try {
    setMessage("");
    elements.courtsGrid.innerHTML = `<article class="court-card"><h3>Đang tải...</h3></article>`;
    const courts = await request("/courts", { method: "GET" });
    state.courts = courts;
    if (!state.selectedCourtId && courts.length > 0) {
      state.selectedCourtId = courts[0].id;
    }
    renderCourts();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

function renderCourts() {
  if (!elements.courtsGrid) return;
  if (state.courts.length === 0) {
    elements.courtsGrid.innerHTML = `<article class="court-card"><h3>Không có sân</h3></article>`;
    return;
  }
  elements.courtsGrid.innerHTML = state.courts.map((court) => {
    const selectedClass = court.id === state.selectedCourtId ? "selected" : "";
    return `
      <article class="court-card ${selectedClass}" data-court-id="${court.id}">
        <h3>${court.name}</h3>
        <p>${formatCurrency(court.price_per_hour)} / giờ</p>
      </article>
    `;
  }).join("");

  elements.courtsGrid.querySelectorAll(".court-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedCourtId = Number(card.dataset.courtId);
      renderCourts();
    });
  });
}

function renderBookingSummary() {
  if (!elements.bookingResult || !elements.paymentCard) return;
  if (!state.latestBooking) {
    elements.bookingResult.className = "summary-card empty-state";
    elements.bookingResult.innerHTML = `<h3>Chưa có booking mới</h3><p>Hoàn tất form bên trái để xem tổng tiền và tạo VietQR.</p>`;
    elements.paymentCard.classList.add("hidden");
    return;
  }
  const b = state.latestBooking;
  elements.bookingResult.className = "summary-card";
  elements.bookingResult.innerHTML = `
    <p class="section-label">Booking #${b.id}</p>
    <h3>${b.court_name}</h3>
    <div class="summary-grid">
      <div class="summary-item"><span>Tổng tiền</span><strong>${formatCurrency(b.total_price)}</strong></div>
    </div>
  `;
  elements.paymentCard.classList.remove("hidden");
  updatePaymentBadge(b.status);
}

function updatePaymentBadge(status) {
  if (!elements.paymentStatusBadge) return;
  elements.paymentStatusBadge.textContent = status === "PAID" ? "Đã thanh toán" : "Đang chờ thanh toán";
  elements.paymentStatusBadge.className = `status-badge ${status === "PAID" ? "paid" : "pending"}`;
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  if (!state.selectedCourtId) {
    setMessage("Bạn cần chọn một sân trước.", "error");
    return;
  }
  setButtonLoading(elements.submitBookingBtn, true, "Đang xử lý...", "Đặt sân ngay");
  try {
    const payload = {
      court_id: state.selectedCourtId,
      customer_name: elements.customerName.value.trim(),
      phone: elements.phone.value.trim(),
      booking_date: elements.bookingDate.value,
      start_time: elements.startTime.value,
      end_time: elements.endTime.value,
    };
    const response = await request("/book", { method: "POST", body: JSON.stringify(payload) });
    state.latestBooking = response.booking;
    renderBookingSummary();
    if(elements.qrResult) elements.qrResult.classList.add("hidden");
    setMessage(response.message, "success");
    elements.paymentCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if(elements.myBookingsTableBody) loadMyBookings();
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setButtonLoading(elements.submitBookingBtn, false, "Đang xử lý...", "Đặt sân ngay");
  }
}

async function createQr() {
  if (!state.latestBooking) return;
  setButtonLoading(elements.createQrBtn, true, "Đang lấy...", "Thanh toán QR");
  try {
    const response = await request("/create-qr", { method: "POST", body: JSON.stringify({ bookingId: state.latestBooking.id }) });
    elements.qrImage.src = response.qrDataURL;
    elements.qrAmount.textContent = formatCurrency(response.amount);
    elements.qrAddInfo.textContent = response.addInfo;
    elements.qrResult.classList.remove("hidden");
    updatePaymentBadge(response.status);
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setButtonLoading(elements.createQrBtn, false, "Đang lấy...", "Thanh toán QR");
  }
}

// ----------------------------------------------------------------------
// User Dashboard (My Bookings)
// ----------------------------------------------------------------------
async function loadMyBookings() {
  if (!elements.myBookingsTableBody) return;
  try {
    elements.myBookingsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Đang tải...</td></tr>`;
    const bookings = await request("/my-bookings", { method: "GET" });
    if (bookings.length === 0) {
      elements.myBookingsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Bạn chưa có booking nào.</td></tr>`;
      return;
    }
    elements.myBookingsTableBody.innerHTML = bookings.map(b => {
      let statusBadge = `<span class="status-badge ${b.status === 'PAID' ? 'paid' : (b.status === 'CANCELLED' ? 'danger' : 'pending')}">${b.status}</span>`;
      let cancelBtn = b.status === 'PENDING' ? `<button class="action-btn danger btn-cancel" data-id="${b.id}">Hủy</button>` : '';
      return `
        <tr>
          <td>#${b.id}</td>
          <td>${b.court_name}</td>
          <td>${b.booking_date}</td>
          <td>${toTimeLabel(b.start_time)} - ${toTimeLabel(b.end_time)}</td>
          <td>${formatCurrency(b.total_price)}</td>
          <td>${statusBadge}</td>
          <td>${cancelBtn}</td>
        </tr>
      `;
    }).join("");

    elements.myBookingsTableBody.querySelectorAll(".btn-cancel").forEach(btn => {
      btn.addEventListener("click", async () => {
        if(confirm("Bạn có chắc chắn muốn hủy booking này?")) {
          await cancelBooking(btn.dataset.id);
          loadMyBookings();
        }
      });
    });
  } catch (e) {
    elements.myBookingsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">${e.message}</td></tr>`;
  }
}

async function cancelBooking(id) {
  try {
    await request(`/bookings/${id}/cancel`, { method: "POST" });
    alert("Hủy booking thành công.");
  } catch (e) {
    alert(e.message);
  }
}

// ----------------------------------------------------------------------
// Admin Dashboard Logic
// ----------------------------------------------------------------------
async function loadBookings() {
  if (!elements.bookingsTableBody) return;
  try {
    elements.bookingsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Đang tải...</td></tr>`;
    const bookings = await request("/bookings", { method: "GET" });
    if (bookings.length === 0) {
      elements.bookingsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Chưa có booking nào.</td></tr>`;
      return;
    }
    elements.bookingsTableBody.innerHTML = bookings.map((b) => {
      const isPaid = b.status === "PAID";
      const isCancelled = b.status === "CANCELLED";
      return `
        <tr>
          <td>#${b.id}</td>
          <td>${b.court_name}</td>
          <td><strong>${b.customer_name}</strong><br /><span>${b.phone}</span></td>
          <td>${b.booking_date}</td>
          <td>${toTimeLabel(b.start_time)} - ${toTimeLabel(b.end_time)}</td>
          <td>${formatCurrency(b.total_price)}</td>
          <td><span class="status-badge ${isPaid ? "paid" : (isCancelled ? 'danger' : 'pending')}">${b.status}</span></td>
          <td style="display: flex; gap: 8px;">
            <button class="action-btn success btn-confirm" data-id="${b.id}" ${isPaid || isCancelled ? "disabled" : ""}>Duyệt</button>
            <button class="action-btn danger btn-cancel-admin" data-id="${b.id}" ${isPaid || isCancelled ? "disabled" : ""}>Hủy</button>
          </td>
        </tr>
      `;
    }).join("");

    elements.bookingsTableBody.querySelectorAll(".btn-confirm").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await request("/confirm-payment", { method: "POST", body: JSON.stringify({ bookingId: Number(btn.dataset.id) }) });
          loadBookings();
        } catch (e) {
          alert(e.message);
          btn.disabled = false;
        }
      });
    });

    elements.bookingsTableBody.querySelectorAll(".btn-cancel-admin").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if(confirm("Hủy booking này?")) {
          await cancelBooking(btn.dataset.id);
          loadBookings();
        }
      });
    });
  } catch (error) {
    elements.bookingsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">${error.message}</td></tr>`;
  }
}

async function loadAdminCourts() {
  if (!elements.adminCourtsTableBody) return;
  try {
    elements.adminCourtsTableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Đang tải...</td></tr>`;
    const courts = await request("/courts", { method: "GET" });
    if (courts.length === 0) {
      elements.adminCourtsTableBody.innerHTML = `<tr><td colspan="4" class="table-empty">Chưa có sân nào.</td></tr>`;
      return;
    }
    elements.adminCourtsTableBody.innerHTML = courts.map((c) => {
      return `
        <tr>
          <td>#${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td>${formatCurrency(c.price_per_hour)}</td>
          <td style="display: flex; gap: 8px;">
            <button class="action-btn btn-edit-court" data-id="${c.id}" data-name="${c.name}" data-price="${c.price_per_hour}">Sửa</button>
            <button class="action-btn danger btn-delete-court" data-id="${c.id}">Xóa</button>
          </td>
        </tr>
      `;
    }).join("");

    elements.adminCourtsTableBody.querySelectorAll(".btn-edit-court").forEach(btn => {
      btn.addEventListener("click", () => openCourtModal(btn.dataset.id, btn.dataset.name, btn.dataset.price));
    });
    elements.adminCourtsTableBody.querySelectorAll(".btn-delete-court").forEach(btn => {
      btn.addEventListener("click", async () => {
        if(confirm("Bạn muốn xóa sân này?")) {
          try {
            await request(`/courts/${btn.dataset.id}`, { method: "DELETE" });
            loadAdminCourts();
          } catch(e) { alert(e.message); }
        }
      });
    });
  } catch (error) {
    elements.adminCourtsTableBody.innerHTML = `<tr><td colspan="4" class="table-empty">${error.message}</td></tr>`;
  }
}

let editingCourtId = null;

function openCourtModal(id = null, name = "", price = "") {
  editingCourtId = id;
  document.getElementById("modal-court-title").textContent = id ? "Sửa sân" : "Thêm sân mới";
  document.getElementById("court-name").value = name;
  document.getElementById("court-price").value = price;
  elements.courtModal.classList.add("active");
}

function closeCourtModal() {
  elements.courtModal.classList.remove("active");
}

if (elements.courtModalClose) {
  elements.courtModalClose.addEventListener("click", closeCourtModal);
}
if (elements.createCourtBtn) {
  elements.createCourtBtn.addEventListener("click", () => openCourtModal());
}
if (elements.courtForm) {
  elements.courtForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("court-name").value,
      price_per_hour: document.getElementById("court-price").value
    };
    try {
      if (editingCourtId) {
        await request(`/courts/${editingCourtId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await request(`/courts`, { method: "POST", body: JSON.stringify(payload) });
      }
      closeCourtModal();
      loadAdminCourts();
    } catch(err) {
      alert(err.message);
    }
  });
}

const chatState = {
  isOpen: false,
  messages: [],
  pollingInterval: null,
  lastMessageId: 0,
};

const adminChatState = {
  conversations: [],
  activeUserId: null,
  pollingInterval: null,
};

function formatChatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatConvTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

// ── USER SIDE ─────────────────────────────────────────────────
function renderUserMessages(messages) {
  const body = elements.chatBody;
  if (!body) return;
  const loading = document.getElementById("chat-loading");
  if (loading) loading.remove();

  if (messages.length === 0 && body.children.length === 0) {
    body.innerHTML = `<div class="chat-empty-state">Hãy gửi tin nhắn đầu tiên! Quản trị viên sẽ phản hồi sớm nhất có thể. 🏸</div>`;
    return;
  }

  // Only render new messages to avoid full re-render flicker
  const renderedIds = new Set([...body.querySelectorAll("[data-msg-id]")].map(el => el.dataset.msgId));
  let added = false;
  messages.forEach(msg => {
    if (renderedIds.has(String(msg.id))) return;
    const isUser = msg.sender_role === "USER";
    const div = document.createElement("div");
    div.className = `chat-msg ${isUser ? "user" : "bot"}`;
    div.dataset.msgId = msg.id;
    div.innerHTML = `
      <div class="chat-bubble">${escapeHtml(msg.content)}</div>
      <div class="chat-time">${formatChatTime(msg.created_at)}</div>
    `;
    body.appendChild(div);
    added = true;
  });
  if (added) body.scrollTop = body.scrollHeight;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\n/g,"<br>");
}

async function loadUserChatMessages(silent = false) {
  if (!state.token || !elements.chatBody) return;
  try {
    const msgs = await request("/chat/messages", { method: "GET" });
    chatState.messages = msgs;
    renderUserMessages(msgs);

    // Count unread from admin (messages we haven't rendered badge for)
    // After fetch, backend marks them read, so badge resets
    const badge = document.getElementById("chat-unread-badge");
    if (badge) {
      badge.classList.add("hidden");
      badge.textContent = "0";
    }
  } catch (e) {
    if (!silent) {
      const body = elements.chatBody;
      if (body) body.innerHTML = `<div class="chat-empty-state" style="color:var(--danger)">Không thể tải tin nhắn. Vui lòng thử lại.</div>`;
    }
  }
}

async function checkUserUnread() {
  if (!state.token || chatState.isOpen) return;
  try {
    const msgs = await request("/chat/messages", { method: "GET" });
    const unread = msgs.filter(m => m.sender_role === "ADMIN" && !m.is_read).length;
    const badge = document.getElementById("chat-unread-badge");
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  } catch (_) {}
}

function startUserPolling() {
  if (chatState.pollingInterval) return;
  chatState.pollingInterval = setInterval(() => {
    if (chatState.isOpen) {
      loadUserChatMessages(true);
    } else {
      checkUserUnread();
    }
  }, 4000);
}

function stopUserPolling() {
  if (chatState.pollingInterval) {
    clearInterval(chatState.pollingInterval);
    chatState.pollingInterval = null;
  }
}

function initUserChat() {
  const btn = elements.chatWidgetBtn;
  const win = elements.chatWindow;
  const closeBtn = document.getElementById("chat-close-btn");
  const form = elements.chatInputForm;
  const input = elements.chatInputMessage;

  if (!btn || !win) return;

  btn.addEventListener("click", async () => {
    chatState.isOpen = !chatState.isOpen;
    win.classList.toggle("active", chatState.isOpen);
    if (chatState.isOpen) {
      await loadUserChatMessages();
      startUserPolling();
      setTimeout(() => input && input.focus(), 100);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      chatState.isOpen = false;
      win.classList.remove("active");
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      input.value = "";

      // Optimistic render
      const tempId = "temp-" + Date.now();
      const body = elements.chatBody;
      const emptyState = body && body.querySelector(".chat-empty-state");
      if (emptyState) emptyState.remove();
      if (body) {
        const div = document.createElement("div");
        div.className = "chat-msg user sending";
        div.dataset.msgId = tempId;
        div.innerHTML = `<div class="chat-bubble">${escapeHtml(content)}</div><div class="chat-time">Đang gửi...</div>`;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
      }

      try {
        const msg = await request("/chat/send", { method: "POST", body: JSON.stringify({ content }) });
        const tempEl = body && body.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempEl) {
          tempEl.dataset.msgId = msg.id;
          tempEl.classList.remove("sending");
          const timeEl = tempEl.querySelector(".chat-time");
          if (timeEl) timeEl.textContent = formatChatTime(msg.created_at);
        }
      } catch (err) {
        const tempEl = body && body.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempEl) tempEl.classList.add("error");
        setMessage(err.message, "error");
      }
    });
  }

  startUserPolling();
}

// ── ADMIN SIDE ────────────────────────────────────────────────
function renderAdminConversations(conversations) {
  const list = document.getElementById("admin-conv-list");
  if (!list) return;

  const totalUnread = conversations.reduce((s, c) => s + Number(c.unread_count || 0), 0);
  const badge = document.getElementById("admin-unread-total");
  if (badge) {
    if (totalUnread > 0) {
      badge.textContent = totalUnread;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  if (conversations.length === 0) {
    list.innerHTML = `<div class="admin-conv-empty">Chưa có hội thoại nào.</div>`;
    return;
  }

  list.innerHTML = conversations.map(c => {
    const isActive = adminChatState.activeUserId === c.user_id;
    const unread = Number(c.unread_count || 0);
    const initial = (c.full_name || c.username || "?")[0].toUpperCase();
    const lastMsg = c.last_message ? (c.last_message.length > 40 ? c.last_message.slice(0, 40) + "…" : c.last_message) : "";
    const byAdmin = c.last_sender === "ADMIN" ? "Bạn: " : "";
    return `
      <div class="admin-conv-item ${isActive ? "active" : ""} ${unread > 0 ? "has-unread" : ""}"
           data-user-id="${c.user_id}" onclick="openAdminConversation(${c.user_id}, '${escapeHtml(c.full_name || c.username)}', '${escapeHtml(c.username)}')">
        <div class="conv-avatar">${initial}</div>
        <div class="conv-info">
          <div class="conv-name-row">
            <strong>${escapeHtml(c.full_name || c.username)}</strong>
            <span class="conv-time">${formatConvTime(c.last_at)}</span>
          </div>
          <div class="conv-preview">${byAdmin}${escapeHtml(lastMsg)}</div>
        </div>
        ${unread > 0 ? `<span class="conv-unread-badge">${unread}</span>` : ""}
      </div>
    `;
  }).join("");
}

async function loadAdminConversations(silent = false) {
  if (!state.token) return;
  try {
    const convs = await request("/admin/conversations", { method: "GET" });
    adminChatState.conversations = convs;
    renderAdminConversations(convs);
  } catch (e) {
    if (!silent) console.error("Load conversations error:", e);
  }
}

async function openAdminConversation(userId, fullName, username) {
  adminChatState.activeUserId = userId;

  // Update UI selection
  document.querySelectorAll(".admin-conv-item").forEach(el => el.classList.remove("active"));
  const activeItem = document.querySelector(`.admin-conv-item[data-user-id="${userId}"]`);
  if (activeItem) activeItem.classList.add("active");

  // Show chat panel
  const placeholder = document.getElementById("admin-chat-placeholder");
  const activePanel = document.getElementById("admin-chat-active");
  if (placeholder) placeholder.classList.add("hidden");
  if (activePanel) activePanel.classList.remove("hidden");

  // Set header info
  const avatar = document.getElementById("admin-chat-avatar");
  const nameEl = document.getElementById("admin-chat-user-name");
  const subEl = document.getElementById("admin-chat-user-sub");
  if (avatar) avatar.textContent = (fullName || username || "?")[0].toUpperCase();
  if (nameEl) nameEl.textContent = fullName || username;
  if (subEl) subEl.textContent = "@" + username;

  await loadAdminMessages(userId);
}

async function loadAdminMessages(userId, silent = false) {
  if (!state.token) return;
  try {
    const msgs = await request(`/admin/messages/${userId}`, { method: "GET" });
    const container = document.getElementById("admin-chat-messages");
    if (!container) return;

    const renderedIds = new Set([...container.querySelectorAll("[data-msg-id]")].map(el => el.dataset.msgId));
    let added = false;
    msgs.forEach(msg => {
      if (renderedIds.has(String(msg.id))) return;
      const isAdmin = msg.sender_role === "ADMIN";
      const div = document.createElement("div");
      div.className = `chat-msg ${isAdmin ? "user" : "bot"}`;
      div.dataset.msgId = msg.id;
      div.innerHTML = `
        <div class="chat-bubble">${escapeHtml(msg.content)}</div>
        <div class="chat-time">${isAdmin ? "Bạn · " : ""}${formatChatTime(msg.created_at)}</div>
      `;
      container.appendChild(div);
      added = true;
    });
    if (added) container.scrollTop = container.scrollHeight;

    // Reload conversation list to clear unread badge
    if (!silent) loadAdminConversations(true);
  } catch (e) {
    if (!silent) console.error("Load admin messages error:", e);
  }
}

function startAdminPolling() {
  if (adminChatState.pollingInterval) return;
  adminChatState.pollingInterval = setInterval(async () => {
    await loadAdminConversations(true);
    if (adminChatState.activeUserId) {
      await loadAdminMessages(adminChatState.activeUserId, true);
    }
  }, 5000);
}

function initAdminChat() {
  const replyForm = document.getElementById("admin-chat-reply-form");
  const replyInput = document.getElementById("admin-chat-input");

  if (!replyForm) return;

  replyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = adminChatState.activeUserId;
    if (!userId) return;
    const content = replyInput.value.trim();
    if (!content) return;
    replyInput.value = "";

    // Optimistic render
    const container = document.getElementById("admin-chat-messages");
    const tempId = "temp-" + Date.now();
    if (container) {
      const div = document.createElement("div");
      div.className = "chat-msg user sending";
      div.dataset.msgId = tempId;
      div.innerHTML = `<div class="chat-bubble">${escapeHtml(content)}</div><div class="chat-time">Đang gửi...</div>`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }

    try {
      const msg = await request(`/admin/messages/${userId}`, { method: "POST", body: JSON.stringify({ content }) });
      const tempEl = container && container.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl) {
        tempEl.dataset.msgId = msg.id;
        tempEl.classList.remove("sending");
        const timeEl = tempEl.querySelector(".chat-time");
        if (timeEl) timeEl.textContent = "Bạn · " + formatChatTime(msg.created_at);
      }
      loadAdminConversations(true);
    } catch (err) {
      const tempEl = container && container.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl) tempEl.classList.add("error");
    }
  });

  loadAdminConversations();
  startAdminPolling();
}

// Expose to global for inline onclick
window.openAdminConversation = openAdminConversation;


// ----------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------
async function init() {
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

  if (elements.bookingDate) {
    const today = new Date();
    const normalizedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    elements.bookingDate.min = normalizedDate;
    elements.bookingDate.value = normalizedDate;
  }

  if (!window.location.pathname.includes("login.html") && !window.location.pathname.includes("register.html")) {
    await checkAuth();
  }

  const tasks = [];
  if (elements.bookingForm && state.user) {
    renderTimeOptions();
    renderBookingSummary();
    if (elements.customerName && state.user) elements.customerName.value = state.user.full_name || '';
    if (elements.phone && state.user) elements.phone.value = state.user.phone || '';
    tasks.push(loadCourts());
  }

  if (elements.myBookingsTableBody && state.user) {
    tasks.push(loadMyBookings());
  }

  if (elements.bookingsTableBody && state.user?.role === "ADMIN") {
    tasks.push(loadBookings());
  }
  
  if (elements.adminCourtsTableBody && state.user?.role === "ADMIN") {
    tasks.push(loadAdminCourts());
  }

  await Promise.all(tasks);

  // Init chat AFTER auth
  if (state.user?.role === "USER" && elements.chatWidgetBtn) {
    initUserChat();
  }
  if (state.user?.role === "ADMIN" && document.getElementById("admin-chat-reply-form")) {
    initAdminChat();
  }
}

init();
