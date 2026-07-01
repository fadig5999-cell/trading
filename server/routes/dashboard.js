import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { lowStockThreshold, decorateMarble } from '../helpers.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const threshold = lowStockThreshold();

  const totalTypes = db.prepare('SELECT COUNT(*) AS c FROM marbles').get().c;
  const totalSlabs = db.prepare('SELECT COALESCE(SUM(quantity),0) AS s FROM marbles').get().s;
  const lowStockCount = db
    .prepare('SELECT COUNT(*) AS c FROM marbles WHERE quantity > 0 AND quantity < ?')
    .get(threshold).c;
  const soldOutCount = db.prepare('SELECT COUNT(*) AS c FROM marbles WHERE quantity <= 0').get().c;

  const soldToday = db
    .prepare("SELECT COALESCE(SUM(quantity_sold),0) AS s FROM sales WHERE date(created_at) = date('now','localtime')")
    .get().s;
  const soldMonth = db
    .prepare("SELECT COALESCE(SUM(quantity_sold),0) AS s FROM sales WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now','localtime')")
    .get().s;
  const revenueMonth = db
    .prepare("SELECT COALESCE(SUM(total_price),0) AS s FROM sales WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now','localtime')")
    .get().s;

  const inventoryValue = db
    .prepare('SELECT COALESCE(SUM(quantity * selling_price),0) AS s FROM marbles')
    .get().s;
  const inventoryCost = db
    .prepare('SELECT COALESCE(SUM(quantity * cost_price),0) AS s FROM marbles')
    .get().s;

  const lowStockItems = db
    .prepare('SELECT * FROM marbles WHERE quantity < ? ORDER BY quantity ASC LIMIT 8')
    .all(threshold)
    .map((r) => decorateMarble(r, threshold));

  const recentSales = db
    .prepare('SELECT * FROM sales ORDER BY created_at DESC, id DESC LIMIT 6')
    .all();

  res.json({
    threshold,
    totalTypes,
    totalSlabs,
    lowStockCount,
    soldOutCount,
    soldToday,
    soldMonth,
    revenueMonth,
    inventoryValue,
    inventoryCost,
    lowStockItems,
    recentSales
  });
});

router.get('/reports', requireAuth, (req, res) => {
  const threshold = lowStockThreshold();

  const topSelling = db.prepare(`
    SELECT marble_name, marble_name_he,
           SUM(quantity_sold) AS total_qty,
           SUM(total_price) AS total_revenue
    FROM sales
    GROUP BY COALESCE(marble_id, marble_name), marble_name
    ORDER BY total_qty DESC
    LIMIT 10
  `).all();

  const monthlySales = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS month,
           SUM(quantity_sold) AS qty,
           SUM(total_price) AS revenue
    FROM sales
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all();

  const lowStockList = db
    .prepare('SELECT * FROM marbles WHERE quantity < ? ORDER BY quantity ASC')
    .all(threshold)
    .map((r) => decorateMarble(r, threshold));

  const stockValue = db
    .prepare('SELECT COALESCE(SUM(quantity * selling_price),0) AS s FROM marbles')
    .get().s;
  const stockCost = db
    .prepare('SELECT COALESCE(SUM(quantity * cost_price),0) AS s FROM marbles')
    .get().s;

  const totalSold = db.prepare('SELECT COALESCE(SUM(quantity_sold),0) AS s FROM sales').get().s;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_price),0) AS s FROM sales').get().s;

  const byCategory = db.prepare(`
    SELECT COALESCE(NULLIF(category,''),'ללא קטגוריה') AS category,
           COUNT(*) AS types,
           COALESCE(SUM(quantity),0) AS slabs,
           COALESCE(SUM(quantity * selling_price),0) AS value
    FROM marbles
    GROUP BY category
    ORDER BY value DESC
  `).all();

  res.json({
    threshold,
    topSelling,
    monthlySales,
    lowStockList,
    stockValue,
    stockCost,
    potentialProfit: stockValue - stockCost,
    totalSold,
    totalRevenue,
    byCategory
  });
});

export default router;
