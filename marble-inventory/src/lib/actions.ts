'use server';

import { db, initDatabase } from '@/lib/db';
import { seedDatabase } from '@/lib/db/seed';
import { marbleTypes, sales, stockTransactions } from '@/lib/db/schema';
import { requireAdmin, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { MarbleType, MarbleTypeRow } from '@/lib/types';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

let dbReady = false;

async function ensureDb() {
  if (dbReady) return;
  initDatabase();
  await seedDatabase();
  dbReady = true;
}

function rowToMarble(row: MarbleTypeRow): MarbleType {
  return {
    id: row.id,
    name: row.name,
    hebrew_name: row.hebrewName,
    category: row.category,
    color: row.color,
    thickness: row.thickness,
    size: row.size,
    quantity: row.quantity,
    location: row.location,
    image_url: row.imageUrl,
    cost_price: row.costPrice,
    selling_price: row.sellingPrice,
    notes: row.notes,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

const now = () => new Date().toISOString();

export async function createMarbleType(formData: FormData) {
  await ensureDb();
  await requireAdmin();
  const timestamp = now();

  db.insert(marbleTypes).values({
    id: randomUUID(),
    name: formData.get('name') as string,
    hebrewName: formData.get('hebrew_name') as string,
    category: (formData.get('category') as string) || null,
    color: (formData.get('color') as string) || null,
    thickness: (formData.get('thickness') as string) || null,
    size: (formData.get('size') as string) || null,
    quantity: parseInt(formData.get('quantity') as string) || 0,
    location: (formData.get('location') as string) || null,
    costPrice: formData.get('cost_price') ? parseFloat(formData.get('cost_price') as string) : null,
    sellingPrice: formData.get('selling_price') ? parseFloat(formData.get('selling_price') as string) : null,
    notes: (formData.get('notes') as string) || null,
    imageUrl: (formData.get('image_url') as string) || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }).run();

  revalidateAll();
}

export async function updateMarbleType(id: string, formData: FormData) {
  await ensureDb();
  await requireAdmin();

  db.update(marbleTypes).set({
    name: formData.get('name') as string,
    hebrewName: formData.get('hebrew_name') as string,
    category: (formData.get('category') as string) || null,
    color: (formData.get('color') as string) || null,
    thickness: (formData.get('thickness') as string) || null,
    size: (formData.get('size') as string) || null,
    location: (formData.get('location') as string) || null,
    costPrice: formData.get('cost_price') ? parseFloat(formData.get('cost_price') as string) : null,
    sellingPrice: formData.get('selling_price') ? parseFloat(formData.get('selling_price') as string) : null,
    notes: (formData.get('notes') as string) || null,
    imageUrl: (formData.get('image_url') as string) || null,
    updatedAt: now(),
  }).where(eq(marbleTypes.id, id)).run();

  revalidateAll();
}

export async function deleteMarbleType(id: string) {
  await ensureDb();
  await requireAdmin();
  db.delete(marbleTypes).where(eq(marbleTypes.id, id)).run();
  revalidateAll();
}

export async function updateStock(
  marbleId: string,
  change: number,
  type: 'add' | 'remove' | 'sell' | 'manual',
  saleDetails?: {
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
    price?: number;
  }
) {
  await ensureDb();
  const session = await requireAdmin();
  const marble = db.select().from(marbleTypes).where(eq(marbleTypes.id, marbleId)).get();
  if (!marble) throw new Error('סוג השיש לא נמצא');

  const previousQuantity = marble.quantity;
  const newQuantity = type === 'manual' ? change : previousQuantity + change;
  if (newQuantity < 0) throw new Error('לא ניתן להוריד מלאי מתחת לאפס');

  const timestamp = now();

  db.update(marbleTypes).set({ quantity: newQuantity, updatedAt: timestamp })
    .where(eq(marbleTypes.id, marbleId)).run();

  db.insert(stockTransactions).values({
    id: randomUUID(),
    marbleTypeId: marbleId,
    transactionType: type,
    quantityChange: type === 'manual' ? newQuantity - previousQuantity : change,
    previousQuantity,
    newQuantity,
    createdBy: session.id,
    notes: saleDetails?.notes || null,
    createdAt: timestamp,
  }).run();

  if (type === 'sell') {
    const d = new Date();
    db.insert(sales).values({
      id: randomUUID(),
      marbleTypeId: marbleId,
      quantitySold: Math.abs(change),
      saleDate: d.toISOString().split('T')[0],
      saleTime: d.toTimeString().split(' ')[0],
      price: saleDetails?.price ?? marble.sellingPrice,
      customerName: saleDetails?.customer_name || null,
      customerPhone: saleDetails?.customer_phone || null,
      notes: saleDetails?.notes || null,
      soldBy: session.id,
      createdAt: timestamp,
    }).run();
  }

  revalidateAll();
  return { previousQuantity, newQuantity };
}

export async function sellOneSlab(
  marbleId: string,
  saleDetails?: { customer_name?: string; customer_phone?: string; notes?: string }
) {
  return updateStock(marbleId, -1, 'sell', saleDetails);
}

export async function uploadImage(formData: FormData): Promise<string> {
  await ensureDb();
  await requireAdmin();
  const file = formData.get('file') as File;
  if (!file) throw new Error('לא נבחר קובץ');

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir, fileName), buffer);

  return `/uploads/${fileName}`;
}

export async function getMarbleTypes(filters?: {
  search?: string;
  color?: string;
  thickness?: string;
  location?: string;
  category?: string;
  lowStock?: boolean;
  soldOut?: boolean;
}): Promise<MarbleType[]> {
  await ensureDb();
  const session = await getSession();
  if (!session) return [];

  let rows = db.select().from(marbleTypes).all();

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(s) || r.hebrewName.includes(filters.search!)
    );
  }
  if (filters?.color) rows = rows.filter(r => r.color === filters.color);
  if (filters?.thickness) rows = rows.filter(r => r.thickness === filters.thickness);
  if (filters?.location) rows = rows.filter(r => r.location === filters.location);
  if (filters?.category) rows = rows.filter(r => r.category === filters.category);
  if (filters?.lowStock) rows = rows.filter(r => r.quantity > 0 && r.quantity < 3);
  if (filters?.soldOut) rows = rows.filter(r => r.quantity === 0);

  return rows.map(rowToMarble).sort((a, b) => a.hebrew_name.localeCompare(b.hebrew_name, 'he'));
}

export async function getMarbleById(id: string): Promise<MarbleType | null> {
  await ensureDb();
  const row = db.select().from(marbleTypes).where(eq(marbleTypes.id, id)).get();
  return row ? rowToMarble(row) : null;
}

export async function getDashboardStats() {
  await ensureDb();
  const marbles = db.select().from(marbleTypes).all();
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const allSales = db.select().from(sales).all();
  const salesToday = allSales.filter(s => s.saleDate === today);
  const salesMonth = allSales.filter(s => s.saleDate >= monthStart);

  return {
    totalTypes: marbles.length,
    totalSlabs: marbles.reduce((sum, m) => sum + m.quantity, 0),
    lowStockCount: marbles.filter(m => m.quantity > 0 && m.quantity < 3).length,
    soldOutCount: marbles.filter(m => m.quantity === 0).length,
    soldToday: salesToday.reduce((sum, s) => sum + s.quantitySold, 0),
    soldThisMonth: salesMonth.reduce((sum, s) => sum + s.quantitySold, 0),
    inventoryValue: marbles.reduce((sum, m) => sum + (m.sellingPrice || 0) * m.quantity, 0),
  };
}

export async function getSales() {
  await ensureDb();
  const allSales = db.select().from(sales).all().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const marbles = db.select().from(marbleTypes).all();
  const marbleMap = new Map(marbles.map(m => [m.id, rowToMarble(m)]));

  return allSales.map(s => ({
    id: s.id,
    marble_type_id: s.marbleTypeId,
    quantity_sold: s.quantitySold,
    sale_date: s.saleDate,
    sale_time: s.saleTime,
    price: s.price,
    customer_name: s.customerName,
    customer_phone: s.customerPhone,
    notes: s.notes,
    sold_by: s.soldBy,
    created_at: s.createdAt,
    marble_types: marbleMap.get(s.marbleTypeId) || undefined,
  }));
}

export async function getReports() {
  await ensureDb();
  const marbles = db.select().from(marbleTypes).all();
  const allSales = db.select().from(sales).all();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  const monthSales = allSales.filter(s => s.saleDate >= monthStart);

  const marbleMap = new Map(marbles.map(m => [m.id, m]));
  const salesByType: Record<string, { name: string; count: number; revenue: number }> = {};

  allSales.forEach(s => {
    const m = marbleMap.get(s.marbleTypeId);
    const name = m?.hebrewName || 'לא ידוע';
    if (!salesByType[name]) salesByType[name] = { name, count: 0, revenue: 0 };
    salesByType[name].count += s.quantitySold;
    salesByType[name].revenue += (s.price || 0) * s.quantitySold;
  });

  return {
    mostSold: Object.values(salesByType).sort((a, b) => b.count - a.count).slice(0, 10),
    stockValue: marbles.reduce((sum, m) => sum + (m.sellingPrice || 0) * m.quantity, 0),
    lowStock: marbles.filter(m => m.quantity > 0 && m.quantity < 3)
      .sort((a, b) => a.quantity - b.quantity)
      .map(rowToMarble),
    monthlyRevenue: monthSales.reduce((sum, s) => sum + (s.price || 0) * s.quantitySold, 0),
    monthlySoldCount: monthSales.reduce((sum, s) => sum + s.quantitySold, 0),
    totalSoldCount: allSales.reduce((sum, s) => sum + s.quantitySold, 0),
  };
}

export async function getUserProfile() {
  const { getUserProfile: getProfile } = await import('@/lib/auth');
  return getProfile();
}

export async function getFilterOptions() {
  await ensureDb();
  const marbles = db.select().from(marbleTypes).all();
  return {
    colors: [...new Set(marbles.map(m => m.color).filter(Boolean))] as string[],
    thicknesses: [...new Set(marbles.map(m => m.thickness).filter(Boolean))] as string[],
    locations: [...new Set(marbles.map(m => m.location).filter(Boolean))] as string[],
    categories: [...new Set(marbles.map(m => m.category).filter(Boolean))] as string[],
  };
}

function revalidateAll() {
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  revalidatePath('/gallery');
  revalidatePath('/reports');
  revalidatePath('/sales');
}
