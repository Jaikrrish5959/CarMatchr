import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.resolve(process.cwd(), 'db', 'carmatchr.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
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
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      requirementId TEXT NOT NULL,
      brokerId TEXT NOT NULL,
      brokerName TEXT NOT NULL,
      brokerPhone TEXT NOT NULL,
      price TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

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
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

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
  `);
}

initDb();

const adminExists = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  db.prepare(`
    INSERT INTO users (id, email, password, role, status, name, createdAt)
    VALUES (@id, @email, @password, @role, @status, @name, @createdAt)
  `).run({
    id: `admin-${Date.now()}`,
    email: 'admin@carmatchr.com',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    name: 'Platform Admin',
    createdAt: new Date().toISOString(),
  });
}
