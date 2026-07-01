import { db, initDatabase } from './index';
import { users, marbleTypes } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const now = () => new Date().toISOString();

export async function seedDatabase() {
  initDatabase();

  const existingUsers = db.select().from(users).all();
  if (existingUsers.length === 0) {
    try {
      const adminId = randomUUID();
      const viewerId = randomUUID();
      const timestamp = now();

      db.insert(users).values([
        {
          id: adminId,
          email: 'admin@marble.co.il',
          passwordHash: await bcrypt.hash('admin123', 10),
          fullName: 'מנהל המערכת',
          role: 'admin',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: viewerId,
          email: 'viewer@marble.co.il',
          passwordHash: await bcrypt.hash('viewer123', 10),
          fullName: 'צופה',
          role: 'viewer',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]).run();
    } catch {
      // Race condition during parallel init - safe to ignore
    }
  }

  const existingMarbles = db.select().from(marbleTypes).all();
  if (existingMarbles.length === 0) {
    try {
      const timestamp = now();
    const marbles = [
      { name: 'Calacatta Gold', hebrewName: 'קלקטה גולד', category: 'שיש איטלקי', color: 'לבן עם עורקי זהב', thickness: '2 ס"מ', size: '320x160 ס"מ', quantity: 8, location: 'אולם תצוגה א׳', costPrice: 4500, sellingPrice: 7800, notes: 'שיש פרימיום מאיטליה', imageUrl: 'https://images.unsplash.com/photo-1615971677490-4c1e2d4d8b8e?w=600&q=80' },
      { name: 'Nero Marquina', hebrewName: 'נרו מרקינה', category: 'שיש איטלקי', color: 'שחור עם עורקים לבנים', thickness: '2 ס"מ', size: '300x150 ס"מ', quantity: 5, location: 'אולם תצוגה א׳', costPrice: 3200, sellingPrice: 5500, notes: 'שיש שחור קלאסי', imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80' },
      { name: 'Emperador Dark', hebrewName: 'אמפרדור דארק', category: 'שיש ספרדי', color: 'חום כהה', thickness: '2 ס"מ', size: '310x155 ס"מ', quantity: 12, location: 'מחסן ראשי', costPrice: 2800, sellingPrice: 4800, notes: 'שיש חום עשיר', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
      { name: 'Statuario', hebrewName: 'סטטואריו', category: 'שיש איטלקי', color: 'לבן טהור', thickness: '3 ס"מ', size: '320x160 ס"מ', quantity: 2, location: 'אולם תצוגה ב׳', costPrice: 5500, sellingPrice: 9200, notes: 'מלאי נמוך - הזמנה מיוחדת', imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80' },
      { name: 'Travertine Classic', hebrewName: 'טרוורטין קלאסי', category: 'אבן טבעית', color: 'בז׳ חם', thickness: '2 ס"מ', size: '300x150 ס"מ', quantity: 15, location: 'מחסן ראשי', costPrice: 1800, sellingPrice: 3200, notes: 'אבן טבעית פופולרית', imageUrl: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=600&q=80' },
      { name: 'Carrara White', hebrewName: 'קררה לבן', category: 'שיש איטלקי', color: 'לבן עם עורקים אפורים', thickness: '2 ס"מ', size: '310x155 ס"מ', quantity: 0, location: 'אולם תצוגה א׳', costPrice: 2500, sellingPrice: 4200, notes: 'אזל מהמלאי', imageUrl: 'https://images.unsplash.com/photo-1600210492496-094e691a3ead?w=600&q=80' },
      { name: 'Verde Guatemala', hebrewName: 'ורדה גואטמלה', category: 'גרניט', color: 'ירוק כהה', thickness: '3 ס"מ', size: '300x150 ס"מ', quantity: 6, location: 'מחסן ראשי', costPrice: 3500, sellingPrice: 5800, notes: 'גרניט ירוק יוקרתי', imageUrl: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=600&q=80' },
      { name: 'Crema Marfil', hebrewName: 'קרמה מרפיל', category: 'שיש ספרדי', color: 'קרם בהיר', thickness: '2 ס"מ', size: '320x160 ס"מ', quantity: 9, location: 'אולם תצוגה ב׳', costPrice: 2200, sellingPrice: 3900, notes: 'שיש קרם אלגנטי', imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80' },
    ];

    db.insert(marbleTypes).values(
      marbles.map(m => ({
        id: randomUUID(),
        name: m.name,
        hebrewName: m.hebrewName,
        category: m.category,
        color: m.color,
        thickness: m.thickness,
        size: m.size,
        quantity: m.quantity,
        location: m.location,
        costPrice: m.costPrice,
        sellingPrice: m.sellingPrice,
        notes: m.notes,
        imageUrl: m.imageUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
      }))
    ).run();
    } catch {
      // Race condition during parallel init - safe to ignore
    }
  }
}
