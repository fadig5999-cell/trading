const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const dayjs = require("dayjs");
const localeHe = require("dayjs/locale/he");
const {
  listMarbles,
  getFilterOptions,
  getMarbleById,
  createMarble,
  updateMarble,
  deleteMarble,
  adjustStock,
  setStockQuantity,
  createSale,
  listSales,
  dashboardStats,
  reportsData,
  authenticate
} = require("./db");

dayjs.locale(localeHe);

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname}`.replace(/[^\w.-]/g, "_");
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "marble-showroom-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" }
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.message = req.session.message || null;
  res.locals.error = req.session.error || null;
  req.session.message = null;
  req.session.error = null;
  res.locals.path = req.path;
  res.locals.currency = "₪";
  res.locals.dayjs = dayjs;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role !== "admin") {
    req.session.error = "למשתמש צופה אין הרשאה לבצע פעולה זו.";
    return res.redirect("/inventory");
  }
  return next();
}

function parseMoney(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function mapMarbleForm(body, imagePath) {
  const source = body || {};
  return {
    name: (source.name || "").trim(),
    hebrew_name: (source.hebrew_name || "").trim(),
    category: (source.category || "").trim(),
    color: (source.color || "").trim(),
    thickness: (source.thickness || "").trim(),
    size: (source.size || "").trim(),
    quantity: parseNonNegativeInt(source.quantity, 0),
    location: (source.location || "").trim(),
    image_path: imagePath || null,
    cost_price: parseMoney(source.cost_price),
    selling_price: parseMoney(source.selling_price),
    notes: (source.notes || "").trim()
  };
}

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  return res.render("login", { title: "התחברות למערכת" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = authenticate(username, password);
  if (!user) {
    req.session.error = "שם משתמש או סיסמה שגויים.";
    return res.redirect("/login");
  }
  req.session.user = user;
  req.session.message = `ברוך הבא, ${user.full_name}`;
  return res.redirect("/");
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/", requireAuth, (req, res) => {
  const stats = dashboardStats();
  const marbles = listMarbles().slice(0, 6);
  res.render("dashboard", {
    title: "לוח בקרה",
    stats,
    marbles
  });
});

app.get("/inventory", requireAuth, (req, res) => {
  const filters = {
    search: (req.query.search || "").trim(),
    color: (req.query.color || "").trim(),
    thickness: (req.query.thickness || "").trim(),
    location: (req.query.location || "").trim(),
    category: (req.query.category || "").trim(),
    stockState: (req.query.stockState || "").trim()
  };
  const items = listMarbles(filters);
  const options = getFilterOptions();
  res.render("inventory", {
    title: "מלאי",
    items,
    filters,
    options
  });
});

app.get("/inventory/new", requireAuth, requireAdmin, (_req, res) => {
  res.render("marble-form", {
    title: "הוסף סוג שיש",
    marble: null,
    formAction: "/inventory/new"
  });
});

app.post("/inventory/new", requireAuth, requireAdmin, upload.single("image"), (req, res) => {
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  const payload = mapMarbleForm(req.body, imagePath);
  if (!payload.name || !payload.hebrew_name) {
    req.session.error = "יש להזין שם שיש ושם בעברית.";
    return res.redirect("/inventory/new");
  }
  createMarble(payload);
  req.session.message = "סוג שיש חדש נוסף בהצלחה.";
  return res.redirect("/inventory");
});

app.get("/inventory/:id/edit", requireAuth, requireAdmin, (req, res) => {
  const marble = getMarbleById(req.params.id);
  if (!marble) {
    req.session.error = "הפריט לא נמצא.";
    return res.redirect("/inventory");
  }
  return res.render("marble-form", {
    title: "עריכת סוג שיש",
    marble,
    formAction: `/inventory/${marble.id}/edit`
  });
});

app.post("/inventory/:id/edit", requireAuth, requireAdmin, upload.single("image"), (req, res) => {
  const marble = getMarbleById(req.params.id);
  if (!marble) {
    req.session.error = "הפריט לא נמצא.";
    return res.redirect("/inventory");
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : marble.image_path;
  const payload = mapMarbleForm(req.body, imagePath);
  updateMarble(marble.id, payload);
  req.session.message = "הפריט עודכן בהצלחה.";
  return res.redirect("/inventory");
});

app.post("/inventory/:id/delete", requireAuth, requireAdmin, (req, res) => {
  deleteMarble(req.params.id);
  req.session.message = "הפריט נמחק מהמלאי.";
  return res.redirect("/inventory");
});

app.post("/inventory/:id/stock/add", requireAuth, requireAdmin, (req, res) => {
  try {
    const amount = parseNonNegativeInt(req.body.amount, 0);
    if (amount <= 0) throw new Error("יש להזין כמות חיובית להוספה");
    adjustStock(req.params.id, amount, "add", "הוספת מלאי");
    req.session.message = "המלאי עודכן בהצלחה.";
  } catch (error) {
    req.session.error = error.message;
  }
  return res.redirect("/inventory");
});

app.post("/inventory/:id/stock/remove", requireAuth, requireAdmin, (req, res) => {
  try {
    const amount = parseNonNegativeInt(req.body.amount, 0);
    if (amount <= 0) throw new Error("יש להזין כמות חיובית להפחתה");
    adjustStock(req.params.id, -amount, "remove", "הפחתת מלאי");
    req.session.message = "המלאי הופחת בהצלחה.";
  } catch (error) {
    req.session.error = error.message;
  }
  return res.redirect("/inventory");
});

app.post("/inventory/:id/stock/set", requireAuth, requireAdmin, (req, res) => {
  try {
    const quantity = parseNonNegativeInt(req.body.quantity, -1);
    if (quantity < 0) throw new Error("כמות לא תקינה");
    setStockQuantity(req.params.id, quantity, "עריכה ידנית של כמות");
    req.session.message = "כמות המלאי עודכנה ידנית.";
  } catch (error) {
    req.session.error = error.message;
  }
  return res.redirect("/inventory");
});

app.post("/inventory/:id/sell-one", requireAuth, requireAdmin, (req, res) => {
  try {
    const body = req.body || {};
    createSale({
      marbleId: Number(req.params.id),
      quantity: 1,
      customerName: (body.customer_name || "").trim(),
      customerPhone: (body.customer_phone || "").trim(),
      notes: (body.notes || "").trim(),
      unitPrice: parseMoney(body.unit_price)
    });
    req.session.message = "נמכר לוח אחד והמלאי עודכן אוטומטית.";
  } catch (error) {
    req.session.error = error.message;
  }
  return res.redirect(req.headers.referer || "/inventory");
});

app.get("/sales", requireAuth, (req, res) => {
  const sales = listSales();
  const marbles = listMarbles();
  res.render("sales", {
    title: "מכירות",
    sales,
    marbles
  });
});

app.post("/sales/new", requireAuth, requireAdmin, (req, res) => {
  try {
    createSale({
      marbleId: Number(req.body.marble_id),
      quantity: parseNonNegativeInt(req.body.quantity, 1),
      customerName: (req.body.customer_name || "").trim(),
      customerPhone: (req.body.customer_phone || "").trim(),
      notes: (req.body.notes || "").trim(),
      unitPrice: parseMoney(req.body.unit_price)
    });
    req.session.message = "המכירה נשמרה בהצלחה.";
  } catch (error) {
    req.session.error = error.message;
  }
  return res.redirect("/sales");
});

app.get("/gallery", requireAuth, (req, res) => {
  const items = listMarbles();
  res.render("gallery", {
    title: "גלריה",
    items
  });
});

app.get("/reports", requireAuth, (req, res) => {
  const report = reportsData();
  res.render("reports", {
    title: "דוחות",
    report
  });
});

app.get("/settings", requireAuth, (_req, res) => {
  res.render("settings", {
    title: "הגדרות",
    credentials: [
      { role: "מנהל", username: "admin", password: "Admin123!" },
      { role: "צופה", username: "viewer", password: "Viewer123!" }
    ]
  });
});

app.use((_req, res) => {
  res.status(404).render("not-found", { title: "העמוד לא נמצא" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Marble inventory app listening on http://localhost:${PORT}`);
});
