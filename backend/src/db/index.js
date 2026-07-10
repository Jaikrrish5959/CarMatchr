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
      state VARCHAR(100),
      address TEXT,
      authorized_brands TEXT,
      showroom_address TEXT,
      business_type VARCHAR(50),
      description TEXT,
      website TEXT,
      maps_link TEXT,
      language VARCHAR(50),
      phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
      terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email, role)
    );

    CREATE TABLE IF NOT EXISTS phone_verifications (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE,
      otp_code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      requirement_id INTEGER NOT NULL,
      broker_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('buyer', 'broker', 'admin')),
      body TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_message_requirement
        FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
      CONSTRAINT fk_message_broker
        FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS standard_inquiries (
      id SERIAL PRIMARY KEY,
      listing_id VARCHAR(50) NOT NULL,
      buyer_name VARCHAR(150),
      buyer_email VARCHAR(255),
      buyer_phone VARCHAR(20),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verified_guest_sessions (
      phone VARCHAR(50) PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id SERIAL PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_requirements_buyer ON requirements(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
    CREATE INDEX IF NOT EXISTS idx_broker_listings_broker ON broker_listings(broker_id);
    CREATE INDEX IF NOT EXISTS idx_broker_listings_status ON broker_listings(status);
    CREATE INDEX IF NOT EXISTS idx_offers_requirement ON offers(requirement_id);
    CREATE INDEX IF NOT EXISTS idx_offers_broker ON offers(broker_id);
    CREATE INDEX IF NOT EXISTS idx_messages_requirement_broker ON messages(requirement_id, broker_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_contact_listing ON contact_events(listing_id);
    CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);

    CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      state VARCHAR(100) NOT NULL,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS fuel_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS body_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS transmissions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    );
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

  // Requirements migrations
  const reqCols = [
    { name: 'vehicle_type', type: "VARCHAR(30) DEFAULT 'new'" },
    { name: 'variant', type: 'VARCHAR(150)' },
    { name: 'budget_min', type: 'NUMERIC(12,2)' },
    { name: 'budget_max', type: 'NUMERIC(12,2)' },
    { name: 'state', type: 'VARCHAR(100)' },
    { name: 'city', type: 'VARCHAR(100)' },
    { name: 'fuel_type', type: 'VARCHAR(50)' },
    { name: 'transmission', type: 'VARCHAR(50)' },
    { name: 'color_preference', type: 'VARCHAR(100)' },
    { name: 'purchase_timeline', type: 'VARCHAR(50)' },
    { name: 'max_km_driven', type: 'INTEGER' },
    { name: 'ownership_preference', type: 'VARCHAR(50)' },
    { name: 'accident_history_preference', type: 'VARCHAR(50)' },
    { name: 'visibility', type: "VARCHAR(50) DEFAULT 'marketplace'" },
    { name: 'exclusive_dealer_id', type: 'INTEGER' },
    { name: 'exclusive_dealer_name', type: 'VARCHAR(200)' }
  ];

  for (const col of reqCols) {
    try {
      await db.run(`ALTER TABLE requirements ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
        console.error(`Migration error (requirements ${col.name}):`, err);
      }
    }
  }

  // Offers migrations
  const offerCols = [
    { name: 'variant', type: 'VARCHAR(150)' },
    { name: 'year', type: 'INTEGER' },
    { name: 'dealer_name', type: 'VARCHAR(200)' },
    { name: 'dealer_location', type: 'VARCHAR(150)' },
    { name: 'price_breakdown', type: 'TEXT' },
    { name: 'delivery_time', type: 'VARCHAR(100)' },
    { name: 'stock_status', type: 'VARCHAR(50)' },
    { name: 'benefits', type: 'TEXT' },
    { name: 'registration_year', type: 'INTEGER' },
    { name: 'km_driven', type: 'INTEGER' },
    { name: 'ownership', type: 'VARCHAR(50)' },
    { name: 'insurance_valid_till', type: 'VARCHAR(100)' },
    { name: 'service_history', type: 'VARCHAR(100)' },
    { name: 'vehicle_condition', type: 'VARCHAR(100)' },
    { name: 'shortlisted', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'negotiation_awaiting_from', type: "VARCHAR(20) CHECK (negotiation_awaiting_from IN ('broker', 'buyer'))" }
  ];

  for (const col of offerCols) {
    try {
      await db.run(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
        console.error(`Migration error (offers ${col.name}):`, err);
      }
    }
  }

  const messageCols = [
    { name: 'requirement_id', type: 'INTEGER' },
    { name: 'broker_id', type: 'INTEGER' },
    { name: 'sender_id', type: 'INTEGER' },
    { name: 'sender_role', type: "VARCHAR(20) CHECK (sender_role IN ('buyer', 'broker', 'admin'))" },
    { name: 'body', type: 'TEXT' },
  ];

  for (const col of messageCols) {
    try {
      await db.run(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
        console.error(`Migration error (messages ${col.name}):`, err);
      }
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

  const extraUserCols = [
    { name: 'state', type: 'VARCHAR(100)' },
    { name: 'address', type: 'TEXT' },
    { name: 'authorized_brands', type: 'TEXT' },
    { name: 'showroom_address', type: 'TEXT' },
    { name: 'business_type', type: 'VARCHAR(50)' },
    { name: 'description', type: 'TEXT' },
    { name: 'website', type: 'TEXT' },
    { name: 'maps_link', type: 'TEXT' },
    { name: 'language', type: 'VARCHAR(50)' }
  ];

  for (const col of extraUserCols) {
    try {
      await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
        console.error(`Migration error (users ${col.name}):`, err);
      }
    }
  }

  // Migrate: add phone_verified column to existing users tables
  try {
    await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;');
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.error('Migration error (phone_verified):', err);
    }
  }

  // Create phone_verifications table for temporary OTP storage (if not exists)
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL UNIQUE,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Migration error (phone_verifications table):', err);
  }

  // Update status CHECK constraint for users soft-delete status
  try {
    await db.run("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;");
  } catch (err) {
    console.error('Migration error (drop users_status_check constraint):', err);
  }
  try {
    await db.run("ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'pending', 'deleted'));");
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate constraint')) {
      console.error('Migration error (add users_status_check constraint):', err);
    }
  }

  // Add notification preferences and founding year columns to users table
  const notifPrefsCols = [
    { name: 'push_notifications', type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
    { name: 'email_notifications', type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
    { name: 'sms_notifications', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
    { name: 'new_requirement_alerts', type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
    { name: 'offer_updates', type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
    { name: 'buyer_messages', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
    { name: 'founding_year', type: 'INTEGER' },
    { name: 'terms_accepted', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
    { name: 'privacy_accepted', type: 'BOOLEAN NOT NULL DEFAULT FALSE' },
    { name: 'marketing_consent', type: 'BOOLEAN NOT NULL DEFAULT FALSE' }
  ];
  for (const col of notifPrefsCols) {
    try {
      await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
        console.error(`Migration error (users column ${col.name}):`, err);
      }
    }
  }

  // Add expires_at and extended columns to requirements table
  const reqExpiryCols = [
    { name: 'expires_at', type: 'TIMESTAMP' },
    { name: 'extended', type: 'BOOLEAN NOT NULL DEFAULT FALSE' }
  ];
  for (const col of reqExpiryCols) {
    try {
      await db.run(`ALTER TABLE requirements ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
        console.error(`Migration error (requirements column ${col.name}):`, err);
      }
    }
  }

  // Create saved_requirements join table
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS saved_requirements (
        broker_id INTEGER NOT NULL,
        requirement_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(broker_id, requirement_id),
        CONSTRAINT fk_saved_req_broker FOREIGN KEY(broker_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_saved_req_requirement FOREIGN KEY(requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
      );
    `);
  } catch (err) {
    console.error('Migration error (saved_requirements table):', err);
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

async function seedMasterData() {
  // Seed cities
  const citiesExist = await db.get('SELECT 1 FROM cities LIMIT 1');
  if (!citiesExist) {
    const defaultCities = [
      { name: 'Chennai', state: 'Tamil Nadu' },
      { name: 'Coimbatore', state: 'Tamil Nadu' },
      { name: 'Madurai', state: 'Tamil Nadu' },
      { name: 'Tiruchirappalli', state: 'Tamil Nadu' },
      { name: 'Salem', state: 'Tamil Nadu' },
      { name: 'Thanjavur', state: 'Tamil Nadu' },
      { name: 'Vellore', state: 'Tamil Nadu' },
      { name: 'Tirunelveli', state: 'Tamil Nadu' },
      { name: 'Erode', state: 'Tamil Nadu' },
      { name: 'Dindigul', state: 'Tamil Nadu' },
      { name: 'Kanchipuram', state: 'Tamil Nadu' },
      { name: 'Tiruppur', state: 'Tamil Nadu' },
      { name: 'Krishnagiri', state: 'Tamil Nadu' },
      { name: 'Dharmapuri', state: 'Tamil Nadu' },
      { name: 'Villupuram', state: 'Tamil Nadu' },
      { name: 'Ariyalur', state: 'Tamil Nadu' },
      { name: 'Chengalpattu', state: 'Tamil Nadu' },
      { name: 'Cuddalore', state: 'Tamil Nadu' },
      { name: 'Kallakurichi', state: 'Tamil Nadu' },
      { name: 'Kanyakumari', state: 'Tamil Nadu' },
      { name: 'Karur', state: 'Tamil Nadu' },
      { name: 'Mayiladuthurai', state: 'Tamil Nadu' },
      { name: 'Nagapattinam', state: 'Tamil Nadu' },
      { name: 'Namakkal', state: 'Tamil Nadu' },
      { name: 'Nilgiris', state: 'Tamil Nadu' },
      { name: 'Perambalur', state: 'Tamil Nadu' },
      { name: 'Pudukkottai', state: 'Tamil Nadu' },
      { name: 'Ramanathapuram', state: 'Tamil Nadu' },
      { name: 'Ranipet', state: 'Tamil Nadu' },
      { name: 'Sivaganga', state: 'Tamil Nadu' },
      { name: 'Tenkasi', state: 'Tamil Nadu' },
      { name: 'Theni', state: 'Tamil Nadu' },
      { name: 'Thoothukudi', state: 'Tamil Nadu' },
      { name: 'Tirupattur', state: 'Tamil Nadu' },
      { name: 'Tiruvallur', state: 'Tamil Nadu' },
      { name: 'Tiruvannamalai', state: 'Tamil Nadu' },
      { name: 'Virudhunagar', state: 'Tamil Nadu' }
    ];
    for (const c of defaultCities) {
      await db.run('INSERT INTO cities (name, state) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [c.name, c.state]);
    }
  }

  // Seed fuel types
  const fuelExist = await db.get('SELECT 1 FROM fuel_types LIMIT 1');
  if (!fuelExist) {
    const defaultFuels = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG', 'LPG'];
    for (const f of defaultFuels) {
      await db.run('INSERT INTO fuel_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [f]);
    }
  }

  // Seed body types
  const bodyExist = await db.get('SELECT 1 FROM body_types LIMIT 1');
  if (!bodyExist) {
    const defaultBodies = ['Sedan', 'SUV', 'Hatchback', 'MUV', 'Coupe', 'Convertible', 'Luxury'];
    for (const b of defaultBodies) {
      await db.run('INSERT INTO body_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [b]);
    }
  }

  // Seed transmissions
  const transExist = await db.get('SELECT 1 FROM transmissions LIMIT 1');
  if (!transExist) {
    const defaultTrans = ['Manual', 'Automatic', 'Any'];
    for (const t of defaultTrans) {
      await db.run('INSERT INTO transmissions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [t]);
    }
  }
}

console.log('Connecting to database...');
try {
  await initDb();
  console.log('Database tables initialized/verified successfully.');
  await seedAdmin();
  console.log('Admin user seeded/verified successfully.');
  await seedMasterData();
  console.log('Master lookup data seeded successfully.');
} catch (err) {
  console.error('CRITICAL DATABASE ERROR:', err);
  process.exit(1);
}
