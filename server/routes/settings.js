import { Router } from 'express';
import { getSetting, setSetting } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

const KEYS = ['business_name', 'low_stock_threshold', 'currency'];

router.get('/', requireAuth, (req, res) => {
  const out = {};
  for (const k of KEYS) out[k] = getSetting(k, '');
  res.json(out);
});

router.put('/', requireAuth, requireAdmin, (req, res) => {
  const body = req.body || {};
  if (body.business_name != null) setSetting('business_name', String(body.business_name).trim() || 'אולם תצוגת שיש');
  if (body.currency != null) setSetting('currency', String(body.currency).trim() || '₪');
  if (body.low_stock_threshold != null) {
    const n = parseInt(body.low_stock_threshold, 10);
    setSetting('low_stock_threshold', String(Number.isFinite(n) && n > 0 ? n : 3));
  }
  const out = {};
  for (const k of KEYS) out[k] = getSetting(k, '');
  res.json(out);
});

export default router;
