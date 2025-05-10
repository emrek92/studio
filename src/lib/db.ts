// src/lib/db.ts
'use server';

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

// Define the path to the SQLite database file
// It's placed in the project root for simplicity in development
// For production, consider a more robust location or a managed database service
const DB_PATH = path.join(process.cwd(), 'stoktakip.db');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
  }
  return db;
}

export async function initDb() {
  const database = await getDb();

  await database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      productCode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      unit TEXT NOT NULL,
      stock REAL DEFAULT 0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      contactPerson TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS boms (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      name TEXT NOT NULL,
      components TEXT, -- JSON string for array of BomComponent
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      orderReference TEXT UNIQUE,
      supplierId TEXT NOT NULL,
      orderDate TEXT NOT NULL,
      expectedDeliveryDate TEXT,
      items TEXT NOT NULL, -- JSON string for array of PurchaseOrderItem
      status TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS raw_material_entries (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      quantity REAL NOT NULL,
      date TEXT NOT NULL,
      supplierId TEXT,
      purchaseOrderId TEXT,
      notes TEXT,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS production_logs (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      bomId TEXT NOT NULL,
      quantity REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (bomId) REFERENCES boms(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS customer_orders (
      id TEXT PRIMARY KEY,
      customerName TEXT NOT NULL,
      orderDate TEXT NOT NULL,
      items TEXT NOT NULL -- JSON string for array of OrderItem
    );

    CREATE TABLE IF NOT EXISTS shipment_logs (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      quantity REAL NOT NULL,
      date TEXT NOT NULL,
      customerOrderId TEXT,
      notes TEXT,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (customerOrderId) REFERENCES customer_orders(id) ON DELETE SET NULL
    );
  `);

  console.log('Database tables initialized successfully.');
}

// Optional: Initialize DB when this module is first loaded in a server context.
// However, for Next.js, it's better to call initDb explicitly, e.g., in a global setup or on first request.
// initDb().catch(console.error);

export default db;
