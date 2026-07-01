import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_TTL = '7d';

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function readToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

/** Require any authenticated user. Populates req.user. */
export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'נדרשת התחברות' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Ensure the user still exists (e.g. not deleted).
    const user = db
      .prepare('SELECT id, username, name, role FROM users WHERE id = ?')
      .get(payload.id);
    if (!user) return res.status(401).json({ error: 'המשתמש לא קיים' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'ההתחברות פגה, יש להתחבר מחדש' });
  }
}

/** Require an admin user (write access). Must run after requireAuth. */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו (נדרשת הרשאת מנהל)' });
  }
  next();
}
