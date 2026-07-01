import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name'),
  role: text('role', { enum: ['admin', 'viewer'] }).notNull().default('viewer'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const marbleTypes = sqliteTable('marble_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  hebrewName: text('hebrew_name').notNull(),
  category: text('category'),
  color: text('color'),
  thickness: text('thickness'),
  size: text('size'),
  quantity: integer('quantity').notNull().default(0),
  location: text('location'),
  imageUrl: text('image_url'),
  costPrice: real('cost_price'),
  sellingPrice: real('selling_price'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  marbleTypeId: text('marble_type_id').notNull().references(() => marbleTypes.id),
  quantitySold: integer('quantity_sold').notNull().default(1),
  saleDate: text('sale_date').notNull(),
  saleTime: text('sale_time').notNull(),
  price: real('price'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  notes: text('notes'),
  soldBy: text('sold_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
});

export const stockTransactions = sqliteTable('stock_transactions', {
  id: text('id').primaryKey(),
  marbleTypeId: text('marble_type_id').notNull().references(() => marbleTypes.id),
  transactionType: text('transaction_type', { enum: ['add', 'remove', 'sell', 'manual'] }).notNull(),
  quantityChange: integer('quantity_change').notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type MarbleTypeRow = typeof marbleTypes.$inferSelect;
export type SaleRow = typeof sales.$inferSelect;
