import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { decorateMarble, lowStockThreshold, toNumber, stockStatus } from '../helpers.js';

const router = Router();

const FIELDS = [
  'name', 'name_he', 'category', 'color', 'thickness', 'size',
  'quantity', 'location', 'image', 'cost_price', 'selling_price', 'notes'
];

function normalizeBody(body = {}) {
  return {
    name: String(body.name ?? '').trim(),
    name_he: String(body.name_he ?? '').trim(),
    category: String(body.category ?? '').trim(),
    color: String(body.color ?? '').trim(),
    thickness: String(body.thickness ?? '').trim(),
    size: String(body.size ?? '').trim(),
    quantity: Math.max(0, Math.round(toNumber(body.quantity, 0))),
    location: String(body.location ?? '').trim(),
    image: String(body.image ?? '').trim(),
    cost_price: Math.max(0, toNumber(body.cost_price, 0)),
    selling_price: Math.max(0, toNumber(body.selling_price, 0)),
    notes: String(body.notes ?? '').trim()
  };
}

// --- List with search & filters ---
router.get('/', requireAuth, (req, res) => {
  const { q, color, thickness, location, category, status } = req.query;
  const where = [];
  const params = {};

  if (q) {
    where.push('(name LIKE @q OR name_he LIKE @q OR notes LIKE @q OR category LIKE @q)');
    params.q = `%${q}%`;
  }
  if (color) { where.push('color = @color'); params.color = color; }
  if (thickness) { where.push('thickness = @thickness'); params.thickness = thickness; }
  if (location) { where.push('location = @location'); params.location = location; }
  if (category) { where.push('category = @category'); params.category = category; }

  const threshold = lowStockThreshold();
  if (status === 'sold_out') where.push('quantity <= 0');
  else if (status === 'low_stock') where.push(`quantity > 0 AND quantity < ${threshold}`);
  else if (status === 'in_stock') where.push(`quantity >= ${threshold}`);

  const sql =
    'SELECT * FROM marbles' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY updated_at DESC, id DESC';
  const rows = db.prepare(sql).all(params);
  res.json(rows.map((r) => decorateMarble(r, threshold)));
});

// --- Distinct filter option values ---
router.get('/facets', requireAuth, (req, res) => {
  const distinct = (col) =>
    db.prepare(`SELECT DISTINCT ${col} AS v FROM marbles WHERE ${col} <> '' ORDER BY v`)
      .all()
      .map((r) => r.v);
  res.json({
    colors: distinct('color'),
    thicknesses: distinct('thickness'),
    locations: distinct('location'),
    categories: distinct('category')
  });
});

// --- Single ---
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM marbles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'סוג השיש לא נמצא' });
  res.json(decorateMarble(row));
});

// --- Create ---
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const data = normalizeBody(req.body);
  if (!data.name && !data.name_he) {
    return res.status(400).json({ error: 'יש להזין שם שיש (באנגלית או בעברית)' });
  }
  const info = db.prepare(`
    INSERT INTO marbles (${FIELDS.join(', ')})
    VALUES (${FIELDS.map((f) => '@' + f).join(', ')})
  `).run(data);
  const row = db.prepare('SELECT * FROM marbles WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(decorateMarble(row));
});

// --- Update ---
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM marbles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'סוג השיש לא נמצא' });
  const data = normalizeBody({ ...existing, ...req.body });
  db.prepare(`
    UPDATE marbles SET
      ${FIELDS.map((f) => `${f} = @${f}`).join(', ')},
      updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id: existing.id });
  const row = db.prepare('SELECT * FROM marbles WHERE id = ?').get(existing.id);
  res.json(decorateMarble(row));
});

// --- Delete ---
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM marbles WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'סוג השיש לא נמצא' });
  res.json({ ok: true });
});

// --- Stock adjustment: add / remove / set ---
router.post('/:id/stock', requireAuth, requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM marbles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'סוג השיש לא נמצא' });

  const action = String(req.body.action || '');
  const amount = Math.max(0, Math.round(toNumber(req.body.amount, 0)));
  let newQty = row.quantity;

  if (action === 'add') newQty = row.quantity + amount;
  else if (action === 'remove') newQty = Math.max(0, row.quantity - amount);
  else if (action === 'set') newQty = Math.max(0, Math.round(toNumber(req.body.amount, row.quantity)));
  else return res.status(400).json({ error: 'פעולת מלאי לא חוקית' });

  const tx = db.transaction(() => {
    db.prepare("UPDATE marbles SET quantity = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newQty, row.id);
    db.prepare('INSERT INTO stock_log (marble_id, action, delta, resulting) VALUES (?, ?, ?, ?)')
      .run(row.id, action, newQty - row.quantity, newQty);
  });
  tx();

  const updated = db.prepare('SELECT * FROM marbles WHERE id = ?').get(row.id);
  res.json(decorateMarble(updated));
});

// --- Sell one (or more) slabs: decrement stock + record sale ---
router.post('/:id/sell', requireAuth, requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM marbles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'סוג השיש לא נמצא' });

  const qty = Math.max(1, Math.round(toNumber(req.body.quantity, 1)));
  if (row.quantity <= 0) {
    return res.status(400).json({ error: 'אין מלאי זמין למכירה (המוצר אזל)' });
  }
  if (qty > row.quantity) {
    return res.status(400).json({ error: `לא ניתן למכור ${qty} לוחות, קיימים במלאי ${row.quantity} בלבד` });
  }

  const unitPrice = req.body.unit_price != null
    ? Math.max(0, toNumber(req.body.unit_price, row.selling_price))
    : row.selling_price;
  const totalPrice = unitPrice * qty;
  const newQty = row.quantity - qty;

  const tx = db.transaction(() => {
    db.prepare("UPDATE marbles SET quantity = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newQty, row.id);
    db.prepare('INSERT INTO stock_log (marble_id, action, delta, resulting) VALUES (?, ?, ?, ?)')
      .run(row.id, 'sell', -qty, newQty);
    return db.prepare(`
      INSERT INTO sales
        (marble_id, marble_name, marble_name_he, quantity_sold, unit_price, total_price,
         customer_name, customer_phone, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id, row.name, row.name_he, qty, unitPrice, totalPrice,
      String(req.body.customer_name || '').trim(),
      String(req.body.customer_phone || '').trim(),
      String(req.body.notes || '').trim()
    );
  });
  const saleInfo = tx();

  const updated = db.prepare('SELECT * FROM marbles WHERE id = ?').get(row.id);
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleInfo.lastInsertRowid);
  res.json({ marble: decorateMarble(updated), sale });
});

export default router;
