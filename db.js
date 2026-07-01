const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "data", "marble-inventory.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marbles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hebrew_name TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    thickness TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    location TEXT NOT NULL,
    image_path TEXT,
    cost_price REAL,
    selling_price REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marble_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL,
    total_price REAL,
    customer_name TEXT,
    customer_phone TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (marble_id) REFERENCES marbles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marble_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('add', 'remove', 'sell', 'manual_edit')),
    quantity_delta INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (marble_id) REFERENCES marbles(id) ON DELETE CASCADE
  );
`);

seedUsers();
seedSampleMarbles();

function seedUsers() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (count > 0) {
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES (@username, @password_hash, @full_name, @role)
  `);

  insertUser.run({
    username: "admin",
    password_hash: bcrypt.hashSync("Admin123!"),
    full_name: "בעל העסק",
    role: "admin"
  });

  insertUser.run({
    username: "viewer",
    password_hash: bcrypt.hashSync("Viewer123!"),
    full_name: "צופה מלאי",
    role: "viewer"
  });
}

function seedSampleMarbles() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM marbles").get().count;
  if (count > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO marbles
    (name, hebrew_name, category, color, thickness, size, quantity, location, cost_price, selling_price, notes)
    VALUES
    (@name, @hebrew_name, @category, @color, @thickness, @size, @quantity, @location, @cost_price, @selling_price, @notes)
  `);

  const samples = [
    {
      name: "Calacatta Gold",
      hebrew_name: "קליקטה גולד",
      category: "שיש טבעי",
      color: "לבן-זהב",
      thickness: "2 ס״מ",
      size: "320x160",
      quantity: 8,
      location: "אולם תצוגה A",
      cost_price: 1200,
      selling_price: 1850,
      notes: "מרקם ורידים זהובים עדינים"
    },
    {
      name: "Nero Marquina",
      hebrew_name: "נרו מרקינה",
      category: "שיש טבעי",
      color: "שחור",
      thickness: "2 ס״מ",
      size: "300x150",
      quantity: 2,
      location: "מחסן 1",
      cost_price: 980,
      selling_price: 1520,
      notes: "מתאים למטבחים יוקרתיים"
    },
    {
      name: "Taj Mahal Quartzite",
      hebrew_name: "טאג׳ מהאל קוורציט",
      category: "קוורציט",
      color: "בז׳",
      thickness: "3 ס״מ",
      size: "320x170",
      quantity: 0,
      location: "מחסן 2",
      cost_price: 1450,
      selling_price: 2150,
      notes: "אזל, בהזמנה חוזרת"
    }
  ];

  const transaction = db.transaction(() => {
    for (const sample of samples) {
      insert.run(sample);
    }
  });
  transaction();
}

function getStatus(quantity) {
  if (quantity <= 0) {
    return "sold_out";
  }
  if (quantity < 3) {
    return "low_stock";
  }
  return "in_stock";
}

function withStatus(row) {
  if (!row) return row;
  return { ...row, status: getStatus(row.quantity) };
}

function listMarbles(filters = {}) {
  const where = [];
  const params = {};

  if (filters.search) {
    where.push("(name LIKE @search OR hebrew_name LIKE @search)");
    params.search = `%${filters.search}%`;
  }
  if (filters.color) {
    where.push("color = @color");
    params.color = filters.color;
  }
  if (filters.thickness) {
    where.push("thickness = @thickness");
    params.thickness = filters.thickness;
  }
  if (filters.location) {
    where.push("location = @location");
    params.location = filters.location;
  }
  if (filters.category) {
    where.push("category = @category");
    params.category = filters.category;
  }
  if (filters.stockState === "low") {
    where.push("quantity > 0 AND quantity < 3");
  } else if (filters.stockState === "sold_out") {
    where.push("quantity = 0");
  }

  const query = `
    SELECT *
    FROM marbles
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY updated_at DESC, id DESC
  `;
  return db.prepare(query).all(params).map(withStatus);
}

function getFilterOptions() {
  const getDistinct = (column) => {
    return db
      .prepare(`SELECT DISTINCT ${column} AS value FROM marbles WHERE ${column} <> '' ORDER BY ${column}`)
      .all()
      .map((row) => row.value);
  };

  return {
    colors: getDistinct("color"),
    thicknesses: getDistinct("thickness"),
    locations: getDistinct("location"),
    categories: getDistinct("category")
  };
}

function getMarbleById(id) {
  const row = db.prepare("SELECT * FROM marbles WHERE id = ?").get(id);
  return withStatus(row);
}

function createMarble(input) {
  const stmt = db.prepare(`
    INSERT INTO marbles
      (name, hebrew_name, category, color, thickness, size, quantity, location, image_path, cost_price, selling_price, notes, updated_at)
    VALUES
      (@name, @hebrew_name, @category, @color, @thickness, @size, @quantity, @location, @image_path, @cost_price, @selling_price, @notes, datetime('now'))
  `);
  const result = stmt.run(input);
  return getMarbleById(result.lastInsertRowid);
}

function updateMarble(id, input) {
  const stmt = db.prepare(`
    UPDATE marbles
    SET
      name = @name,
      hebrew_name = @hebrew_name,
      category = @category,
      color = @color,
      thickness = @thickness,
      size = @size,
      quantity = @quantity,
      location = @location,
      image_path = @image_path,
      cost_price = @cost_price,
      selling_price = @selling_price,
      notes = @notes,
      updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({ id, ...input });
  return getMarbleById(id);
}

function deleteMarble(id) {
  return db.prepare("DELETE FROM marbles WHERE id = ?").run(id);
}

function addStockMovement(marbleId, movementType, quantityDelta, note = "") {
  db.prepare(`
    INSERT INTO stock_movements (marble_id, movement_type, quantity_delta, note)
    VALUES (?, ?, ?, ?)
  `).run(marbleId, movementType, quantityDelta, note || null);
}

function adjustStock(marbleId, amount, movementType, note = "") {
  const marble = getMarbleById(marbleId);
  if (!marble) {
    throw new Error("סוג השיש לא נמצא");
  }
  const nextQty = marble.quantity + amount;
  if (nextQty < 0) {
    throw new Error("לא ניתן להפחית מתחת לאפס");
  }

  const transaction = db.transaction(() => {
    db.prepare("UPDATE marbles SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(nextQty, marbleId);
    addStockMovement(marbleId, movementType, amount, note);
  });
  transaction();
  return getMarbleById(marbleId);
}

function setStockQuantity(marbleId, quantity, note = "") {
  const marble = getMarbleById(marbleId);
  if (!marble) throw new Error("סוג השיש לא נמצא");
  if (quantity < 0) throw new Error("כמות לא יכולה להיות שלילית");
  const delta = quantity - marble.quantity;

  const transaction = db.transaction(() => {
    db.prepare("UPDATE marbles SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(quantity, marbleId);
    addStockMovement(marbleId, "manual_edit", delta, note);
  });
  transaction();
  return getMarbleById(marbleId);
}

function createSale({
  marbleId,
  quantity = 1,
  customerName = "",
  customerPhone = "",
  notes = "",
  unitPrice = null
}) {
  const marble = getMarbleById(marbleId);
  if (!marble) {
    throw new Error("סוג השיש לא נמצא");
  }
  if (quantity <= 0) {
    throw new Error("כמות מכירה חייבת להיות חיובית");
  }
  if (marble.quantity < quantity) {
    throw new Error("אין מספיק מלאי למכירה");
  }

  const resolvedUnitPrice = unitPrice !== null && unitPrice !== undefined && unitPrice !== ""
    ? Number(unitPrice)
    : Number(marble.selling_price || 0);
  const totalPrice = Number((resolvedUnitPrice * quantity).toFixed(2));

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO sales (marble_id, quantity, unit_price, total_price, customer_name, customer_phone, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      marbleId,
      quantity,
      resolvedUnitPrice,
      totalPrice,
      customerName || null,
      customerPhone || null,
      notes || null
    );
    db.prepare("UPDATE marbles SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(quantity, marbleId);
    addStockMovement(marbleId, "sell", -quantity, notes);
  });
  transaction();
}

function listSales() {
  return db.prepare(`
    SELECT
      sales.*,
      marbles.name AS marble_name,
      marbles.hebrew_name AS marble_hebrew_name
    FROM sales
    JOIN marbles ON marbles.id = sales.marble_id
    ORDER BY sales.created_at DESC, sales.id DESC
  `).all();
}

function dashboardStats() {
  const summary = db.prepare(`
    SELECT
      COUNT(*) AS total_types,
      COALESCE(SUM(quantity), 0) AS total_slabs,
      COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0) AS stock_cost_value,
      COALESCE(SUM(quantity * COALESCE(selling_price, 0)), 0) AS stock_sale_value
    FROM marbles
  `).get();

  const lowStockItems = db.prepare("SELECT COUNT(*) AS count FROM marbles WHERE quantity > 0 AND quantity < 3").get().count;

  const soldToday = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) AS sold_today
    FROM sales
    WHERE date(created_at, 'localtime') = date('now', 'localtime')
  `).get().sold_today;

  const soldMonth = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) AS sold_month
    FROM sales
    WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
  `).get().sold_month;

  return {
    ...summary,
    low_stock_items: lowStockItems,
    sold_today: soldToday,
    sold_month: soldMonth
  };
}

function reportsData() {
  const topSold = db.prepare(`
    SELECT
      marbles.id,
      marbles.name,
      marbles.hebrew_name,
      COALESCE(SUM(sales.quantity), 0) AS total_sold
    FROM marbles
    LEFT JOIN sales ON sales.marble_id = marbles.id
    GROUP BY marbles.id
    ORDER BY total_sold DESC, marbles.name ASC
    LIMIT 8
  `).all();

  const lowStock = db.prepare(`
    SELECT id, name, hebrew_name, quantity, location
    FROM marbles
    WHERE quantity < 3
    ORDER BY quantity ASC, updated_at DESC
  `).all().map(withStatus);

  const monthlySales = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at, 'localtime') AS month,
      COALESCE(SUM(quantity), 0) AS sold_slabs,
      COALESCE(SUM(total_price), 0) AS revenue
    FROM sales
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all();

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(quantity), 0) AS sold_slabs_total,
      COALESCE(SUM(total_price), 0) AS total_revenue
    FROM sales
  `).get();

  const stockValue = db.prepare(`
    SELECT
      COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0) AS current_stock_cost,
      COALESCE(SUM(quantity * COALESCE(selling_price, 0)), 0) AS current_stock_sale
    FROM marbles
  `).get();

  return { topSold, lowStock, monthlySales, totals, stockValue };
}

function authenticate(username, password) {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return null;
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
}

module.exports = {
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
};
