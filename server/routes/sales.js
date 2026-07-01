import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// --- List sales history (most recent first), with optional search/date filters ---
router.get('/', requireAuth, (req, res) => {
  const { q, from, to } = req.query;
  const where = [];
  const params = {};
  if (q) {
    where.push('(marble_name LIKE @q OR marble_name_he LIKE @q OR customer_name LIKE @q OR customer_phone LIKE @q)');
    params.q = `%${q}%`;
  }
  if (from) { where.push('date(created_at) >= date(@from)'); params.from = from; }
  if (to) { where.push('date(created_at) <= date(@to)'); params.to = to; }

  const sql =
    'SELECT * FROM sales' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY created_at DESC, id DESC';
  res.json(db.prepare(sql).all(params));
});

// --- Delete a sale record (admin) — does NOT restore stock automatically ---
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'רשומת המכירה לא נמצאה' });
  res.json({ ok: true });
});

export default router;
