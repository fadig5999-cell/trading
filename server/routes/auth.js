import { Router } from 'express';
import db from '../db.js';
import { signToken, verifyPassword, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'יש להזין שם משתמש וסיסמה' });
  }
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(String(username).trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }
  const token = signToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });
  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
