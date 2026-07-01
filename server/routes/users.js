import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin, hashPassword } from '../auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, username, name, role, created_at FROM users ORDER BY id').all());
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { username, password, name, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'יש להזין שם משתמש וסיסמה' });
  }
  const cleanRole = role === 'admin' ? 'admin' : 'viewer';
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username).trim());
  if (exists) return res.status(409).json({ error: 'שם המשתמש כבר קיים' });
  const info = db
    .prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(String(username).trim(), hashPassword(String(password)), String(name || '').trim(), cleanRole);
  res.status(201).json(
    db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(info.lastInsertRowid)
  );
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'המשתמש לא נמצא' });
  const { name, role, password } = req.body || {};
  const cleanRole = role === 'admin' ? 'admin' : role === 'viewer' ? 'viewer' : user.role;
  db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?')
    .run(name != null ? String(name).trim() : user.name, cleanRole, user.id);
  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(password)), user.id);
  }
  res.json(db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(user.id));
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'לא ניתן למחוק את המשתמש שאיתו אתה מחובר' });
  }
  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
  const target = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
  if (target && target.role === 'admin' && adminCount <= 1) {
    return res.status(400).json({ error: 'חייב להישאר לפחות מנהל אחד במערכת' });
  }
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'המשתמש לא נמצא' });
  res.json({ ok: true });
});

export default router;
