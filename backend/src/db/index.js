import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000, // 5 seconds timeout to prevent hanging on startup
});

async function runQuery(text, params, client = pool) {
  return client.query(text, params);
}

export const db = {
  async get(text, params, client) {
    const { rows } = await runQuery(text, params, client ?? pool);
    return rows[0];
  },
  async all(text, params, client) {
    const { rows } = await runQuery(text, params, client ?? pool);
    return rows;
  },
  async run(text, params, client) {
    return runQuery(text, params, client ?? pool);
  },
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        get: (text, params) => db.get(text, params, client),
        all: (text, params) => db.all(text, params, client),
        run: (text, params) => db.run(text, params, client),
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  pool,
};

export async function initDb() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('buyer', 'broker', 'admin')),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
      name VARCHAR(150),
      business_name VARCHAR(200),
      phone VARCHAR(20),
      license VARCHAR(100),
      city VARCHAR(100),
      dealer_type VARCHAR(50) CHECK (dealer_type IN ('new', 'used', 'both')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email, role)
    );

    CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS models (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      image_url TEXT,
      CONSTRAINT fk_models_brand
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
      UNIQUE(brand_id, name)
    );

    CREATE TABLE IF NOT EXISTS features (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS model_features (
      model_id INTEGER NOT NULL,
      feature_id INTEGER NOT NULL,
      PRIMARY KEY(model_id, feature_id),
      CONSTRAINT fk_model_features_model
        FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
      CONSTRAINT fk_model_features_feature
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id SERIAL PRIMARY KEY,
      buyer_id INTEGER NOT NULL,
      brand_id INTEGER,
      model_id INTEGER,
      min_year INTEGER,
      max_year INTEGER,
      budget NUMERIC(12,2),
      preferred_feature TEXT,
      description TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_requirements_buyer
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_requirements_brand
        FOREIGN KEY (brand_id) REFERENCES brands(id),
      CONSTRAINT fk_requirements_model
        FOREIGN KEY (model_id) REFERENCES models(id)
    );

    CREATE TABLE IF NOT EXISTS broker_listings (
      id SERIAL PRIMARY KEY,
      broker_id INTEGER NOT NULL,
      brand_id INTEGER NOT NULL,
      model_id INTEGER NOT NULL,
      variant VARCHAR(150),
      year INTEGER NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      fuel_type VARCHAR(30),
      transmission VARCHAR(30),
      body_type VARCHAR(50),
      color VARCHAR(50),
      city VARCHAR(100),
      km_driven INTEGER,
      owners INTEGER,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_broker_listing_broker
        FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_broker_listing_brand
        FOREIGN KEY (brand_id) REFERENCES brands(id),
      CONSTRAINT fk_broker_listing_model
        FOREIGN KEY (model_id) REFERENCES models(id)
    );

    CREATE TABLE IF NOT EXISTS listing_images (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_listing_images_listing
        FOREIGN KEY (listing_id) REFERENCES broker_listings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      requirement_id INTEGER NOT NULL,
      broker_id INTEGER NOT NULL,
      price NUMERIC(12,2),
      details TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_offer_requirement
        FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
      CONSTRAINT fk_offer_broker
        FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_events (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      buyer_name VARCHAR(150),
      buyer_email VARCHAR(255),
      buyer_phone VARCHAR(20),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_contact_listing
        FOREIGN KEY (listing_id) REFERENCES broker_listings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_requirements_buyer ON requirements(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
    CREATE INDEX IF NOT EXISTS idx_broker_listings_broker ON broker_listings(broker_id);
    CREATE INDEX IF NOT EXISTS idx_broker_listings_status ON broker_listings(status);
    CREATE INDEX IF NOT EXISTS idx_offers_requirement ON offers(requirement_id);
    CREATE INDEX IF NOT EXISTS idx_offers_broker ON offers(broker_id);
    CREATE INDEX IF NOT EXISTS idx_contact_listing ON contact_events(listing_id);
    CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);
  `);

  // Migrate existing databases safely
  try {
    await db.run("ALTER TABLE users ADD COLUMN dealer_type VARCHAR(50) CHECK (dealer_type IN ('new', 'used', 'both'));");
  } catch (err) {
    // Column already exists or another error, ignore if column exists
    if (!err.message.includes('already exists')) {
      console.error('Migration error:', err);
    }
  }

  try {
    await db.run("ALTER TABLE users ADD COLUMN otp_code VARCHAR(10);");
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.error('Migration error (otp_code):', err);
    }
  }

  try {
    await db.run("ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMP;");
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.error('Migration error (otp_expires_at):', err);
    }
  }
}

async function seedAdmin() {
  const adminExists = await db.get('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['admin']);
  if (!adminExists) {
    const hashedPw = bcrypt.hashSync('admin123', 10);
    await db.run(
      `
        INSERT INTO users (email, password, role, status, name)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        'admin@carmatchr.com',
        hashedPw,
        'admin',
        'active',
        'Platform Admin',
      ]
    );
  }
}

console.log('Connecting to database...');
try {
  await initDb();
  console.log('Database tables initialized/verified successfully.');
  await seedAdmin();
  console.log('Admin user seeded/verified successfully.');
} catch (err) {
  console.error('CRITICAL DATABASE ERROR:', err);
  process.exit(1);
}
