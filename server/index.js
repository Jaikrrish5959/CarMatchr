import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { seedCatalog } from './catalogSeeder.js';

const app = express();
const PORT = process.env.PORT || 4001;
const isVercel = !!process.env.VERCEL;

seedCatalog();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --- Upload directory ---
const uploadsDir = isVercel
  ? path.join('/tmp', 'uploads')
  : path.resolve(process.cwd(), 'db', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// --- Multer config for listing images ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

const SALT_ROUNDS = 10;

const mapUser = (row) => ({
  id: row.id,
  email: row.email,
  role: row.role,
  status: row.status,
  name: row.name ?? undefined,
  businessName: row.businessName ?? undefined,
  phone: row.phone ?? undefined,
  license: row.license ?? undefined,
  city: row.city ?? undefined,
});

// ========== AUTH ==========

app.post('/api/auth/register', async (req, res) => {
  const user = req.body;
  if (!user?.email || !user?.password || !user?.role) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (user.role === 'broker' && !user.phone) {
    return res.status(400).json({ error: 'Broker account requires a contact number.' });
  }
  const exists = db
    .prepare('SELECT 1 FROM users WHERE email = ? AND role = ? LIMIT 1')
    .get(user.email, user.role);
  if (exists) {
    return res.status(409).json({ error: `An ${user.role} account already exists for this email.` });
  }

  const id = `${user.role}-${Date.now()}`;
  const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

  db.prepare(`
    INSERT INTO users (id, email, password, role, status, name, businessName, phone, license, city, createdAt)
    VALUES (@id, @email, @password, @role, @status, @name, @businessName, @phone, @license, @city, @createdAt)
  `).run({
    id,
    email: user.email,
    password: hashedPassword,
    role: user.role,
    status: user.role === 'broker' ? 'pending' : 'active',
    name: user.name ?? null,
    businessName: user.businessName ?? null,
    phone: user.phone ?? null,
    license: user.license ?? null,
    city: user.city ?? null,
    createdAt: new Date().toISOString(),
  });
  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return res.json({ user: mapUser(created) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password and role are required.' });
  }
  const found = db.prepare('SELECT * FROM users WHERE email = ? AND role = ? LIMIT 1').get(email, role);
  if (!found) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your email, password, and selected role.' });
  }

  let passwordMatch = false;
  if (found.password.startsWith('$2')) {
    passwordMatch = await bcrypt.compare(password, found.password);
  } else {
    passwordMatch = found.password === password;
    if (passwordMatch) {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, found.id);
    }
  }

  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
  }
  return res.json({ user: mapUser(found) });
});

// ========== USERS ==========

app.patch('/api/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return res.json({ user: mapUser(row) });
});

// ========== CATALOG ==========

app.get('/api/catalog/brands', (_req, res) => {
  const brands = db.prepare('SELECT id, name, logoUrl FROM brands ORDER BY name').all();
  const modelStmt = db.prepare('SELECT id, name, imageUrl FROM models WHERE brandId = ? ORDER BY name');
  const featureStmt = db.prepare(`
    SELECT f.id, f.name
    FROM modelFeatures mf
    JOIN features f ON f.id = mf.featureId
    WHERE mf.modelId = ?
    ORDER BY f.name
  `);
  const response = brands.map((brand) => {
    const models = modelStmt.all(brand.id).map((model) => ({
      ...model,
      features: featureStmt.all(model.id),
    }));
    return { ...brand, models };
  });
  res.json(response);
});

app.get('/api/catalog/features', (_req, res) => {
  const rows = db.prepare('SELECT id, name FROM features ORDER BY name').all();
  res.json(rows);
});

// ========== DATA (bulk fetch) ==========

app.get('/api/data', (_req, res) => {
  const requirements = db.prepare('SELECT * FROM requirements ORDER BY createdAt DESC').all();
  const offers = db.prepare('SELECT * FROM offers ORDER BY createdAt DESC').all().map((o) => ({ ...o, isRead: !!o.isRead }));
  const brokerListings = db.prepare('SELECT * FROM brokerListings ORDER BY createdAt DESC').all();

  const imgStmt = db.prepare('SELECT imagePath, sortOrder FROM listingImages WHERE listingId = ? ORDER BY sortOrder');
  const leadStmt = db.prepare('SELECT COUNT(*) as cnt FROM contactEvents WHERE listingId = ?');
  const listingsWithExtras = brokerListings.map((l) => ({
    ...l,
    images: imgStmt.all(l.id).map((r) => r.imagePath),
    leadsCount: leadStmt.get(l.id)?.cnt ?? 0,
  }));

  res.json({ requirements, offers, brokerListings: listingsWithExtras });
});

// ========== REQUIREMENTS ==========

app.post('/api/requirements', (req, res) => {
  const payload = req.body;
  if (!payload.buyerId || !payload.make || !payload.model || !payload.budget) {
    return res.status(400).json({ error: 'Please fill in all required fields (make, model, budget).' });
  }
  const id = `req-${Date.now()}`;
  db.prepare(`
    INSERT INTO requirements (id, buyerId, make, model, yearRange, budget, preferredFeature, description, status, createdAt)
    VALUES (@id, @buyerId, @make, @model, @yearRange, @budget, @preferredFeature, @description, 'open', @createdAt)
  `).run({
    id,
    buyerId: payload.buyerId,
    make: payload.make,
    model: payload.model,
    yearRange: payload.yearRange || '',
    budget: payload.budget,
    preferredFeature: payload.preferredFeature ?? '',
    description: payload.description || '',
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true, id });
});

app.patch('/api/requirements/:id/close', (req, res) => {
  db.prepare("UPDATE requirements SET status = 'closed' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ========== OFFERS ==========

app.post('/api/offers', (req, res) => {
  const o = req.body;
  if (!o.requirementId || !o.brokerId || !o.price) {
    return res.status(400).json({ error: 'Please provide all required offer details.' });
  }
  const id = `offer-${Date.now()}`;
  db.prepare(`
    INSERT INTO offers (id, requirementId, brokerId, brokerName, brokerPhone, price, details, status, isRead, createdAt)
    VALUES (@id, @requirementId, @brokerId, @brokerName, @brokerPhone, @price, @details, 'pending', 0, @createdAt)
  `).run({
    id,
    requirementId: o.requirementId,
    brokerId: o.brokerId,
    brokerName: o.brokerName || '',
    brokerPhone: o.brokerPhone || '',
    price: o.price,
    details: o.details || '',
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

app.patch('/api/offers/:id/read', (req, res) => {
  db.prepare('UPDATE offers SET isRead = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/offers/:id/reject', (req, res) => {
  db.prepare("UPDATE offers SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/offers/:id/accept', (req, res) => {
  const { id } = req.params;
  const { reqId } = req.body;
  db.transaction(() => {
    db.prepare("UPDATE offers SET status = 'accepted' WHERE id = ?").run(id);
    db.prepare("UPDATE offers SET status = 'rejected' WHERE requirementId = ? AND id != ?").run(reqId, id);
    db.prepare("UPDATE requirements SET status = 'closed' WHERE id = ?").run(reqId);
  })();
  res.json({ ok: true });
});

// ========== BROKER LISTINGS ==========

app.post('/api/listings', (req, res) => {
  const l = req.body;
  if (!l.brokerId || !l.make || !l.model || !l.price || !l.city) {
    return res.status(400).json({ error: 'Please fill in all required listing fields.' });
  }
  const id = `bl-${Date.now()}`;
  db.prepare(`
    INSERT INTO brokerListings (id, brokerId, brokerName, make, model, variant, year, price, fuelType, transmission, bodyType, color, city, kmDriven, owners, description, status, createdAt)
    VALUES (@id, @brokerId, @brokerName, @make, @model, @variant, @year, @price, @fuelType, @transmission, @bodyType, @color, @city, @kmDriven, @owners, @description, 'active', @createdAt)
  `).run({
    id,
    brokerId: l.brokerId,
    brokerName: l.brokerName || '',
    make: l.make,
    model: l.model,
    variant: l.variant || '',
    year: l.year || 2024,
    price: l.price,
    fuelType: l.fuelType || 'Petrol',
    transmission: l.transmission || 'Manual',
    bodyType: l.bodyType || 'SUV',
    color: l.color || '',
    city: l.city,
    kmDriven: l.kmDriven || 0,
    owners: l.owners || 1,
    description: l.description || '',
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true, id });
});

app.patch('/api/listings/:id/sold', (req, res) => {
  db.prepare("UPDATE brokerListings SET status = 'sold' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ========== LISTING IMAGES ==========

app.post('/api/listings/:id/images', upload.array('images', 10), (req, res) => {
  const listingId = req.params.id;
  const listing = db.prepare('SELECT id FROM brokerListings WHERE id = ?').get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  const files = req.files || [];
  const insertStmt = db.prepare(
    'INSERT INTO listingImages (listingId, imagePath, sortOrder, createdAt) VALUES (?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  const paths = [];
  files.forEach((file, i) => {
    const relativePath = `/uploads/${file.filename}`;
    insertStmt.run(listingId, relativePath, i, now);
    paths.push(relativePath);
  });

  res.json({ ok: true, images: paths });
});

app.get('/api/listings/:id/images', (req, res) => {
  const images = db.prepare('SELECT imagePath FROM listingImages WHERE listingId = ? ORDER BY sortOrder')
    .all(req.params.id)
    .map((r) => r.imagePath);
  res.json(images);
});

// ========== CONTACT EVENTS ==========

app.post('/api/listings/:id/contact', (req, res) => {
  const listingId = req.params.id;
  const listing = db.prepare('SELECT id FROM brokerListings WHERE id = ?').get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  const { buyerName, buyerEmail, buyerPhone } = req.body;
  db.prepare(
    'INSERT INTO contactEvents (listingId, buyerName, buyerEmail, buyerPhone, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(listingId, buyerName || 'Anonymous', buyerEmail || '', buyerPhone || '', new Date().toISOString());

  res.json({ ok: true });
});

app.get('/api/listings/:id/leads', (req, res) => {
  const leads = db.prepare('SELECT * FROM contactEvents WHERE listingId = ? ORDER BY createdAt DESC').all(req.params.id);
  res.json(leads);
});

// ========== ADMIN ==========

app.get('/api/admin/users', (_req, res) => {
  const rows = db.prepare('SELECT id, email, role, status, name, businessName, phone, city FROM users ORDER BY createdAt DESC').all();
  res.json(rows);
});

app.post('/api/admin/features', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Feature name required.' });
  db.prepare('INSERT OR IGNORE INTO features(name) VALUES (?)').run(name);
  res.json({ ok: true });
});

app.post('/api/admin/model-features', (req, res) => {
  const { modelId, featureId } = req.body;
  db.prepare('INSERT OR IGNORE INTO modelFeatures(modelId, featureId) VALUES (?, ?)').run(modelId, featureId);
  res.json({ ok: true });
});

app.delete('/api/admin/model-features', (req, res) => {
  const { modelId, featureId } = req.body;
  if (!modelId || !featureId) return res.status(400).json({ error: 'modelId and featureId required.' });
  db.prepare('DELETE FROM modelFeatures WHERE modelId = ? AND featureId = ?').run(modelId, featureId);
  res.json({ ok: true });
});

app.patch('/api/admin/brands/:id/logo', (req, res) => {
  db.prepare('UPDATE brands SET logoUrl = ? WHERE id = ?').run(req.body.logoUrl ?? null, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/models/:id/image', (req, res) => {
  db.prepare('UPDATE models SET imageUrl = ? WHERE id = ?').run(req.body.imageUrl ?? null, req.params.id);
  res.json({ ok: true });
});

// Only listen when running locally (not on Vercel serverless)
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`CarMatchr API running on http://localhost:${PORT}`);
  });
}

export default app;
