import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const CONFIG_KEY = "marble_inventory_supabase_config";
const LOW_STOCK_LIMIT = 3;
const CURRENCY = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });
const NUMBER = new Intl.NumberFormat("he-IL");
const DATE = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" });
const TIME = new Intl.DateTimeFormat("he-IL", { timeStyle: "short" });

const sampleImages = [
  "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=900&q=80"
];

const pageTitles = {
  dashboard: "לוח בקרה",
  inventory: "מלאי",
  sales: "מכירות",
  gallery: "גלריה",
  reports: "דוחות",
  settings: "הגדרות"
};

const state = {
  supabase: null,
  user: null,
  profile: null,
  inventory: [],
  sales: [],
  page: "dashboard",
  filters: {
    search: "",
    color: "",
    thickness: "",
    location: "",
    category: "",
    status: ""
  },
  editingId: null,
  stockAction: null,
  stockItemId: null
};

const el = {
  loginView: document.getElementById("login-view"),
  appView: document.getElementById("app-view"),
  loginForm: document.getElementById("login-form"),
  setupPanel: document.getElementById("setup-panel"),
  setupForm: document.getElementById("setup-form"),
  pageTitle: document.getElementById("page-title"),
  userEmail: document.getElementById("user-email"),
  userRoleBadge: document.getElementById("user-role-badge"),
  dashboard: document.getElementById("dashboard-page"),
  inventory: document.getElementById("inventory-page"),
  sales: document.getElementById("sales-page"),
  gallery: document.getElementById("gallery-page"),
  reports: document.getElementById("reports-page"),
  settings: document.getElementById("settings-page"),
  marbleDialog: document.getElementById("marble-dialog"),
  marbleForm: document.getElementById("marble-form"),
  marbleFormTitle: document.getElementById("marble-form-title"),
  stockDialog: document.getElementById("stock-dialog"),
  stockForm: document.getElementById("stock-form"),
  stockTitle: document.getElementById("stock-title"),
  stockCurrent: document.getElementById("stock-current"),
  stockAmount: document.getElementById("stock-amount"),
  customerNameWrap: document.getElementById("customer-name-wrap"),
  customerPhoneWrap: document.getElementById("customer-phone-wrap")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindStaticEvents();
  const config = readConfig();
  if (!config) {
    el.setupPanel.classList.remove("hidden");
    toast("יש להגדיר חיבור Supabase לפני הכניסה למערכת.", "info");
    return;
  }

  connectSupabase(config);
}

function bindStaticEvents() {
  document.getElementById("show-setup").addEventListener("click", () => {
    el.setupPanel.classList.toggle("hidden");
  });

  el.setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const config = {
      url: form.get("supabase-url") || document.getElementById("supabase-url").value.trim(),
      anonKey: form.get("supabase-key") || document.getElementById("supabase-key").value.trim()
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    connectSupabase(config);
    toast("החיבור נשמר. ניתן להתחבר כעת.", "success");
  });

  el.loginForm.addEventListener("submit", signIn);
  document.getElementById("send-reset").addEventListener("click", sendPasswordReset);
  document.getElementById("logout-button").addEventListener("click", signOut);
  document.getElementById("quick-add-button").addEventListener("click", () => openMarbleForm());
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.page));
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });

  el.marbleForm.addEventListener("submit", saveMarble);
  el.stockForm.addEventListener("submit", submitStockAction);
  document.addEventListener("click", handleDocumentClick);
}

function connectSupabase(config) {
  document.getElementById("supabase-url").value = config.url || "";
  document.getElementById("supabase-key").value = config.anonKey || "";
  state.supabase = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  state.supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      state.user = session.user;
      loadApp();
    } else {
      showLogin();
    }
  });

  state.supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      state.user = data.user;
      loadApp();
    }
  });
}

async function signIn(event) {
  event.preventDefault();
  if (!state.supabase) {
    toast("חסר חיבור Supabase.", "error");
    return;
  }

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const { error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) {
    toast("הכניסה נכשלה: " + error.message, "error");
  }
}

async function sendPasswordReset() {
  const email = document.getElementById("login-email").value.trim();
  if (!email || !state.supabase) {
    toast("הזן אימייל ולאחר מכן נסה שוב.", "error");
    return;
  }
  const { error } = await state.supabase.auth.resetPasswordForEmail(email);
  toast(error ? "לא ניתן לשלוח איפוס: " + error.message : "קישור איפוס נשלח לאימייל.", error ? "error" : "success");
}

async function signOut() {
  await state.supabase.auth.signOut();
}

async function loadApp() {
  await Promise.all([loadProfile(), loadInventory(), loadSales()]);
  showApp();
  renderAll();
}

async function loadProfile() {
  const { data, error } = await state.supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error) {
    toast("לא ניתן לטעון הרשאות משתמש: " + error.message, "error");
  }
  state.profile = data || { id: state.user.id, role: "viewer", full_name: "" };
}

async function loadInventory() {
  const { data, error } = await state.supabase
    .from("marble_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    toast("טעינת מלאי נכשלה: " + error.message, "error");
    state.inventory = [];
    return;
  }
  state.inventory = data || [];
}

async function loadSales() {
  const { data, error } = await state.supabase
    .from("sales")
    .select("*")
    .order("sold_at", { ascending: false })
    .limit(500);

  if (error) {
    toast("טעינת מכירות נכשלה: " + error.message, "error");
    state.sales = [];
    return;
  }
  state.sales = data || [];
}

function showLogin() {
  el.loginView.classList.remove("hidden");
  el.appView.classList.add("hidden");
}

function showApp() {
  el.loginView.classList.add("hidden");
  el.appView.classList.remove("hidden");
  el.userEmail.textContent = state.user.email;
  el.userRoleBadge.textContent = isAdmin() ? "Admin" : "Viewer";
  el.userRoleBadge.classList.toggle("admin", isAdmin());
  document.body.classList.toggle("viewer-mode", !isAdmin());
}

function navigate(page) {
  state.page = page;
  document.body.classList.remove("sidebar-open");
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  document.querySelectorAll(".page").forEach((pageEl) => pageEl.classList.remove("active-page"));
  document.getElementById(`${page}-page`).classList.add("active-page");
  el.pageTitle.textContent = pageTitles[page];
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderInventory();
  renderSales();
  renderGallery();
  renderReports();
  renderSettings();
}

function renderDashboard() {
  const stats = getStats();
  el.dashboard.innerHTML = `
    <div class="hero-banner">
      <div>
        <p class="eyebrow">תמונת מצב עסקית</p>
        <h2>ניהול מלאי שיש בזמן אמת</h2>
        <p>מעקב מדויק אחרי לוחות, מכירות, ערך מלאי ופריטים הדורשים טיפול באולם התצוגה.</p>
      </div>
      <button class="primary-btn admin-only" data-action="add-marble" type="button">הוסף סוג שיש</button>
    </div>
    <div class="stats-grid">
      ${statCard("Total marble types", stats.types, "סוגי שיש ואבן")}
      ${statCard("Total slabs in stock", stats.stock, "כמות במלאי")}
      ${statCard("Low stock items", stats.lowStock, "מלאי נמוך")}
      ${statCard("Sold slabs today", stats.soldToday, "נמכר היום")}
      ${statCard("Sold slabs this month", stats.soldMonth, "נמכר החודש")}
      ${statCard("Inventory value", CURRENCY.format(stats.inventoryValue), "ערך מלאי")}
    </div>
    <div class="content-grid">
      <article class="panel">
        <div class="section-heading">
          <h3>פריטים במלאי נמוך</h3>
          <span>${stats.lowStock} פריטים</span>
        </div>
        ${renderLowStockList()}
      </article>
      <article class="panel">
        <div class="section-heading">
          <h3>מכירות אחרונות</h3>
          <span>${state.sales.length} רשומות</span>
        </div>
        ${renderRecentSales()}
      </article>
    </div>
  `;
}

function renderInventory() {
  const filtered = getFilteredInventory();
  el.inventory.innerHTML = `
    <div class="toolbar panel">
      <div class="search-box">
        <label>חיפוש</label>
        <input id="filter-search" value="${escapeAttr(state.filters.search)}" placeholder="חיפוש לפי שם שיש" />
      </div>
      ${filterSelect("filter-category", "קטגוריה", unique("category"), state.filters.category)}
      ${filterSelect("filter-color", "צבע", unique("color"), state.filters.color)}
      ${filterSelect("filter-thickness", "עובי", unique("thickness"), state.filters.thickness)}
      ${filterSelect("filter-location", "מיקום", unique("location"), state.filters.location)}
      <label>
        סטטוס
        <select id="filter-status">
          <option value="">הכל</option>
          <option value="low" ${state.filters.status === "low" ? "selected" : ""}>מלאי נמוך</option>
          <option value="soldout" ${state.filters.status === "soldout" ? "selected" : ""}>אזל מהמלאי</option>
          <option value="stock" ${state.filters.status === "stock" ? "selected" : ""}>במלאי</option>
        </select>
      </label>
      <button class="secondary-btn" data-action="clear-filters" type="button">נקה סינון</button>
      <button class="primary-btn admin-only" data-action="add-marble" type="button">הוסף סוג שיש</button>
    </div>
    <div class="inventory-layout">
      <div class="cards-grid">${filtered.map(renderMarbleCard).join("") || emptyState("לא נמצאו פריטים במלאי")}</div>
      <div class="table-panel panel">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>קטגוריה</th>
                <th>צבע</th>
                <th>עובי</th>
                <th>כמות במלאי</th>
                <th>מיקום</th>
                <th>מחיר</th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>${filtered.map(renderInventoryRow).join("")}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  bindFilterEvents();
}

function renderSales() {
  el.sales.innerHTML = `
    <article class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Sales History</p>
          <h2>היסטוריית מכירות</h2>
        </div>
        <span>${state.sales.length} עסקאות אחרונות</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Marble type</th>
              <th>Quantity sold</th>
              <th>Date</th>
              <th>Time</th>
              <th>Price</th>
              <th>Customer name</th>
              <th>Phone</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${state.sales.map((sale) => `
              <tr>
                <td><strong>${escapeHtml(sale.marble_name || "ללא שם")}</strong></td>
                <td>${NUMBER.format(sale.quantity_sold || 0)}</td>
                <td>${formatDate(sale.sold_at)}</td>
                <td>${formatTime(sale.sold_at)}</td>
                <td>${CURRENCY.format(Number(sale.price || 0))}</td>
                <td>${escapeHtml(sale.customer_name || "-")}</td>
                <td>${escapeHtml(sale.customer_phone || "-")}</td>
                <td>${escapeHtml(sale.notes || "-")}</td>
              </tr>
            `).join("") || `<tr><td colspan="8">${emptyState("עדיין אין מכירות")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderGallery() {
  const filtered = getFilteredInventory();
  el.gallery.innerHTML = `
    <div class="section-heading page-heading">
      <div>
        <p class="eyebrow">Luxury gallery</p>
        <h2>גלריית שיש ואבן</h2>
      </div>
      <button class="primary-btn admin-only" data-action="add-marble" type="button">הוסף סוג שיש</button>
    </div>
    <div class="gallery-grid">
      ${filtered.map((item) => `
        <article class="gallery-card">
          <img src="${escapeAttr(imageFor(item))}" alt="${escapeAttr(item.hebrew_name || item.name)}" loading="lazy" />
          <div class="gallery-content">
            <span class="${statusClass(item)}">${statusText(item)}</span>
            <h3>${escapeHtml(item.hebrew_name || item.name)}</h3>
            <p>${escapeHtml([item.name, item.color, item.thickness].filter(Boolean).join(" · "))}</p>
            <div class="gallery-meta">
              <strong>${NUMBER.format(item.quantity || 0)} זמינים</strong>
              <strong>${CURRENCY.format(Number(item.selling_price || 0))}</strong>
            </div>
            <div class="card-actions">
              <button class="secondary-btn" data-action="details" data-id="${item.id}" type="button">פרטים</button>
              <button class="primary-btn admin-only" data-action="sell" data-id="${item.id}" type="button" ${item.quantity <= 0 ? "disabled" : ""}>מכור לוח</button>
            </div>
          </div>
        </article>
      `).join("") || emptyState("אין תמונות להצגה")}
    </div>
  `;
}

function renderReports() {
  const stats = getStats();
  const mostSold = [...groupSalesByMarble().entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const monthlySales = salesThisMonth();
  el.reports.innerHTML = `
    <div class="stats-grid">
      ${statCard("Current stock value", CURRENCY.format(stats.inventoryValue), "ערך מלאי נוכחי")}
      ${statCard("Monthly sales", CURRENCY.format(monthlySales.value), "מכירות החודש")}
      ${statCard("Sold slabs count", monthlySales.count, "לוחות שנמכרו")}
      ${statCard("Low stock list", stats.lowStock, "פריטים לטיפול")}
    </div>
    <div class="content-grid">
      <article class="panel">
        <div class="section-heading"><h3>Most sold marble types</h3><span>דירוג מכירות</span></div>
        ${mostSold.map(([name, count], index) => `
          <div class="rank-row">
            <span>${index + 1}</span>
            <strong>${escapeHtml(name)}</strong>
            <em>${NUMBER.format(count)} לוחות</em>
          </div>
        `).join("") || emptyState("אין מספיק נתוני מכירה")}
      </article>
      <article class="panel">
        <div class="section-heading"><h3>Low stock list</h3><span>מלאי נמוך</span></div>
        ${renderLowStockList()}
      </article>
    </div>
  `;
}

function renderSettings() {
  el.settings.innerHTML = `
    <article class="panel settings-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Security & database</p>
          <h2>הגדרות</h2>
        </div>
      </div>
      <p>
        המערכת מחוברת ל-Supabase Auth, Postgres ו-Storage. הרשאות עריכה נקבעות לפי
        טבלת <code>profiles</code>: משתמש עם role=<code>admin</code> יכול להוסיף, לערוך,
        למחוק ולמכור; משתמש עם role=<code>viewer</code> יכול לצפות בלבד.
      </p>
      <div class="settings-grid">
        <div><strong>משתמש מחובר</strong><span>${escapeHtml(state.user?.email || "")}</span></div>
        <div><strong>הרשאה</strong><span>${isAdmin() ? "Admin" : "Viewer"}</span></div>
        <div><strong>סוגי שיש</strong><span>${NUMBER.format(state.inventory.length)}</span></div>
        <div><strong>רשומות מכירה</strong><span>${NUMBER.format(state.sales.length)}</span></div>
      </div>
      <button class="secondary-btn" data-action="reset-config" type="button">החלף חיבור Supabase</button>
    </article>
  `;
}

function renderMarbleCard(item) {
  return `
    <article class="marble-card">
      <img src="${escapeAttr(imageFor(item))}" alt="${escapeAttr(item.hebrew_name || item.name)}" loading="lazy" />
      <div class="marble-card-body">
        <div class="card-title-line">
          <div>
            <h3>${escapeHtml(item.hebrew_name || item.name)}</h3>
            <p>${escapeHtml(item.name || "")}</p>
          </div>
          <span class="${statusClass(item)}">${statusText(item)}</span>
        </div>
        <dl>
          <div><dt>קטגוריה</dt><dd>${escapeHtml(item.category || "-")}</dd></div>
          <div><dt>צבע</dt><dd>${escapeHtml(item.color || "-")}</dd></div>
          <div><dt>עובי</dt><dd>${escapeHtml(item.thickness || "-")}</dd></div>
          <div><dt>גודל</dt><dd>${escapeHtml(item.slab_size || "-")}</dd></div>
          <div><dt>כמות במלאי</dt><dd>${NUMBER.format(item.quantity || 0)}</dd></div>
          <div><dt>מיקום</dt><dd>${escapeHtml(item.location || "-")}</dd></div>
        </dl>
        <p class="notes">${escapeHtml(item.notes || "אין הערות")}</p>
        <div class="card-actions">
          <button class="primary-btn admin-only" data-action="sell" data-id="${item.id}" type="button" ${item.quantity <= 0 ? "disabled" : ""}>מכור לוח</button>
          <button class="secondary-btn admin-only" data-action="add-stock" data-id="${item.id}" type="button">הוסף מלאי</button>
          <button class="secondary-btn admin-only" data-action="remove-stock" data-id="${item.id}" type="button">הפחת מלאי</button>
          <button class="ghost-btn admin-only" data-action="edit" data-id="${item.id}" type="button">ערוך</button>
        </div>
      </div>
    </article>
  `;
}

function renderInventoryRow(item) {
  return `
    <tr>
      <td><strong>${escapeHtml(item.hebrew_name || item.name)}</strong><small>${escapeHtml(item.name || "")}</small></td>
      <td>${escapeHtml(item.category || "-")}</td>
      <td>${escapeHtml(item.color || "-")}</td>
      <td>${escapeHtml(item.thickness || "-")}</td>
      <td>${NUMBER.format(item.quantity || 0)}</td>
      <td>${escapeHtml(item.location || "-")}</td>
      <td>${CURRENCY.format(Number(item.selling_price || 0))}</td>
      <td><span class="${statusClass(item)}">${statusText(item)}</span></td>
      <td class="row-actions">
        <button class="primary-btn admin-only" data-action="sell" data-id="${item.id}" type="button" ${item.quantity <= 0 ? "disabled" : ""}>מכור לוח</button>
        <button class="secondary-btn admin-only" data-action="manual-stock" data-id="${item.id}" type="button">ערוך כמות</button>
        <button class="ghost-btn admin-only" data-action="edit" data-id="${item.id}" type="button">ערוך</button>
        <button class="danger-btn admin-only" data-action="delete" data-id="${item.id}" type="button">מחק</button>
      </td>
    </tr>
  `;
}

function handleDocumentClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;

  if (["add-marble", "edit", "delete", "sell", "add-stock", "remove-stock", "manual-stock"].includes(action) && !isAdmin()) {
    toast("אין לך הרשאה לבצע פעולה זו.", "error");
    return;
  }

  if (action === "add-marble") openMarbleForm();
  if (action === "edit") openMarbleForm(id);
  if (action === "delete") deleteMarble(id);
  if (action === "sell") openStockDialog(id, "sell");
  if (action === "add-stock") openStockDialog(id, "add");
  if (action === "remove-stock") openStockDialog(id, "remove");
  if (action === "manual-stock") openStockDialog(id, "manual");
  if (action === "details") {
    navigate("inventory");
    document.getElementById("filter-search").value = inventoryById(id)?.hebrew_name || "";
    state.filters.search = document.getElementById("filter-search").value;
    renderInventory();
  }
  if (action === "clear-filters") {
    state.filters = { search: "", color: "", thickness: "", location: "", category: "", status: "" };
    renderInventory();
  }
  if (action === "reset-config") {
    localStorage.removeItem(CONFIG_KEY);
    toast("החיבור נמחק מהמכשיר. התחבר מחדש לאחר הזנת פרטי Supabase.", "info");
    signOut();
    el.setupPanel.classList.remove("hidden");
  }
}

function openMarbleForm(id = null) {
  state.editingId = id;
  el.marbleForm.reset();
  el.marbleFormTitle.textContent = id ? "עריכת סוג שיש" : "הוסף סוג שיש";
  const item = id ? inventoryById(id) : null;
  if (item) {
    Object.entries(item).forEach(([key, value]) => {
      if (el.marbleForm.elements[key] && key !== "image_file") {
        el.marbleForm.elements[key].value = value ?? "";
      }
    });
  }
  el.marbleDialog.showModal();
}

async function saveMarble(event) {
  event.preventDefault();
  if (!isAdmin()) return;
  const form = new FormData(el.marbleForm);
  const item = {
    name: text(form, "name"),
    hebrew_name: text(form, "hebrew_name"),
    category: text(form, "category"),
    color: text(form, "color"),
    thickness: text(form, "thickness"),
    slab_size: text(form, "slab_size"),
    quantity: Math.max(0, Number(form.get("quantity") || 0)),
    location: text(form, "location"),
    image_url: text(form, "image_url"),
    cost_price: numberOrNull(form.get("cost_price")),
    selling_price: numberOrNull(form.get("selling_price")),
    notes: text(form, "notes"),
    updated_at: new Date().toISOString()
  };

  const file = form.get("image_file");
  if (file && file.size) {
    const uploaded = await uploadImage(file);
    if (uploaded) item.image_url = uploaded;
  }

  let response;
  if (state.editingId) {
    response = await state.supabase.from("marble_items").update(item).eq("id", state.editingId);
  } else {
    response = await state.supabase.from("marble_items").insert({ ...item, created_by: state.user.id });
  }

  if (response.error) {
    toast("שמירת הפריט נכשלה: " + response.error.message, "error");
    return;
  }

  el.marbleDialog.close();
  await loadInventory();
  renderAll();
  toast("הפריט נשמר בהצלחה.", "success");
}

async function uploadImage(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${state.user.id}/${Date.now()}-${safeName}`;
  const { error } = await state.supabase.storage.from("marble-images").upload(path, file, { upsert: true });
  if (error) {
    toast("העלאת התמונה נכשלה: " + error.message, "error");
    return "";
  }
  const { data } = state.supabase.storage.from("marble-images").getPublicUrl(path);
  return data.publicUrl;
}

async function deleteMarble(id) {
  const item = inventoryById(id);
  if (!item || !confirm(`למחוק את ${item.hebrew_name || item.name}?`)) return;
  const { error } = await state.supabase.from("marble_items").delete().eq("id", id);
  if (error) {
    toast("מחיקה נכשלה: " + error.message, "error");
    return;
  }
  await loadInventory();
  renderAll();
  toast("הפריט נמחק.", "success");
}

function openStockDialog(id, action) {
  const item = inventoryById(id);
  if (!item) return;
  state.stockItemId = id;
  state.stockAction = action;
  el.stockForm.reset();
  el.stockCurrent.textContent = `${item.hebrew_name || item.name} · כמות נוכחית: ${NUMBER.format(item.quantity || 0)}`;
  el.customerNameWrap.classList.toggle("hidden", action !== "sell");
  el.customerPhoneWrap.classList.toggle("hidden", action !== "sell");
  el.stockAmount.min = action === "manual" ? "0" : "1";
  el.stockAmount.value = action === "sell" ? "1" : "";
  el.stockTitle.textContent = {
    sell: "מכור לוח",
    add: "הוסף מלאי",
    remove: "הפחת מלאי",
    manual: "ערוך כמות ידנית"
  }[action];
  el.stockDialog.showModal();
}

async function submitStockAction(event) {
  event.preventDefault();
  const form = new FormData(el.stockForm);
  const amount = Number(form.get("amount") || 0);
  if (!Number.isInteger(amount) || amount < 0 || (state.stockAction !== "manual" && amount < 1)) {
    toast("יש להזין כמות תקינה.", "error");
    return;
  }

  const item = inventoryById(state.stockItemId);
  if (!item) return;

  if (state.stockAction === "sell") {
    await sellSlab(item, amount, {
      customer_name: text(form, "customer_name"),
      customer_phone: text(form, "customer_phone"),
      notes: text(form, "notes")
    });
  } else {
    await updateStock(item, amount, state.stockAction, text(form, "notes"));
  }
}

async function sellSlab(item, amount, saleDetails) {
  if (item.quantity < amount) {
    toast("לא ניתן למכור יותר מהכמות הקיימת במלאי.", "error");
    return;
  }

  const rpc = await state.supabase.rpc("sell_slab", {
    p_marble_id: item.id,
    p_quantity: amount,
    p_customer_name: saleDetails.customer_name || null,
    p_customer_phone: saleDetails.customer_phone || null,
    p_notes: saleDetails.notes || null
  });

  if (rpc.error && !/sell_slab/i.test(rpc.error.message || "")) {
    toast("המכירה נכשלה: " + rpc.error.message, "error");
    return;
  }

  if (rpc.error) {
    const updated = await optimisticStockUpdate(item, item.quantity - amount);
    if (!updated) return;
    const { error } = await state.supabase.from("sales").insert({
      marble_id: item.id,
      marble_name: item.hebrew_name || item.name,
      quantity_sold: amount,
      price: Number(item.selling_price || 0) * amount,
      customer_name: saleDetails.customer_name || null,
      customer_phone: saleDetails.customer_phone || null,
      notes: saleDetails.notes || null,
      created_by: state.user.id
    });
    if (error) {
      toast("המלאי עודכן אך שמירת המכירה נכשלה: " + error.message, "error");
    }
  }

  el.stockDialog.close();
  await Promise.all([loadInventory(), loadSales()]);
  renderAll();
  toast(`נמכרו ${NUMBER.format(amount)} לוחות. המלאי עודכן אוטומטית.`, "success");
}

async function updateStock(item, amount, action, notes) {
  let nextQuantity = item.quantity || 0;
  if (action === "add") nextQuantity += amount;
  if (action === "remove") nextQuantity -= amount;
  if (action === "manual") nextQuantity = amount;

  if (nextQuantity < 0) {
    toast("לא ניתן להוריד מלאי מתחת לאפס.", "error");
    return;
  }

  const { error } = await state.supabase.from("marble_items").update({
    quantity: nextQuantity,
    notes: notes ? `${item.notes || ""}\n${new Date().toLocaleString("he-IL")}: ${notes}`.trim() : item.notes,
    updated_at: new Date().toISOString()
  }).eq("id", item.id);

  if (error) {
    toast("עדכון מלאי נכשל: " + error.message, "error");
    return;
  }

  el.stockDialog.close();
  await loadInventory();
  renderAll();
  toast("המלאי עודכן בהצלחה.", "success");
}

async function optimisticStockUpdate(item, nextQuantity) {
  const { data, error } = await state.supabase
    .from("marble_items")
    .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("quantity", item.quantity)
    .select("id");

  if (error || !data?.length) {
    toast("המלאי השתנה במקביל. רענן ונסה שוב.", "error");
    await loadInventory();
    renderAll();
    return false;
  }
  return true;
}

function bindFilterEvents() {
  const map = {
    "filter-search": "search",
    "filter-category": "category",
    "filter-color": "color",
    "filter-thickness": "thickness",
    "filter-location": "location",
    "filter-status": "status"
  };
  Object.entries(map).forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("input", () => {
        state.filters[key] = input.value;
        renderInventory();
      });
    }
  });
}

function getFilteredInventory() {
  return state.inventory.filter((item) => {
    const haystack = `${item.name || ""} ${item.hebrew_name || ""}`.toLowerCase();
    const search = state.filters.search.trim().toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (state.filters.category && item.category !== state.filters.category) return false;
    if (state.filters.color && item.color !== state.filters.color) return false;
    if (state.filters.thickness && item.thickness !== state.filters.thickness) return false;
    if (state.filters.location && item.location !== state.filters.location) return false;
    if (state.filters.status === "low" && !(item.quantity > 0 && item.quantity < LOW_STOCK_LIMIT)) return false;
    if (state.filters.status === "soldout" && item.quantity !== 0) return false;
    if (state.filters.status === "stock" && item.quantity >= LOW_STOCK_LIMIT) return true;
    if (state.filters.status === "stock") return false;
    return true;
  });
}

function getStats() {
  const today = new Date().toDateString();
  const now = new Date();
  return {
    types: state.inventory.length,
    stock: state.inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    lowStock: state.inventory.filter((item) => item.quantity > 0 && item.quantity < LOW_STOCK_LIMIT).length,
    soldToday: state.sales.filter((sale) => new Date(sale.sold_at).toDateString() === today).reduce((sum, sale) => sum + Number(sale.quantity_sold || 0), 0),
    soldMonth: state.sales.filter((sale) => {
      const date = new Date(sale.sold_at);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, sale) => sum + Number(sale.quantity_sold || 0), 0),
    inventoryValue: state.inventory.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.selling_price || 0), 0)
  };
}

function salesThisMonth() {
  const now = new Date();
  return state.sales.reduce((acc, sale) => {
    const date = new Date(sale.sold_at);
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      acc.count += Number(sale.quantity_sold || 0);
      acc.value += Number(sale.price || 0);
    }
    return acc;
  }, { count: 0, value: 0 });
}

function groupSalesByMarble() {
  return state.sales.reduce((map, sale) => {
    const name = sale.marble_name || "ללא שם";
    map.set(name, (map.get(name) || 0) + Number(sale.quantity_sold || 0));
    return map;
  }, new Map());
}

function renderLowStockList() {
  const items = state.inventory.filter((item) => item.quantity < LOW_STOCK_LIMIT);
  return items.map((item) => `
    <div class="mini-row">
      <span class="${statusClass(item)}">${statusText(item)}</span>
      <strong>${escapeHtml(item.hebrew_name || item.name)}</strong>
      <em>${NUMBER.format(item.quantity || 0)} לוחות</em>
    </div>
  `).join("") || emptyState("אין פריטים במלאי נמוך");
}

function renderRecentSales() {
  return state.sales.slice(0, 6).map((sale) => `
    <div class="mini-row">
      <span>נמכר</span>
      <strong>${escapeHtml(sale.marble_name || "ללא שם")}</strong>
      <em>${NUMBER.format(sale.quantity_sold || 0)} · ${formatDate(sale.sold_at)}</em>
    </div>
  `).join("") || emptyState("אין מכירות להצגה");
}

function statCard(label, value, hebrew) {
  return `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <em>${hebrew}</em>
    </article>
  `;
}

function filterSelect(id, label, options, value) {
  return `
    <label>
      ${label}
      <select id="${id}">
        <option value="">הכל</option>
        ${options.map((option) => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function unique(key) {
  return [...new Set(state.inventory.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
}

function statusText(item) {
  if ((item.quantity || 0) <= 0) return "אזל מהמלאי";
  if (item.quantity < LOW_STOCK_LIMIT) return "מלאי נמוך";
  return "במלאי";
}

function statusClass(item) {
  if ((item.quantity || 0) <= 0) return "status sold-out";
  if (item.quantity < LOW_STOCK_LIMIT) return "status low-stock";
  return "status in-stock";
}

function imageFor(item) {
  return item.image_url || sampleImages[Math.abs(hashCode(item.name || item.id || "")) % sampleImages.length];
}

function inventoryById(id) {
  return state.inventory.find((item) => item.id === id);
}

function isAdmin() {
  return state.profile?.role === "admin";
}

function readConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY));
  } catch {
    return null;
  }
}

function text(form, key) {
  return String(form.get(key) || "").trim();
}

function numberOrNull(value) {
  return value === null || value === "" ? null : Number(value);
}

function formatDate(value) {
  return value ? DATE.format(new Date(value)) : "-";
}

function formatTime(value) {
  return value ? TIME.format(new Date(value)) : "-";
}

function emptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}

function toast(message, type = "info") {
  const region = document.getElementById("toast-region");
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  region.appendChild(node);
  setTimeout(() => node.remove(), 5200);
}

function hashCode(value) {
  return value.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[match]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
