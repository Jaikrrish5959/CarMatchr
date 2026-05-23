import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const isVercel = !!process.env.VERCEL;
const dbDir = isVercel
  ? '/tmp'
  : path.resolve(process.cwd(), 'db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'carmatchr.sqlite');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer', 'broker', 'admin')),
      status TEXT NOT NULL CHECK(status IN ('active', 'pending')),
      name TEXT,
      businessName TEXT,
      phone TEXT,
      license TEXT,
      city TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);

    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      buyerId TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      yearRange TEXT NOT NULL,
      budget TEXT NOT NULL,
      preferredFeature TEXT DEFAULT '',
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_req_buyer ON requirements(buyerId);
    CREATE INDEX IF NOT EXISTS idx_req_status ON requirements(status);

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      requirementId TEXT NOT NULL,
      brokerId TEXT NOT NULL,
      brokerName TEXT NOT NULL,
      brokerPhone TEXT NOT NULL,
      price TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_offer_req ON offers(requirementId);
    CREATE INDEX IF NOT EXISTS idx_offer_broker ON offers(brokerId);

    CREATE TABLE IF NOT EXISTS brokerListings (
      id TEXT PRIMARY KEY,
      brokerId TEXT NOT NULL,
      brokerName TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT NOT NULL,
      year INTEGER NOT NULL,
      price REAL NOT NULL,
      fuelType TEXT NOT NULL,
      transmission TEXT NOT NULL,
      bodyType TEXT NOT NULL,
      color TEXT NOT NULL,
      city TEXT NOT NULL,
      kmDriven INTEGER NOT NULL,
      owners INTEGER NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'sold')),
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bl_broker ON brokerListings(brokerId);
    CREATE INDEX IF NOT EXISTS idx_bl_status ON brokerListings(status);

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      logoUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brandId INTEGER NOT NULL,
      name TEXT NOT NULL,
      imageUrl TEXT,
      UNIQUE(brandId, name)
    );

    CREATE TABLE IF NOT EXISTS features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS modelFeatures (
      modelId INTEGER NOT NULL,
      featureId INTEGER NOT NULL,
      UNIQUE(modelId, featureId)
    );

    CREATE TABLE IF NOT EXISTS contactEvents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listingId TEXT NOT NULL,
      buyerName TEXT NOT NULL DEFAULT 'Anonymous',
      buyerEmail TEXT NOT NULL DEFAULT '',
      buyerPhone TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ce_listing ON contactEvents(listingId);

    CREATE TABLE IF NOT EXISTS listingImages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listingId TEXT NOT NULL,
      imagePath TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_li_listing ON listingImages(listingId);
  `);

  // Migration: add preferredFeature column if missing (existing DBs)
  try {
    db.prepare("SELECT preferredFeature FROM requirements LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE requirements ADD COLUMN preferredFeature TEXT DEFAULT ''");
  }
}

initDb();

// Seed default admin account if none exists
const adminExists = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const hashedPw = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (id, email, password, role, status, name, createdAt)
    VALUES (@id, @email, @password, @role, @status, @name, @createdAt)
  `).run({
    id: `admin-${crypto.randomUUID()}`,
    email: 'admin@carmatchr.com',
    password: hashedPw,
    role: 'admin',
    status: 'active',
    name: 'Platform Admin',
    createdAt: new Date().toISOString(),
  });
}
