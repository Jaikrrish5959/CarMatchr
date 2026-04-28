import express from 'express';
import cors from 'cors';
import path from 'path';
import { db } from './db.js';
import { seedCatalog } from './catalogSeeder.js';

const app = express();
const PORT = 4001;
seedCatalog();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'db', 'uploads')));

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

app.post('/api/auth/register', (req, res) => {
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
  db.prepare(`
    INSERT INTO users (id, email, password, role, status, name, businessName, phone, license, city, createdAt)
    VALUES (@id, @email, @password, @role, @status, @name, @businessName, @phone, @license, @city, @createdAt)
  `).run({
    id,
    email: user.email,
    password: user.password,
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

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password and role are required.' });
  }
  const found = db.prepare('SELECT * FROM users WHERE email = ? AND role = ? LIMIT 1').get(email, role);
  if (!found || found.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  return res.json({ user: mapUser(found) });
});

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

app.get('/api/data', (_req, res) => {
  const requirements = db.prepare('SELECT * FROM requirements ORDER BY createdAt DESC').all();
  const offers = db.prepare('SELECT * FROM offers ORDER BY createdAt DESC').all().map((o) => ({ ...o, isRead: !!o.isRead }));
  const brokerListings = db.prepare('SELECT * FROM brokerListings ORDER BY createdAt DESC').all();
  res.json({ requirements, offers, brokerListings });
});

app.post('/api/requirements', (req, res) => {
  const payload = req.body;
  const id = `req-${Date.now()}`;
  db.prepare(`
    INSERT INTO requirements (id, buyerId, make, model, yearRange, budget, description, status, createdAt)
    VALUES (@id, @buyerId, @make, @model, @yearRange, @budget, @description, 'open', @createdAt)
  `).run({
    id,
    buyerId: payload.buyerId,
    make: payload.make,
    model: payload.model,
    yearRange: payload.yearRange,
    budget: payload.budget,
    description: payload.description,
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

app.patch('/api/requirements/:id/close', (req, res) => {
  db.prepare("UPDATE requirements SET status = 'closed' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/offers', (req, res) => {
  const o = req.body;
  const id = `offer-${Date.now()}`;
  db.prepare(`
    INSERT INTO offers (id, requirementId, brokerId, brokerName, brokerPhone, price, details, status, isRead, createdAt)
    VALUES (@id, @requirementId, @brokerId, @brokerName, @brokerPhone, @price, @details, 'pending', 0, @createdAt)
  `).run({
    id,
    requirementId: o.requirementId,
    brokerId: o.brokerId,
    brokerName: o.brokerName,
    brokerPhone: o.brokerPhone,
    price: o.price,
    details: o.details,
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

app.post('/api/listings', (req, res) => {
  const l = req.body;
  const id = `bl-${Date.now()}`;
  db.prepare(`
    INSERT INTO brokerListings (id, brokerId, brokerName, make, model, variant, year, price, fuelType, transmission, bodyType, color, city, kmDriven, owners, description, status, createdAt)
    VALUES (@id, @brokerId, @brokerName, @make, @model, @variant, @year, @price, @fuelType, @transmission, @bodyType, @color, @city, @kmDriven, @owners, @description, 'active', @createdAt)
  `).run({
    id,
    ...l,
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

app.patch('/api/listings/:id/sold', (req, res) => {
  db.prepare("UPDATE brokerListings SET status = 'sold' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

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

app.patch('/api/admin/brands/:id/logo', (req, res) => {
  db.prepare('UPDATE brands SET logoUrl = ? WHERE id = ?').run(req.body.logoUrl ?? null, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/models/:id/image', (req, res) => {
  db.prepare('UPDATE models SET imageUrl = ? WHERE id = ?').run(req.body.imageUrl ?? null, req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`CarMatchr API running on http://localhost:${PORT}`);
});
