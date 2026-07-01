import 'dotenv/config';
import db, { initSchema, setSetting, getSetting } from './db.js';
import { hashPassword } from './auth.js';

/**
 * Ensures the database has a schema, default settings, a default admin user,
 * and (optionally) demo inventory so a fresh install is usable immediately.
 */
export function seed({ withDemo = true } = {}) {
  initSchema();

  // --- Default settings ---
  if (!getSetting('business_name')) {
    setSetting('business_name', process.env.BUSINESS_NAME || 'אולם תצוגת שיש');
  }
  if (!getSetting('low_stock_threshold')) {
    setSetting('low_stock_threshold', process.env.LOW_STOCK_THRESHOLD || '3');
  }
  if (!getSetting('currency')) {
    setSetting('currency', '₪');
  }

  // --- Default admin user ---
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'מנהל המערכת';
    db.prepare(
      'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)'
    ).run(username, hashPassword(password), name, 'admin');
    console.log(`✔ נוצר משתמש מנהל ברירת מחדל: ${username} / ${password}`);

    // A read-only demo viewer account
    db.prepare(
      'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)'
    ).run('viewer', hashPassword('viewer123'), 'צופה', 'viewer');
  }

  // --- Demo inventory ---
  const marbleCount = db.prepare('SELECT COUNT(*) AS c FROM marbles').get().c;
  if (withDemo && marbleCount === 0) {
    const insert = db.prepare(`
      INSERT INTO marbles
        (name, name_he, category, color, thickness, size, quantity, location,
         image, cost_price, selling_price, notes)
      VALUES
        (@name, @name_he, @category, @color, @thickness, @size, @quantity, @location,
         @image, @cost_price, @selling_price, @notes)
    `);

    const demo = [
      {
        name: 'Carrara White', name_he: 'קרארה לבן', category: 'שיש טבעי',
        color: 'לבן', thickness: '2 ס"מ', size: '320x160', quantity: 12,
        location: 'מחסן A - מדף 1', image: '', cost_price: 1800, selling_price: 2900,
        notes: 'שיש איטלקי קלאסי, ורידים אפורים עדינים'
      },
      {
        name: 'Nero Marquina', name_he: 'נרו מרקינה שחור', category: 'שיש טבעי',
        color: 'שחור', thickness: '3 ס"מ', size: '300x150', quantity: 2,
        location: 'מחסן A - מדף 3', image: '', cost_price: 2400, selling_price: 3800,
        notes: 'שחור עמוק עם ורידים לבנים'
      },
      {
        name: 'Calacatta Gold', name_he: 'קלקטה זהב', category: 'שיש יוקרתי',
        color: 'לבן-זהב', thickness: '2 ס"מ', size: '330x165', quantity: 6,
        location: 'אולם תצוגה - עמדה 2', image: '', cost_price: 3200, selling_price: 5400,
        notes: 'ורידים זהובים בולטים, פריט יוקרה'
      },
      {
        name: 'Emperador Dark', name_he: 'אמפרדור חום כהה', category: 'שיש טבעי',
        color: 'חום', thickness: '2 ס"מ', size: '290x145', quantity: 0,
        location: 'מחסן B - מדף 5', image: '', cost_price: 1500, selling_price: 2600,
        notes: 'חום שוקולד עם גוונים בהירים'
      },
      {
        name: 'Absolute Black Granite', name_he: 'גרניט שחור אבסולוט', category: 'גרניט',
        color: 'שחור', thickness: '3 ס"מ', size: '310x160', quantity: 20,
        location: 'מחסן C - חצר', image: '', cost_price: 1200, selling_price: 2100,
        notes: 'גרניט הודי, עמיד מאוד למטבחים'
      },
      {
        name: 'Travertine Beige', name_he: 'טרוורטין בז\'', category: 'אבן טבעית',
        color: 'בז\'', thickness: '2 ס"מ', size: '280x140', quantity: 1,
        location: 'אולם תצוגה - עמדה 4', image: '', cost_price: 900, selling_price: 1700,
        notes: 'מרקם נקבובי אופייני, מתאים לחיפוי'
      }
    ];

    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });
    insertMany(demo);
    console.log(`✔ נוספו ${demo.length} סוגי שיש לדוגמה`);
  }
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
  console.log('✔ מסד הנתונים אותחל בהצלחה');
  process.exit(0);
}
