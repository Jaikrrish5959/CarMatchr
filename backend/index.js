import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db.js';
import { seedCatalog } from './catalogSeeder.js';
import { authenticate, requireRole, requireOwnership, JWT_SECRET } from './middleware.js';

// ========== ZOD SCHEMAS ==========
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['buyer', 'broker']),
  name: z.string().optional().nullable(),
  businessName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  license: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
}).refine(data => {
  if (data.role === 'broker' && !data.phone) return false;
  return true;
}, { message: 'Broker account requires a contact number.', path: ['phone'] });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['buyer', 'broker', 'admin'])
});

const googleBrokerRegisterSchema = z.object({
  email: z.string().email(),
  businessName: z.string().min(1, 'Dealership name is required.'),
  license: z.string().min(1, 'License number is required.'),
  city: z.string().min(1, 'City is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  credential: z.string().min(1, 'Google credential is required.'),
});

const requirementSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  budget: z.string().min(1),
  yearRange: z.string().optional(),
  preferredFeature: z.string().optional().nullable(),
  description: z.string().optional()
});

const offerSchema = z.object({
  requirementId: z.string().min(1),
  brokerName: z.string().optional(),
  brokerPhone: z.string().optional(),
  price: z.string().min(1),
  details: z.string().optional()
});

const listingSchema = z.object({
  brokerName: z.string().optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().optional(),
  year: z.number().int().min(1900).max(2100),
  price: z.number().positive(),
  fuelType: z.string().min(1),
  transmission: z.string().min(1),
  bodyType: z.string().min(1),
  color: z.string().optional(),
  city: z.string().min(1),
  kmDriven: z.number().nonnegative(),
  owners: z.number().int().positive(),
  description: z.string().optional()
});


const app = express();
const PORT = process.env.PORT || 4001;
const isVercel = !!process.env.VERCEL;

seedCatalog();

// ========== SECURITY MIDDLEWARE ==========

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS — restrict to known origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));

app.use(express.json({ limit: '2mb' }));

// Rate limiting — auth endpoints
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Rate limiting — general API
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

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
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (!allowed.test(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only image files (jpg, png, webp, gif) are allowed.'));
    }
    cb(null, true);
  },
});

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

/** Sign a JWT for a given user row */
const signToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

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

// ========== GOOGLE OAUTH CONFIG ==========
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google Sign-In is not configured on the server. Please define GOOGLE_CLIENT_ID in your environment.');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

// ========== HEALTH CHECK ==========

app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// ========== AUTH (public) ==========

app.post('/api/auth/google', async (req, res) => {
  const { credential, role } = req.body;
  if (!credential || !role) {
    return res.status(400).json({ error: 'Credential and role are required.' });
  }

  try {
    const payload = await verifyGoogleToken(credential);
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google credential.' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || '';

    // Check if the user exists with this email and role
    const found = db.prepare('SELECT * FROM users WHERE email = ? AND role = ? LIMIT 1').get(email, role);
    if (found) {
      // User exists! Sign token and return.
      const token = signToken(found);
      return res.json({ token, user: mapUser(found) });
    }

    // User does not exist, so they are registering.
    if (role === 'buyer') {
      const id = `buyer-google-${crypto.randomUUID()}`;
      // Generate secure dummy password hash for schema compatibility
      const dummyPassword = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(dummyPassword, SALT_ROUNDS);

      db.prepare(`
        INSERT INTO users (id, email, password, role, status, name, createdAt)
        VALUES (@id, @email, @password, @role, @status, @name, @createdAt)
      `).run({
        id,
        email,
        password: hashedPassword,
        role: 'buyer',
        status: 'active',
        name: name || null,
        createdAt: new Date().toISOString(),
      });

      const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      const token = signToken(created);
      return res.json({ token, user: mapUser(created) });
    } else if (role === 'broker') {
      // Brokers need additional details before creating DB record.
      return res.json({
        isNewUser: true,
        email,
        name,
        credential,
      });
    } else {
      return res.status(400).json({ error: 'Invalid role.' });
    }
  } catch (err) {
    console.error('Google Auth Error:', err);
    return res.status(400).json({ error: err.message || 'Google authentication failed.' });
  }
});

app.post('/api/auth/google/register', async (req, res) => {
  const result = googleBrokerRegisterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error?.issues?.[0]?.message || 'Invalid input data.' });
  }
  const { email, businessName, license, city, phone, credential } = result.data;

  try {
    const payload = await verifyGoogleToken(credential);
    if (!payload || !payload.email || payload.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid Google credential.' });
    }

    // Verify user doesn't already exist as a broker
    const exists = db
      .prepare('SELECT 1 FROM users WHERE email = ? AND role = ? LIMIT 1')
      .get(email, 'broker');
    if (exists) {
      return res.status(409).json({ error: 'A broker account already exists for this email.' });
    }

    const id = `broker-google-${crypto.randomUUID()}`;
    const dummyPassword = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(dummyPassword, SALT_ROUNDS);

    db.prepare(`
      INSERT INTO users (id, email, password, role, status, businessName, license, city, phone, createdAt)
      VALUES (@id, @email, @password, @role, @status, @businessName, @license, @city, @phone, @createdAt)
    `).run({
      id,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'broker',
      status: 'active',
      businessName,
      license,
      city,
      phone,
      createdAt: new Date().toISOString(),
    });

    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken(created);
    return res.json({ token, user: mapUser(created) });
  } catch (err) {
    console.error('Google Broker Signup Error:', err);
    return res.status(400).json({ error: err.message || 'Google registration failed.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error?.issues?.[0]?.message || 'Invalid input data.' });
  }
  const user = result.data;
  
  const exists = db
    .prepare('SELECT 1 FROM users WHERE email = ? AND role = ? LIMIT 1')
    .get(user.email, user.role);
  if (exists) {
    return res.status(409).json({ error: `An ${user.role} account already exists for this email.` });
  }

  const id = `${user.role}-${crypto.randomUUID()}`;
  const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

  db.prepare(`
    INSERT INTO users (id, email, password, role, status, name, businessName, phone, license, city, createdAt)
    VALUES (@id, @email, @password, @role, @status, @name, @businessName, @phone, @license, @city, @createdAt)
  `).run({
    id,
    email: user.email,
    password: hashedPassword,
    role: user.role,
    status: 'active',
    name: user.name ?? null,
    businessName: user.businessName ?? null,
    phone: user.phone ?? null,
    license: user.license ?? null,
    city: user.city ?? null,
    createdAt: new Date().toISOString(),
  });
  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(created);
  return res.json({ token, user: mapUser(created) });
});

app.post('/api/auth/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Email, password and role are required.' });
  }
  const { email, password, role } = result.data;
  const found = db.prepare('SELECT * FROM users WHERE email = ? AND role = ? LIMIT 1').get(email, role);
  if (!found) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your email, password, and selected role.' });
  }

  // Always use bcrypt — no plaintext fallback
  const passwordMatch = await bcrypt.compare(password, found.password);

  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
  }
  const token = signToken(found);
  return res.json({ token, user: mapUser(found) });
});

// ========== USERS (authenticated) ==========

// Update own profile
app.patch('/api/users/:id/profile', authenticate, requireOwnership('id'), (req, res) => {
  const { id } = req.params;
  const { phone, name } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'User not found.' });

  const updatedPhone = phone !== undefined ? (phone || null) : row.phone;
  const updatedName = name !== undefined ? (name || null) : (row.name ?? row.businessName ?? null);

  if (row.role === 'broker') {
    db.prepare('UPDATE users SET phone = ?, businessName = ? WHERE id = ?').run(updatedPhone, updatedName, id);
  } else {
    db.prepare('UPDATE users SET phone = ?, name = ? WHERE id = ?').run(updatedPhone, updatedName, id);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return res.json({ user: mapUser(updated) });
});

// Update user status — admin only
app.patch('/api/users/:id/status', authenticate, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return res.json({ user: mapUser(row) });
});

// ========== CATALOG (public read) ==========

app.get('/api/catalog/brands', (_req, res) => {
  // Single query with JOINs instead of N+1
  const rows = db.prepare(`
    SELECT b.id AS brandId, b.name AS brandName, b.logoUrl,
           m.id AS modelId, m.name AS modelName, m.imageUrl,
           f.id AS featureId, f.name AS featureName
    FROM brands b
    LEFT JOIN models m ON m.brandId = b.id
    LEFT JOIN modelFeatures mf ON mf.modelId = m.id
    LEFT JOIN features f ON f.id = mf.featureId
    ORDER BY b.name, m.name, f.name
  `).all();

  const brandsMap = new Map();
  for (const row of rows) {
    if (!brandsMap.has(row.brandId)) {
      brandsMap.set(row.brandId, { id: row.brandId, name: row.brandName, logoUrl: row.logoUrl, models: new Map() });
    }
    const brand = brandsMap.get(row.brandId);
    if (row.modelId && !brand.models.has(row.modelId)) {
      brand.models.set(row.modelId, { id: row.modelId, name: row.modelName, imageUrl: row.imageUrl, features: [] });
    }
    if (row.modelId && row.featureId) {
      const model = brand.models.get(row.modelId);
      if (!model.features.some(f => f.id === row.featureId)) {
        model.features.push({ id: row.featureId, name: row.featureName });
      }
    }
  }

  const response = Array.from(brandsMap.values()).map(b => ({
    ...b,
    models: Array.from(b.models.values()),
  }));
  res.json(response);
});

app.get('/api/catalog/features', (_req, res) => {
  const rows = db.prepare('SELECT id, name FROM features ORDER BY name').all();
  res.json(rows);
});

// ========== DATA (authenticated, bulk fetch) ==========

app.get('/api/data', authenticate, (_req, res) => {
  const requirements = db.prepare('SELECT * FROM requirements ORDER BY createdAt DESC').all();
  const offers = db.prepare('SELECT * FROM offers ORDER BY createdAt DESC').all().map((o) => ({ ...o, isRead: !!o.isRead }));

  // Single query for listings with image count and lead count
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

// ========== REQUIREMENTS (authenticated) ==========

app.post('/api/requirements', authenticate, (req, res) => {
  const result = requirementSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Please fill in all required fields (make, model, budget).' });
  }
  const payload = result.data;
  // Use authenticated user's ID, not client-supplied
  const buyerId = req.user.sub;
  const id = `req-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO requirements (id, buyerId, make, model, yearRange, budget, preferredFeature, description, status, createdAt)
    VALUES (@id, @buyerId, @make, @model, @yearRange, @budget, @preferredFeature, @description, 'open', @createdAt)
  `).run({
    id,
    buyerId,
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

app.patch('/api/requirements/:id/close', authenticate, (req, res) => {
  // Verify the user owns this requirement
  const requirement = db.prepare('SELECT buyerId FROM requirements WHERE id = ?').get(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found.' });
  if (requirement.buyerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only close your own requirements.' });
  }
  db.prepare("UPDATE requirements SET status = 'closed' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ========== OFFERS (authenticated) ==========

app.post('/api/offers', authenticate, requireRole('broker'), (req, res) => {
  const result = offerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Please provide all required offer details.' });
  }
  const o = result.data;
  // Use authenticated user's ID, not client-supplied
  const brokerId = req.user.sub;
  const id = `offer-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO offers (id, requirementId, brokerId, brokerName, brokerPhone, price, details, status, isRead, createdAt)
    VALUES (@id, @requirementId, @brokerId, @brokerName, @brokerPhone, @price, @details, 'pending', 0, @createdAt)
  `).run({
    id,
    requirementId: o.requirementId,
    brokerId,
    brokerName: o.brokerName || '',
    brokerPhone: o.brokerPhone || '',
    price: o.price,
    details: o.details || '',
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

app.patch('/api/offers/:id/read', authenticate, (req, res) => {
  db.prepare('UPDATE offers SET isRead = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/offers/:id/reject', authenticate, (req, res) => {
  // Verify the authenticated user owns the requirement this offer belongs to
  const offer = db.prepare('SELECT requirementId FROM offers WHERE id = ?').get(req.params.id);
  if (!offer) return res.status(404).json({ error: 'Offer not found.' });
  const requirement = db.prepare('SELECT buyerId FROM requirements WHERE id = ?').get(offer.requirementId);
  if (requirement && requirement.buyerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only reject offers on your own requirements.' });
  }
  db.prepare("UPDATE offers SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/offers/:id/accept', authenticate, (req, res) => {
  const { id } = req.params;
  const { reqId } = req.body;
  // Verify the authenticated user owns the requirement
  const requirement = db.prepare('SELECT buyerId FROM requirements WHERE id = ?').get(reqId);
  if (requirement && requirement.buyerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only accept offers on your own requirements.' });
  }
  db.transaction(() => {
    db.prepare("UPDATE offers SET status = 'accepted' WHERE id = ?").run(id);
    db.prepare("UPDATE offers SET status = 'rejected' WHERE requirementId = ? AND id != ?").run(reqId, id);
    db.prepare("UPDATE requirements SET status = 'closed' WHERE id = ?").run(reqId);
  })();
  res.json({ ok: true });
});

// ========== BROKER LISTINGS (authenticated) ==========

app.post('/api/listings', authenticate, requireRole('broker'), (req, res) => {
  const result = listingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Please fill in all required listing fields with valid values.' });
  }
  const l = result.data;
  const brokerId = req.user.sub;
  const id = `bl-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO brokerListings (id, brokerId, brokerName, make, model, variant, year, price, fuelType, transmission, bodyType, color, city, kmDriven, owners, description, status, createdAt)
    VALUES (@id, @brokerId, @brokerName, @make, @model, @variant, @year, @price, @fuelType, @transmission, @bodyType, @color, @city, @kmDriven, @owners, @description, 'active', @createdAt)
  `).run({
    id,
    brokerId,
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

app.patch('/api/listings/:id/sold', authenticate, (req, res) => {
  // Verify the broker owns this listing
  const listing = db.prepare('SELECT brokerId FROM brokerListings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.brokerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only modify your own listings.' });
  }
  db.prepare("UPDATE brokerListings SET status = 'sold' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ========== LISTING IMAGES (authenticated) ==========

app.post('/api/listings/:id/images', authenticate, upload.array('images', 10), (req, res) => {
  const listingId = req.params.id;
  const listing = db.prepare('SELECT id, brokerId FROM brokerListings WHERE id = ?').get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.brokerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only add images to your own listings.' });
  }

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

// ========== CONTACT EVENTS (public — buyers contact brokers) ==========

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

app.get('/api/listings/:id/leads', authenticate, (req, res) => {
  // Verify the broker owns this listing
  const listing = db.prepare('SELECT brokerId FROM brokerListings WHERE id = ?').get(req.params.id);
  if (listing && listing.brokerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only view leads for your own listings.' });
  }
  const leads = db.prepare('SELECT * FROM contactEvents WHERE listingId = ? ORDER BY createdAt DESC').all(req.params.id);
  res.json(leads);
});

// ========== ADMIN (authenticated + admin role) ==========

app.get('/api/admin/users', authenticate, requireRole('admin'), (_req, res) => {
  const rows = db.prepare('SELECT id, email, role, status, name, businessName, phone, city FROM users ORDER BY createdAt DESC').all();
  res.json(rows);
});

app.post('/api/admin/features', authenticate, requireRole('admin'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Feature name required.' });
  db.prepare('INSERT OR IGNORE INTO features(name) VALUES (?)').run(name);
  res.json({ ok: true });
});

app.post('/api/admin/model-features', authenticate, requireRole('admin'), (req, res) => {
  const { modelId, featureId } = req.body;
  db.prepare('INSERT OR IGNORE INTO modelFeatures(modelId, featureId) VALUES (?, ?)').run(modelId, featureId);
  res.json({ ok: true });
});

app.delete('/api/admin/model-features', authenticate, requireRole('admin'), (req, res) => {
  const { modelId, featureId } = req.body;
  if (!modelId || !featureId) return res.status(400).json({ error: 'modelId and featureId required.' });
  db.prepare('DELETE FROM modelFeatures WHERE modelId = ? AND featureId = ?').run(modelId, featureId);
  res.json({ ok: true });
});

app.patch('/api/admin/brands/:id/logo', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('UPDATE brands SET logoUrl = ? WHERE id = ?').run(req.body.logoUrl ?? null, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/models/:id/image', authenticate, requireRole('admin'), (req, res) => {
  db.prepare('UPDATE models SET imageUrl = ? WHERE id = ?').run(req.body.imageUrl ?? null, req.params.id);
  res.json({ ok: true });
});



// ========== GLOBAL ERROR HANDLER ==========

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed.' });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

// Only listen when running locally (not on Vercel serverless)
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`CarMatchr API running on http://localhost:${PORT}`);
  });
}

export default app;
