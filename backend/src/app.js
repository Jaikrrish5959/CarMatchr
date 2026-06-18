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
import { parse as parseCsv } from 'csv-parse/sync';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db/index.js';
import { seedCatalog } from './services/catalogSeeder.js';
import { authenticate, requireRole, requireOwnership, adminAuth, signAdminToken, JWT_SECRET } from './middleware/auth.js';
import nodemailer from 'nodemailer';

// ========== EMAIL VERIFICATION SETUP ==========
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      family: 4, // Force IPv4 to prevent ENETUNREACH routing errors on cloud platforms like Render
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Using configured SMTP transporter for email verification.');
  } else {
    console.error('CRITICAL: SMTP configuration is missing! Real email verification will fail.');
  }
  return transporter;
}

async function sendOtpEmail(email, otp) {
  try {
    const mailTransporter = getTransporter();
    if (!mailTransporter) {
      console.error(`Cannot send verification email to ${email} - SMTP is not configured.`);
      return;
    }

    await mailTransporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'CarMatchr Verification'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'CarMatchr - Login Verification Code',
      text: `Your CarMatchr login verification code is: ${otp}. This code is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #E53935; text-align: center;">CarMatchr</h2>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <p>Hello,</p>
          <p>You requested to log in to your CarMatchr account. Please use the following 6-digit verification code to complete your login:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 12px 24px; border-radius: 6px; border: 1px dashed #cbd5e1;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code is valid for 10 minutes. If you did not request this login, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 15px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} CarMatchr. All rights reserved.</p>
        </div>
      `,
    });
    console.log(`Verification email successfully sent to ${email}.`);
  } catch (err) {
    console.error('Error sending verification email:', err.message);
  }
}


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
  dealerType: z.enum(['new', 'used', 'both']).optional().nullable(),
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
  dealerType: z.enum(['new', 'used', 'both'], { required_error: 'Dealer Type is required.' }),
});

const requirementSchema = z.object({
  vehicleType: z.enum(['new', 'used']),
  make: z.string().min(1, 'Brand is required.'),
  model: z.string().min(1, 'Model is required.'),
  variant: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  budgetMin: z.string().optional().nullable(),
  budgetMax: z.string().optional().nullable(),
  state: z.string().min(1, 'State is required.'),
  city: z.string().min(1, 'City is required.'),
  description: z.string().optional().nullable(),
  brandId: z.number().int().optional().nullable(),
  modelId: z.number().int().optional().nullable(),
  
  // New Cars specific
  fuelType: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  colorPreference: z.string().optional().nullable(),
  purchaseTimeline: z.string().optional().nullable(),
  
  // Used Cars specific
  yearRange: z.string().optional().nullable(),
  maxKmDriven: z.union([z.string(), z.number()]).optional().nullable(),
  ownershipPreference: z.string().optional().nullable(),
  accidentHistoryPreference: z.string().optional().nullable(),

  // Exclusive/Marketplace fields
  visibility: z.enum(['marketplace', 'exclusive']).optional().default('marketplace'),
  exclusiveDealerId: z.union([z.string(), z.number()]).optional().nullable(),
  exclusiveDealerName: z.string().optional().nullable(),
});

const offerSchema = z.object({
  requirementId: z.number().int(),
  price: z.string().min(1),
  variant: z.string().min(1, 'Vehicle Variant is required.'),
  year: z.union([z.string(), z.number()]),
  dealerName: z.string().min(1, 'Dealer Name is required.'),
  dealerLocation: z.string().min(1, 'Dealer Location is required.'),
  priceBreakdown: z.string().optional().nullable(),
  deliveryTime: z.string().optional().nullable(),
  stockStatus: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  details: z.string().optional().nullable(),
  registrationYear: z.union([z.string(), z.number()]).optional().nullable(),
  kmDriven: z.union([z.string(), z.number()]).optional().nullable(),
  ownership: z.string().optional().nullable(),
  insuranceValidTill: z.string().optional().nullable(),
  serviceHistory: z.string().optional().nullable(),
  vehicleCondition: z.string().optional().nullable(),
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
app.set('trust proxy', 1);
const isVercel = !!process.env.VERCEL;

await seedCatalog();

// ========== SECURITY MIDDLEWARE ==========

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS — restrict to known origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return cb(null, true);
    
    // Check if the origin matches allowed origins or is a domain/subdomain of carmatchr.com
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin === 'https://carmatchr.com' || 
                      origin === 'https://www.carmatchr.com' ||
                      origin.endsWith('.carmatchr.com');
                      
    if (isAllowed) return cb(null, true);
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
  : path.resolve(process.cwd(), 'storage', 'uploads');
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

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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
  businessName: row.business_name ?? undefined,
  phone: row.phone ?? undefined,
  license: row.license ?? undefined,
  city: row.city ?? undefined,
  dealerType: row.dealer_type ?? undefined,
});

function parseBudgetNumber(value) {
  if (!value) return null;
  const clean = String(value).replace(/[₹,\s]/g, '');
  const match = clean.match(/(\d+\.?\d*)/);
  return match ? Number(match[1]) : null;
}

function formatBudget(value) {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return `₹${num}L`;
}

function parseYearRange(range) {
  if (!range) return { minYear: null, maxYear: null };
  const parts = String(range).split(/[-–]/).map((p) => p.trim()).filter(Boolean);
  const min = Number.parseInt(parts[0], 10);
  const max = Number.parseInt(parts[1] || parts[0], 10);
  return {
    minYear: Number.isNaN(min) ? null : min,
    maxYear: Number.isNaN(max) ? null : max,
  };
}

function formatYearRange(minYear, maxYear) {
  if (!minYear && !maxYear) return '';
  if (minYear && maxYear) return `${minYear}-${maxYear}`;
  return String(minYear ?? maxYear);
}

async function resolveBrandModelIds(make, model) {
  if (!make) return { brandId: null, modelId: null };
  const brandRow = await db.get('SELECT id FROM brands WHERE LOWER(name) = LOWER($1) LIMIT 1', [make]);
  if (!brandRow) return { brandId: null, modelId: null };
  if (!model) return { brandId: brandRow.id, modelId: null };
  const modelRow = await db.get(
    'SELECT id FROM models WHERE brand_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
    [brandRow.id, model]
  );
  return { brandId: brandRow.id, modelId: modelRow?.id ?? null };
}

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

app.get('/api/health', async (_req, res) => {
  try {
    await db.get('SELECT 1');
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
    const found = await db.get(
      'SELECT * FROM users WHERE email = $1 AND role = $2 LIMIT 1',
      [email, role]
    );
    if (found) {
      // User exists! Sign token and return.
      const token = signToken(found);
      return res.json({ token, user: mapUser(found) });
    }

    // User does not exist, so they are registering.
    if (role === 'buyer') {
      const dummyPassword = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(dummyPassword, SALT_ROUNDS);

      const created = await db.get(
        `
          INSERT INTO users (email, password, role, status, name)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        [
          email,
          hashedPassword,
          'buyer',
          'active',
          name || null,
        ]
      );
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
  const { email, businessName, license, city, phone, credential, dealerType } = result.data;

  try {
    const payload = await verifyGoogleToken(credential);
    if (!payload || !payload.email || payload.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid Google credential.' });
    }

    // Verify user doesn't already exist as a broker
    const exists = await db.get(
      'SELECT 1 FROM users WHERE email = $1 AND role = $2 LIMIT 1',
      [email, 'broker']
    );
    if (exists) {
      return res.status(409).json({ error: 'A broker account already exists for this email.' });
    }

    const dummyPassword = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(dummyPassword, SALT_ROUNDS);

    const created = await db.get(
      `
        INSERT INTO users (email, password, role, status, business_name, license, city, phone, dealer_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        email.toLowerCase(),
        hashedPassword,
        'broker',
        'active',
        businessName,
        license,
        city,
        phone,
        dealerType,
      ]
    );
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
  
  const exists = await db.get(
    'SELECT 1 FROM users WHERE email = $1 AND role = $2 LIMIT 1',
    [user.email, user.role]
  );
  if (exists) {
    return res.status(409).json({ error: `An ${user.role} account already exists for this email.` });
  }

  const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

  const created = await db.get(
    `
      INSERT INTO users (email, password, role, status, name, business_name, phone, license, city, dealer_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      user.email,
      hashedPassword,
      user.role,
      'active',
      user.name ?? null,
      user.businessName ?? null,
      user.phone ?? null,
      user.license ?? null,
      user.city ?? null,
      user.dealerType ?? null,
    ]
  );
  const token = signToken(created);
  return res.json({ token, user: mapUser(created) });
});

app.post('/api/auth/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Email, password and role are required.' });
  }
  const { email, password, role } = result.data;
  const found = await db.get(
    'SELECT * FROM users WHERE email = $1 AND role = $2 LIMIT 1',
    [email, role]
  );
  if (!found) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your email, password, and selected role.' });
  }

  // Always use bcrypt — no plaintext fallback
  const passwordMatch = await bcrypt.compare(password, found.password);

  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
  }

  if (found.role === 'admin') {
    const token = signToken(found);
    return res.json({ token, user: mapUser(found) });
  }

  // Generate 6-digit verification code
  const otp = String(100000 + Math.floor(Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.run(
    'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
    [otp, expiresAt, found.id]
  );

  // Send the verification code email
  sendOtpEmail(found.email, otp);

  return res.json({
    requiresVerification: true,
    email: found.email,
    role: found.role
  });
});

app.post('/api/auth/verify-login', async (req, res) => {
  const { email, role, otp } = req.body;
  if (!email || !role || !otp) {
    return res.status(400).json({ error: 'Email, role, and verification code (OTP) are required.' });
  }

  const found = await db.get(
    'SELECT * FROM users WHERE email = $1 AND role = $2 LIMIT 1',
    [email.toLowerCase(), role]
  );
  if (!found) {
    return res.status(401).json({ error: 'Invalid credentials or role.' });
  }

  if (!found.otp_code || found.otp_code !== otp) {
    return res.status(401).json({ error: 'Invalid verification code.' });
  }

  const expiresAt = new Date(found.otp_expires_at);
  if (expiresAt < new Date()) {
    return res.status(401).json({ error: 'Verification code has expired. Please log in again to request a new code.' });
  }

  // Clear OTP on successful verification
  await db.run(
    'UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
    [found.id]
  );

  const token = signToken(found);
  return res.json({ token, user: mapUser(found) });
});

// ========== USERS (authenticated) ==========

// Update own profile
app.patch('/api/users/:id/profile', authenticate, requireOwnership('id'), async (req, res) => {
  const { id } = req.params;
  const { phone, name } = req.body;
  const row = await db.get('SELECT * FROM users WHERE id = $1', [id]);
  if (!row) return res.status(404).json({ error: 'User not found.' });

  const updatedPhone = phone !== undefined ? (phone || null) : row.phone;
  const updatedName = name !== undefined ? (name || null) : (row.name ?? row.business_name ?? null);

  if (row.role === 'broker') {
    await db.run('UPDATE users SET phone = $1, business_name = $2 WHERE id = $3', [
      updatedPhone,
      updatedName,
      id,
    ]);
  } else {
    await db.run('UPDATE users SET phone = $1, name = $2 WHERE id = $3', [
      updatedPhone,
      updatedName,
      id,
    ]);
  }

  const updated = await db.get('SELECT * FROM users WHERE id = $1', [id]);
  return res.json({ user: mapUser(updated) });
});

// Update user status — admin only
app.patch('/api/users/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  await db.run('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
  const row = await db.get('SELECT * FROM users WHERE id = $1', [id]);
  return res.json({ user: mapUser(row) });
});

// ========== CATALOG (public read) ==========

app.get('/api/catalog/brands', async (_req, res) => {
  // Single query with JOINs instead of N+1
  const rows = await db.all(`
    SELECT b.id AS "brandId", b.name AS "brandName", b.logo_url AS "logoUrl",
           m.id AS "modelId", m.name AS "modelName", m.image_url AS "imageUrl",
           f.id AS "featureId", f.name AS "featureName"
    FROM brands b
    LEFT JOIN models m ON m.brand_id = b.id
    LEFT JOIN model_features mf ON mf.model_id = m.id
    LEFT JOIN features f ON f.id = mf.feature_id
    ORDER BY b.name, m.name, f.name
  `);

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

app.get('/api/catalog/features', async (_req, res) => {
  const rows = await db.all('SELECT id, name FROM features ORDER BY name');
  res.json(rows);
});

// ========== DATA (authenticated, bulk fetch) ==========

app.get('/api/data', authenticate, async (_req, res) => {
  const reqRows = await db.all(`
    SELECT r.*, b.name AS brand_name, m.name AS model_name
    FROM requirements r
    LEFT JOIN brands b ON b.id = r.brand_id
    LEFT JOIN models m ON m.id = r.model_id
    ORDER BY r.created_at DESC
  `);

  const requirements = reqRows.map((r) => ({
    id: r.id,
    buyerId: r.buyer_id,
    make: r.brand_name ?? '',
    model: r.model_name ?? '',
    yearRange: formatYearRange(r.min_year, r.max_year),
    budget: formatBudget(r.budget),
    preferredFeature: r.preferred_feature ?? '',
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    vehicleType: r.vehicle_type ?? 'new',
    variant: r.variant ?? '',
    budgetMin: r.budget_min ? formatBudget(r.budget_min) : '',
    budgetMax: r.budget_max ? formatBudget(r.budget_max) : '',
    state: r.state ?? 'Tamil Nadu',
    city: r.city ?? '',
    fuelType: r.fuel_type ?? '',
    transmission: r.transmission ?? '',
    colorPreference: r.color_preference ?? '',
    purchaseTimeline: r.purchase_timeline ?? '',
    maxKmDriven: r.max_km_driven ?? null,
    ownershipPreference: r.ownership_preference ?? '',
    accidentHistoryPreference: r.accident_history_preference ?? '',
  }));

  const offerRows = await db.all(`
    SELECT o.*, u.business_name, u.name, u.phone
    FROM offers o
    LEFT JOIN users u ON u.id = o.broker_id
    ORDER BY o.created_at DESC
  `);
  const offers = offerRows.map((o) => ({
    id: o.id,
    requirementId: o.requirement_id,
    brokerId: o.broker_id,
    brokerName: o.business_name ?? o.name ?? '',
    brokerPhone: o.phone ?? '',
    price: formatBudget(o.price),
    details: o.details ?? '',
    status: o.status,
    isRead: !!o.is_read,
    createdAt: o.created_at,
    variant: o.variant ?? '',
    year: o.year ?? null,
    dealerName: o.dealer_name ?? '',
    dealerLocation: o.dealer_location ?? '',
    priceBreakdown: o.price_breakdown ?? '',
    deliveryTime: o.delivery_time ?? '',
    stockStatus: o.stock_status ?? '',
    benefits: o.benefits ?? '',
    registrationYear: o.registration_year ?? null,
    kmDriven: o.km_driven ?? null,
    ownership: o.ownership ?? '',
    insuranceValidTill: o.insurance_valid_till ?? '',
    serviceHistory: o.service_history ?? '',
    vehicleCondition: o.vehicle_condition ?? '',
    shortlisted: !!o.shortlisted,
  }));

  const listingRows = await db.all(`
    SELECT bl.*, b.name AS brand_name, m.name AS model_name, u.business_name, u.name
    FROM broker_listings bl
    LEFT JOIN brands b ON b.id = bl.brand_id
    LEFT JOIN models m ON m.id = bl.model_id
    LEFT JOIN users u ON u.id = bl.broker_id
    ORDER BY bl.created_at DESC
  `);

  const listingsWithExtras = await Promise.all(
    listingRows.map(async (l) => {
      const images = await db.all(
        'SELECT image_url, sort_order FROM listing_images WHERE listing_id = $1 ORDER BY sort_order',
        [l.id]
      );
      const leadRow = await db.get('SELECT COUNT(*) as cnt FROM contact_events WHERE listing_id = $1', [l.id]);
      return {
        id: l.id,
        brokerId: l.broker_id,
        brokerName: l.business_name ?? l.name ?? '',
        make: l.brand_name ?? '',
        model: l.model_name ?? '',
        variant: l.variant ?? '',
        year: l.year,
        price: Number(l.price ?? 0),
        fuelType: l.fuel_type ?? 'Petrol',
        transmission: l.transmission ?? 'Manual',
        bodyType: l.body_type ?? 'SUV',
        color: l.color ?? '',
        city: l.city ?? '',
        kmDriven: l.km_driven ?? 0,
        owners: l.owners ?? 1,
        description: l.description ?? '',
        status: l.status,
        createdAt: l.created_at,
        images: images.map((r) => r.image_url),
        leadsCount: Number(leadRow?.cnt ?? 0),
      };
    })
  );

  res.json({ requirements, offers, brokerListings: listingsWithExtras });
});

// ========== REQUIREMENTS (authenticated) ==========

app.post('/api/requirements', authenticate, async (req, res) => {
  const result = requirementSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }
  const payload = result.data;
  // Use authenticated user's ID, not client-supplied
  const buyerId = Number(req.user.sub);
  const { minYear, maxYear } = parseYearRange(payload.yearRange);
  const budgetValue = parseBudgetNumber(payload.budgetMax || payload.budget || '0');
  const resolved = payload.make ? await resolveBrandModelIds(payload.make, payload.model) : { brandId: null, modelId: null };
  const brandId = payload.brandId ?? resolved.brandId;
  const modelId = payload.modelId ?? resolved.modelId;

  const created = await db.get(
    `
      INSERT INTO requirements (
        buyer_id, brand_id, model_id, min_year, max_year, budget, preferred_feature, description, status,
        vehicle_type, variant, budget_min, budget_max, state, city, fuel_type, transmission,
        color_preference, purchase_timeline, max_km_driven, ownership_preference, accident_history_preference
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id
    `,
    [
      buyerId,
      brandId,
      modelId,
      minYear,
      maxYear,
      budgetValue,
      payload.preferredFeature ?? null,
      payload.description || '',
      payload.vehicleType,
      payload.variant ?? null,
      parseBudgetNumber(payload.budgetMin || '0'),
      parseBudgetNumber(payload.budgetMax || '0'),
      payload.state,
      payload.city,
      payload.fuelType ?? null,
      payload.transmission ?? null,
      payload.colorPreference ?? null,
      payload.purchaseTimeline ?? null,
      payload.maxKmDriven ? Number(payload.maxKmDriven) : null,
      payload.ownershipPreference ?? null,
      payload.accidentHistoryPreference ?? null
    ]
  );
  res.json({ ok: true, id: created.id });
});

app.patch('/api/requirements/:id/close', authenticate, async (req, res) => {
  // Verify the user owns this requirement
  const requirement = await db.get('SELECT buyer_id FROM requirements WHERE id = $1', [req.params.id]);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found.' });
  if (Number(requirement.buyer_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only close your own requirements.' });
  }
  await db.run("UPDATE requirements SET status = 'closed' WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ========== OFFERS (authenticated) ==========

app.post('/api/offers', authenticate, requireRole('broker'), async (req, res) => {
  const result = offerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Please provide all required offer details.' });
  }
  const o = result.data;
  // Use authenticated user's ID, not client-supplied
  const brokerId = Number(req.user.sub);
  const priceValue = parseBudgetNumber(o.price);
  const created = await db.get(
    `
      INSERT INTO offers (
        requirement_id, broker_id, price, details, status,
        variant, year, dealer_name, dealer_location, price_breakdown,
        delivery_time, stock_status, benefits, registration_year, km_driven,
        ownership, insurance_valid_till, service_history, vehicle_condition
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `,
    [
      o.requirementId,
      brokerId,
      priceValue,
      o.details || null,
      o.variant,
      o.year ? Number(o.year) : null,
      o.dealerName,
      o.dealerLocation,
      o.priceBreakdown || null,
      o.deliveryTime || null,
      o.stockStatus || null,
      o.benefits || null,
      o.registrationYear ? Number(o.registrationYear) : null,
      o.kmDriven ? Number(o.kmDriven) : null,
      o.ownership || null,
      o.insuranceValidTill || null,
      o.serviceHistory || null,
      o.vehicleCondition || null
    ]
  );
  res.json({ ok: true, id: created.id });
});

app.patch('/api/offers/:id/read', authenticate, async (req, res) => {
  await db.run('UPDATE offers SET is_read = TRUE WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.patch('/api/offers/:id/shortlist', authenticate, async (req, res) => {
  const { id } = req.params;
  const { shortlisted } = req.body;
  const offer = await db.get('SELECT requirement_id FROM offers WHERE id = $1', [id]);
  if (!offer) return res.status(404).json({ error: 'Offer not found.' });
  const requirement = await db.get('SELECT buyer_id FROM requirements WHERE id = $1', [offer.requirement_id]);
  if (requirement && Number(requirement.buyer_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only shortlist offers on your own requirements.' });
  }
  await db.run('UPDATE offers SET shortlisted = $1 WHERE id = $2', [!!shortlisted, id]);
  res.json({ ok: true });
});

app.patch('/api/offers/:id/reject', authenticate, async (req, res) => {
  // Verify the authenticated user owns the requirement this offer belongs to
  const offer = await db.get('SELECT requirement_id FROM offers WHERE id = $1', [req.params.id]);
  if (!offer) return res.status(404).json({ error: 'Offer not found.' });
  const requirement = await db.get('SELECT buyer_id FROM requirements WHERE id = $1', [offer.requirement_id]);
  if (requirement && Number(requirement.buyer_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only reject offers on your own requirements.' });
  }
  await db.run("UPDATE offers SET status = 'rejected' WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

app.patch('/api/offers/:id/negotiate', authenticate, async (req, res) => {
  const { id } = req.params;
  const { counterPrice } = req.body;
  if (!counterPrice) return res.status(400).json({ error: 'Counter price is required.' });

  const offer = await db.get('SELECT requirement_id FROM offers WHERE id = $1', [id]);
  if (!offer) return res.status(404).json({ error: 'Offer not found.' });

  const requirement = await db.get('SELECT buyer_id FROM requirements WHERE id = $1', [offer.requirement_id]);
  if (requirement && Number(requirement.buyer_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only negotiate offers on your own requirements.' });
  }

  const currentOffer = await db.get('SELECT details, price FROM offers WHERE id = $1', [id]);
  const cleanDetails = currentOffer.details ? currentOffer.details.split('\n[Negotiated:')[0].trim() : '';
  const newDetails = `${cleanDetails}\n[Negotiated: ${counterPrice}]`;
  await db.run("UPDATE offers SET details = $1, status = 'pending' WHERE id = $2", [newDetails, id]);
  res.json({ ok: true });
});


app.patch('/api/offers/:id/accept', authenticate, async (req, res) => {
  const { id } = req.params;
  const reqId = Number(req.body.reqId);
  // Verify the authenticated user owns the requirement
  const requirement = await db.get('SELECT buyer_id FROM requirements WHERE id = $1', [reqId]);
  if (requirement && Number(requirement.buyer_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only accept offers on your own requirements.' });
  }
  await db.transaction(async (tx) => {
    await tx.run("UPDATE offers SET status = 'accepted' WHERE id = $1", [id]);
    await tx.run("UPDATE offers SET status = 'rejected' WHERE requirement_id = $1 AND id != $2", [reqId, id]);
    await tx.run("UPDATE requirements SET status = 'closed' WHERE id = $1", [reqId]);
  });
  res.json({ ok: true });
});

// ========== BROKER LISTINGS (authenticated) ==========

app.post('/api/listings', authenticate, requireRole('broker'), async (req, res) => {
  const result = listingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Please fill in all required listing fields with valid values.' });
  }
  const l = result.data;
  const brokerId = Number(req.user.sub);
  const { brandId, modelId } = await resolveBrandModelIds(l.make, l.model);
  if (!brandId || !modelId) {
    return res.status(400).json({ error: 'Invalid brand or model. Please select from the catalog.' });
  }
  const created = await db.get(
    `
      INSERT INTO broker_listings
        (broker_id, brand_id, model_id, variant, year, price, fuel_type, transmission, body_type, color, city, km_driven, owners, description, status)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
      RETURNING id
    `,
    [
      brokerId,
      brandId,
      modelId,
      l.variant || null,
      l.year || 2024,
      l.price,
      l.fuelType || 'Petrol',
      l.transmission || 'Manual',
      l.bodyType || 'SUV',
      l.color || null,
      l.city,
      l.kmDriven || 0,
      l.owners || 1,
      l.description || null,
    ]
  );
  res.json({ ok: true, id: created.id });
});

app.patch('/api/listings/:id/sold', authenticate, async (req, res) => {
  // Verify the broker owns this listing
  const listing = await db.get('SELECT broker_id FROM broker_listings WHERE id = $1', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (Number(listing.broker_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only modify your own listings.' });
  }
  await db.run("UPDATE broker_listings SET status = 'sold' WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ========== LISTING IMAGES (authenticated) ==========

app.post('/api/listings/:id/images', authenticate, upload.array('images', 10), async (req, res) => {
  const listingId = req.params.id;
  const listing = await db.get('SELECT id, broker_id FROM broker_listings WHERE id = $1', [listingId]);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (Number(listing.broker_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only add images to your own listings.' });
  }

  const files = req.files || [];
  const now = new Date().toISOString();
  const paths = [];
  for (const [i, file] of files.entries()) {
    const relativePath = `/uploads/${file.filename}`;
    await db.run(
      'INSERT INTO listing_images (listing_id, image_url, is_primary, sort_order, created_at) VALUES ($1, $2, $3, $4, $5)',
      [listingId, relativePath, i === 0, i, now]
    );
    paths.push(relativePath);
  }

  res.json({ ok: true, images: paths });
});

app.get('/api/listings/:id/images', async (req, res) => {
  const images = (await db.all(
    'SELECT image_url FROM listing_images WHERE listing_id = $1 ORDER BY sort_order',
    [req.params.id]
  )).map((r) => r.image_url);
  res.json(images);
});

// ========== CONTACT EVENTS (public — buyers contact brokers) ==========

// ========== DEALER DIRECTORY (public) ==========

app.get('/api/dealers', async (req, res) => {
  const { type, city, sort } = req.query;
  
  let query = "SELECT id, email, role, status, business_name, phone, city, dealer_type, created_at FROM users WHERE role = 'broker' AND status = 'active'";
  const params = [];
  let paramIndex = 1;

  if (type === 'new') {
    query += ` AND dealer_type IN ('new', 'both')`;
  } else if (type === 'used') {
    query += ` AND dealer_type IN ('used', 'both')`;
  }

  if (city) {
    query += ` AND LOWER(city) = LOWER($${paramIndex})`;
    params.push(city);
    paramIndex++;
  }

  if (sort === 'newest') {
    query += ` ORDER BY created_at DESC`;
  } else {
    query += ` ORDER BY business_name ASC`;
  }

  try {
    const rows = await db.all(query, params);
    
    // Fetch stats for each dealer (number of listings, etc.)
    const dealers = await Promise.all(rows.map(async (row) => {
      const listingCountRow = await db.get('SELECT COUNT(*) as count FROM broker_listings WHERE broker_id = $1 AND status = $2', [row.id, 'active']);
      return {
        id: row.id,
        businessName: row.business_name,
        city: row.city,
        phone: row.phone,
        dealerType: row.dealer_type,
        createdAt: row.created_at,
        activeListings: Number(listingCountRow?.count || 0),
        // Placeholder values for directory UI
        rating: (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1),
        reviews: Math.floor(Math.random() * 500) + 10,
        yearsInBusiness: Math.floor(Math.random() * 20) + 1,
        verified: true,
      };
    }));

    if (sort === 'listings') {
      dealers.sort((a, b) => b.activeListings - a.activeListings);
    } else if (sort === 'rating') {
       dealers.sort((a, b) => Number(b.rating) - Number(a.rating));
    }

    res.json(dealers);
  } catch (err) {
    console.error('Error fetching dealers:', err);
    res.status(500).json({ error: 'Failed to fetch dealers.' });
  }
});

app.get('/api/dealers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.get("SELECT id, email, role, status, business_name, phone, city, dealer_type, created_at, license FROM users WHERE id = $1 AND role = 'broker' AND status = 'active'", [id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Dealer not found.' });
    }

    const listingRows = await db.all(`
      SELECT bl.*, b.name AS brand_name, m.name AS model_name
      FROM broker_listings bl
      LEFT JOIN brands b ON b.id = bl.brand_id
      LEFT JOIN models m ON m.id = bl.model_id
      WHERE bl.broker_id = $1 AND bl.status = 'active'
      ORDER BY bl.created_at DESC
    `, [id]);

    const listingsWithExtras = await Promise.all(
      listingRows.map(async (l) => {
        const images = await db.all(
          'SELECT image_url, sort_order FROM listing_images WHERE listing_id = $1 ORDER BY sort_order',
          [l.id]
        );
        return {
          id: l.id,
          make: l.brand_name ?? '',
          model: l.model_name ?? '',
          variant: l.variant ?? '',
          year: l.year,
          price: Number(l.price ?? 0),
          fuelType: l.fuel_type ?? 'Petrol',
          transmission: l.transmission ?? 'Manual',
          bodyType: l.body_type ?? 'SUV',
          color: l.color ?? '',
          city: l.city ?? '',
          kmDriven: l.km_driven ?? 0,
          owners: l.owners ?? 1,
          description: l.description ?? '',
          createdAt: l.created_at,
          images: images.map((r) => r.image_url),
        };
      })
    );

    const dealerProfile = {
       id: row.id,
       businessName: row.business_name,
       city: row.city,
       phone: row.phone,
       email: row.email,
       dealerType: row.dealer_type,
       createdAt: row.created_at,
       license: row.license,
       // Placeholders
       rating: (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1),
       reviews: Math.floor(Math.random() * 500) + 10,
       yearsInBusiness: Math.floor(Math.random() * 20) + 1,
       verified: true,
       listings: listingsWithExtras
    };

    res.json(dealerProfile);
  } catch (err) {
    console.error('Error fetching dealer profile:', err);
    res.status(500).json({ error: 'Failed to fetch dealer profile.' });
  }
});

app.post('/api/listings/:id/contact', async (req, res) => {
  const listingId = req.params.id;
  const listing = await db.get('SELECT id FROM broker_listings WHERE id = $1', [listingId]);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  const { buyerName, buyerEmail, buyerPhone } = req.body;
  await db.run(
    'INSERT INTO contact_events (listing_id, buyer_name, buyer_email, buyer_phone, created_at) VALUES ($1, $2, $3, $4, $5)',
    [listingId, buyerName || 'Anonymous', buyerEmail || '', buyerPhone || '', new Date().toISOString()]
  );

  res.json({ ok: true });
});

app.get('/api/listings/:id/leads', authenticate, async (req, res) => {
  // Verify the broker owns this listing
  const listing = await db.get('SELECT broker_id FROM broker_listings WHERE id = $1', [req.params.id]);
  if (listing && Number(listing.broker_id) !== Number(req.user.sub) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only view leads for your own listings.' });
  }
  const leads = await db.all('SELECT * FROM contact_events WHERE listing_id = $1 ORDER BY created_at DESC', [
    req.params.id,
  ]);
  res.json(leads);
});

// ========== ADMIN (authenticated + admin role) ==========

app.get('/api/admin/users', (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      if (decoded.owner) {
        req.adminOwner = decoded;
        return next();
      }
    } catch {
      // fallback to regular authenticate
    }
  }
  authenticate(req, res, (err) => {
    if (err) return next(err);
    requireRole('admin')(req, res, next);
  });
}, async (req, res) => {
  if (req.adminOwner) {
    // Standalone Admin App: return only buyers with query filter support
    const { q } = req.query;
    const rows = await db.all(
      `SELECT id, email, name, status, city, created_at AS "createdAt"
       FROM users WHERE role = 'buyer' ORDER BY created_at DESC`
    );
    const filtered = q
      ? rows.filter(r =>
          r.email?.toLowerCase().includes(q.toLowerCase()) ||
          r.name?.toLowerCase().includes(q.toLowerCase()) ||
          r.city?.toLowerCase().includes(q.toLowerCase())
        )
      : rows;
    return res.json(filtered);
  } else {
    // Old Admin Dashboard: return all users
    const rows = await db.all(
      'SELECT id, email, role, status, name, business_name AS "businessName", phone, city FROM users ORDER BY created_at DESC'
    );
    return res.json(rows);
  }
});

app.post('/api/admin/features', authenticate, requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Feature name required.' });
  await db.run('INSERT INTO features(name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  res.json({ ok: true });
});

app.post('/api/admin/model-features', authenticate, requireRole('admin'), async (req, res) => {
  const { modelId, featureId } = req.body;
  await db.run(
    'INSERT INTO model_features(model_id, feature_id) VALUES ($1, $2) ON CONFLICT (model_id, feature_id) DO NOTHING',
    [modelId, featureId]
  );
  res.json({ ok: true });
});

app.delete('/api/admin/model-features', authenticate, requireRole('admin'), async (req, res) => {
  const { modelId, featureId } = req.body;
  if (!modelId || !featureId) return res.status(400).json({ error: 'modelId and featureId required.' });
  await db.run('DELETE FROM model_features WHERE model_id = $1 AND feature_id = $2', [modelId, featureId]);
  res.json({ ok: true });
});

app.patch('/api/admin/brands/:id/logo', authenticate, requireRole('admin'), async (req, res) => {
  await db.run('UPDATE brands SET logo_url = $1 WHERE id = $2', [
    req.body.logoUrl ?? null,
    req.params.id,
  ]);
  res.json({ ok: true });
});

app.patch('/api/admin/models/:id/image', authenticate, requireRole('admin'), async (req, res) => {
  await db.run('UPDATE models SET image_url = $1 WHERE id = $2', [
    req.body.imageUrl ?? null,
    req.params.id,
  ]);
  res.json({ ok: true });
});

// ========== CAR CATALOG (admin) ==========

const brandSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().optional().nullable(),
});

const modelSchema = z.object({
  brandId: z.number().int(),
  name: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
});

async function resolveBrandIdByName(name) {
  if (!name) return null;
  const row = await db.get('SELECT id FROM brands WHERE LOWER(name) = LOWER($1) LIMIT 1', [name]);
  return row?.id ?? null;
}

function parseBulkPayload(req) {
  if (Array.isArray(req.body?.items)) return req.body.items;
  if (req.file) {
    const content = req.file.buffer.toString('utf8');
    return parseCsv(content, { columns: true, skip_empty_lines: true, trim: true });
  }
  return [];
}

app.get('/api/admin/brands', authenticate, requireRole('admin'), async (_req, res) => {
  const rows = await db.all('SELECT id, name, logo_url AS "logoUrl" FROM brands ORDER BY name');
  res.json(rows);
});

app.post('/api/admin/brands', authenticate, requireRole('admin'), async (req, res) => {
  const result = brandSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Brand name is required.' });
  const row = await db.get(
    'INSERT INTO brands (name, logo_url) VALUES ($1, $2) RETURNING id, name, logo_url AS "logoUrl"',
    [result.data.name.trim(), result.data.logoUrl ?? null]
  );
  res.json(row);
});

app.patch('/api/admin/brands/:id', authenticate, requireRole('admin'), async (req, res) => {
  const name = req.body.name?.trim();
  const logoUrl = req.body.logoUrl ?? null;
  const updates = [];
  const values = [];
  if (name) {
    updates.push('name = $1');
    values.push(name);
  }
  if (req.body.logoUrl !== undefined) {
    updates.push(`logo_url = $${updates.length + 1}`);
    values.push(logoUrl);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields provided.' });
  values.push(req.params.id);
  const row = await db.get(
    `UPDATE brands SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, name, logo_url AS "logoUrl"`,
    values
  );
  if (!row) return res.status(404).json({ error: 'Brand not found.' });
  res.json(row);
});

app.delete('/api/admin/brands/:id', authenticate, requireRole('admin'), async (req, res) => {
  const row = await db.get('DELETE FROM brands WHERE id = $1 RETURNING id', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Brand not found.' });
  res.json({ ok: true });
});

app.post('/api/admin/brands/bulk', authenticate, requireRole('admin'), csvUpload.single('file'), async (req, res) => {
  const items = parseBulkPayload(req)
    .map((row) => ({
      name: (row.name ?? '').toString().trim(),
      logoUrl: row.logoUrl ?? row.logo_url ?? null,
    }))
    .filter((row) => row.name);

  if (items.length === 0) return res.status(400).json({ error: 'No valid rows found.' });

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.run(
        'INSERT INTO brands (name, logo_url) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [item.name, item.logoUrl]
      );
    }
  });
  res.json({ ok: true, inserted: items.length });
});

app.get('/api/admin/models', authenticate, requireRole('admin'), async (req, res) => {
  const brandId = req.query.brandId ? Number(req.query.brandId) : null;
  const rows = await db.all(
    `
      SELECT m.id, m.brand_id AS "brandId", m.name, m.image_url AS "imageUrl", b.name AS "brandName"
      FROM models m
      JOIN brands b ON b.id = m.brand_id
      ${brandId ? 'WHERE m.brand_id = $1' : ''}
      ORDER BY b.name, m.name
    `,
    brandId ? [brandId] : []
  );
  res.json(rows);
});

app.post('/api/admin/models', authenticate, requireRole('admin'), async (req, res) => {
  const result = modelSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Brand and model name are required.' });
  const row = await db.get(
    `
      INSERT INTO models (brand_id, name, image_url)
      VALUES ($1, $2, $3)
      RETURNING id, brand_id AS "brandId", name, image_url AS "imageUrl"
    `,
    [result.data.brandId, result.data.name.trim(), result.data.imageUrl ?? null]
  );
  res.json(row);
});

app.patch('/api/admin/models/:id', authenticate, requireRole('admin'), async (req, res) => {
  const updates = [];
  const values = [];
  if (req.body.brandId) {
    updates.push(`brand_id = $${updates.length + 1}`);
    values.push(Number(req.body.brandId));
  }
  if (req.body.name) {
    updates.push(`name = $${updates.length + 1}`);
    values.push(req.body.name.trim());
  }
  if (req.body.imageUrl !== undefined) {
    updates.push(`image_url = $${updates.length + 1}`);
    values.push(req.body.imageUrl ?? null);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields provided.' });
  values.push(req.params.id);
  const row = await db.get(
    `UPDATE models SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, brand_id AS "brandId", name, image_url AS "imageUrl"`,
    values
  );
  if (!row) return res.status(404).json({ error: 'Model not found.' });
  res.json(row);
});

app.delete('/api/admin/models/:id', authenticate, requireRole('admin'), async (req, res) => {
  const row = await db.get('DELETE FROM models WHERE id = $1 RETURNING id', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Model not found.' });
  res.json({ ok: true });
});

app.post('/api/admin/models/bulk', authenticate, requireRole('admin'), csvUpload.single('file'), async (req, res) => {
  const items = parseBulkPayload(req)
    .map((row) => ({
      brandId: row.brandId ? Number(row.brandId) : null,
      brandName: row.brandName ?? row.brand ?? null,
      name: (row.name ?? '').toString().trim(),
      imageUrl: row.imageUrl ?? row.image_url ?? null,
    }))
    .filter((row) => row.name && (row.brandId || row.brandName));

  if (items.length === 0) return res.status(400).json({ error: 'No valid rows found.' });

  await db.transaction(async (tx) => {
    for (const item of items) {
      const brandId = item.brandId ?? (await resolveBrandIdByName(item.brandName));
      if (!brandId) continue;
      await tx.run(
        'INSERT INTO models (brand_id, name, image_url) VALUES ($1, $2, $3) ON CONFLICT (brand_id, name) DO NOTHING',
        [brandId, item.name, item.imageUrl]
      );
    }
  });
  res.json({ ok: true, inserted: items.length });
});

// ========== MASTER DATA (admin) ==========

const MASTER_DATA_CONFIG = {
  cities: {
    table: 'cities',
    columns: ['name', 'state', 'icon'],
    required: ['name'],
    uniqueColumn: 'name',
  },
  fuel_types: {
    table: 'fuel_types',
    columns: ['name'],
    required: ['name'],
    uniqueColumn: 'name',
  },
  body_types: {
    table: 'body_types',
    columns: ['name'],
    required: ['name'],
    uniqueColumn: 'name',
  },
  transmissions: {
    table: 'transmissions',
    columns: ['name'],
    required: ['name'],
    uniqueColumn: 'name',
  },
};

function getMasterConfig(type) {
  return MASTER_DATA_CONFIG[type];
}

function normalizeValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function validateMasterItem(config, item) {
  for (const key of config.required) {
    const value = normalizeValue(item[key]);
    if (!value) {
      return `Missing required field: ${key}`;
    }
  }
  return null;
}

app.get('/api/admin/master-data/:type', authenticate, requireRole('admin'), async (req, res) => {
  const config = getMasterConfig(req.params.type);
  if (!config) return res.status(404).json({ error: 'Unknown master data type.' });
  const rows = await db.all(`SELECT * FROM ${config.table} ORDER BY name ASC`);
  res.json(rows);
});

app.post('/api/admin/master-data/:type', authenticate, requireRole('admin'), async (req, res) => {
  const config = getMasterConfig(req.params.type);
  if (!config) return res.status(404).json({ error: 'Unknown master data type.' });

  const payload = {};
  for (const col of config.columns) {
    payload[col] = normalizeValue(req.body[col]);
  }

  const error = validateMasterItem(config, payload);
  if (error) return res.status(400).json({ error });

  const colList = config.columns.map((c) => `"${c}"`).join(', ');
  const placeholders = config.columns.map((_, i) => `$${i + 1}`).join(', ');
  const values = config.columns.map((c) => payload[c]);
  const row = await db.get(
    `INSERT INTO ${config.table} (${colList}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  res.json(row);
});

app.patch('/api/admin/master-data/:type/:id', authenticate, requireRole('admin'), async (req, res) => {
  const config = getMasterConfig(req.params.type);
  if (!config) return res.status(404).json({ error: 'Unknown master data type.' });

  const updates = config.columns
    .filter((col) => Object.prototype.hasOwnProperty.call(req.body, col))
    .map((col) => ({ col, value: normalizeValue(req.body[col]) }));

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }

  const setClause = updates.map((u, i) => `"${u.col}" = $${i + 1}`).join(', ');
  const values = updates.map((u) => u.value);
  values.push(req.params.id);

  const row = await db.get(
    `UPDATE ${config.table} SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!row) return res.status(404).json({ error: 'Row not found.' });
  res.json(row);
});

app.delete('/api/admin/master-data/:type/:id', authenticate, requireRole('admin'), async (req, res) => {
  const config = getMasterConfig(req.params.type);
  if (!config) return res.status(404).json({ error: 'Unknown master data type.' });
  const row = await db.get(`DELETE FROM ${config.table} WHERE id = $1 RETURNING *`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Row not found.' });
  res.json({ ok: true });
});

app.post('/api/admin/master-data/:type/bulk', authenticate, requireRole('admin'), csvUpload.single('file'), async (req, res) => {
  const config = getMasterConfig(req.params.type);
  if (!config) return res.status(404).json({ error: 'Unknown master data type.' });

  let items = [];

  if (Array.isArray(req.body?.items)) {
    items = req.body.items;
  } else if (req.file) {
    const content = req.file.buffer.toString('utf8');
    items = parseCsv(content, { columns: true, skip_empty_lines: true, trim: true });
  } else {
    return res.status(400).json({ error: 'No bulk data provided.' });
  }

  const filtered = items
    .map((row) => {
      const entry = {};
      for (const col of config.columns) {
        entry[col] = normalizeValue(row[col]);
      }
      return entry;
    })
    .filter((row) => !validateMasterItem(config, row));

  if (filtered.length === 0) {
    return res.status(400).json({ error: 'No valid rows found in bulk upload.' });
  }

  const colList = config.columns.map((c) => `"${c}"`).join(', ');
  const placeholders = config.columns.map((_, i) => `$${i + 1}`).join(', ');
  const conflict = config.uniqueColumn ? ` ON CONFLICT (${config.uniqueColumn}) DO NOTHING` : '';
  const insertSql = `INSERT INTO ${config.table} (${colList}) VALUES (${placeholders})${conflict}`;

  await db.transaction(async (tx) => {
    for (const row of filtered) {
      const values = config.columns.map((c) => row[c]);
      await tx.run(insertSql, values);
    }
  });

  res.json({ ok: true, inserted: filtered.length });
});



// ========== STANDALONE ADMIN APP ROUTES (Owner-Only, adminAuth) ==========
// These routes use a SEPARATE JWT signed with ADMIN_JWT_SECRET.
// Public user JWTs will be rejected by adminAuth middleware.

async function logAdminAction(action, targetType, targetId) {
  try {
    await db.run(
      'INSERT INTO admin_logs (action, target_type, target_id) VALUES ($1, $2, $3)',
      [action, targetType, String(targetId ?? '')]
    );
  } catch (err) {
    console.error('Failed to write admin log:', err);
  }
}

// POST /api/admin/auth/login — Owner login, no DB lookup
app.post('/api/admin/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const ownerEmail = process.env.ADMIN_EMAIL;
  const ownerPassword = process.env.ADMIN_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    return res.status(500).json({ error: 'Admin credentials not configured on server.' });
  }

  if (email.toLowerCase().trim() !== ownerEmail.toLowerCase().trim()) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Constant-time comparison to prevent timing attacks
  const crypto = (await import('crypto')).default;
  const inputBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(ownerPassword);
  let match = false;
  if (inputBuf.length === expectedBuf.length) {
    match = crypto.timingSafeEqual(inputBuf, expectedBuf);
  }

  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signAdminToken();
  return res.json({ token, owner: { email: ownerEmail } });
});

// GET /api/admin/dashboard/stats — Overview counts
app.get('/api/admin/dashboard/stats', adminAuth, async (_req, res) => {
  const [users, brokers, requirements, offers, listings] = await Promise.all([
    db.get("SELECT COUNT(*) AS cnt FROM users WHERE role = 'buyer'"),
    db.get("SELECT COUNT(*) AS cnt FROM users WHERE role = 'broker'"),
    db.get('SELECT COUNT(*) AS cnt FROM requirements'),
    db.get('SELECT COUNT(*) AS cnt FROM offers'),
    db.get('SELECT COUNT(*) AS cnt FROM broker_listings'),
  ]);
  const [activeUsers, suspendedUsers, activeBrokers, suspendedBrokers, openReqs, closedReqs] = await Promise.all([
    db.get("SELECT COUNT(*) AS cnt FROM users WHERE role = 'buyer' AND status = 'active'"),
    db.get("SELECT COUNT(*) AS cnt FROM users WHERE role = 'buyer' AND status = 'pending'"),
    db.get("SELECT COUNT(*) AS cnt FROM users WHERE role = 'broker' AND status = 'active'"),
    db.get("SELECT COUNT(*) AS cnt FROM users WHERE role = 'broker' AND status = 'pending'"),
    db.get("SELECT COUNT(*) AS cnt FROM requirements WHERE status = 'open'"),
    db.get("SELECT COUNT(*) AS cnt FROM requirements WHERE status = 'closed'"),
  ]);
  res.json({
    totalUsers: Number(users?.cnt ?? 0),
    totalBrokers: Number(brokers?.cnt ?? 0),
    totalRequirements: Number(requirements?.cnt ?? 0),
    totalOffers: Number(offers?.cnt ?? 0),
    totalListings: Number(listings?.cnt ?? 0),
    activeUsers: Number(activeUsers?.cnt ?? 0),
    suspendedUsers: Number(suspendedUsers?.cnt ?? 0),
    activeBrokers: Number(activeBrokers?.cnt ?? 0),
    suspendedBrokers: Number(suspendedBrokers?.cnt ?? 0),
    openRequirements: Number(openReqs?.cnt ?? 0),
    closedRequirements: Number(closedReqs?.cnt ?? 0),
  });
});


// PATCH /api/admin/users/:id/suspend — Suspend or unsuspend a buyer
app.patch('/api/admin/users/:id/suspend', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { suspended } = req.body;
  if (typeof suspended !== 'boolean') {
    return res.status(400).json({ error: '"suspended" boolean field is required.' });
  }
  const row = await db.get("SELECT id FROM users WHERE id = $1 AND role = 'buyer'", [id]);
  if (!row) return res.status(404).json({ error: 'User not found.' });

  const newStatus = suspended ? 'pending' : 'active';
  await db.run('UPDATE users SET status = $1 WHERE id = $2', [newStatus, id]);
  await logAdminAction(suspended ? 'suspend_user' : 'unsuspend_user', 'user', id);
  res.json({ ok: true, status: newStatus });
});

// GET /api/admin/brokers — List all brokers
app.get('/api/admin/brokers', adminAuth, async (req, res) => {
  const { q } = req.query;
  const rows = await db.all(`
    SELECT u.id, u.email, u.business_name AS "businessName", u.phone, u.city,
           u.dealer_type AS "dealerType", u.status, u.created_at AS "createdAt",
           COUNT(bl.id)::int AS "listingCount"
    FROM users u
    LEFT JOIN broker_listings bl ON bl.broker_id = u.id
    WHERE u.role = 'broker'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  const filtered = q
    ? rows.filter(r =>
        r.email?.toLowerCase().includes(q.toLowerCase()) ||
        r.businessName?.toLowerCase().includes(q.toLowerCase()) ||
        r.city?.toLowerCase().includes(q.toLowerCase())
      )
    : rows;
  res.json(filtered);
});

// PATCH /api/admin/brokers/:id/suspend — Suspend or unsuspend a broker
app.patch('/api/admin/brokers/:id/suspend', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { suspended } = req.body;
  if (typeof suspended !== 'boolean') {
    return res.status(400).json({ error: '"suspended" boolean field is required.' });
  }
  const row = await db.get("SELECT id FROM users WHERE id = $1 AND role = 'broker'", [id]);
  if (!row) return res.status(404).json({ error: 'Broker not found.' });

  const newStatus = suspended ? 'pending' : 'active';
  await db.run('UPDATE users SET status = $1 WHERE id = $2', [newStatus, id]);
  await logAdminAction(suspended ? 'suspend_broker' : 'unsuspend_broker', 'broker', id);
  res.json({ ok: true, status: newStatus });
});

// GET /api/admin/requirements — List all requirements
app.get('/api/admin/requirements', adminAuth, async (req, res) => {
  const { q } = req.query;
  const rows = await db.all(`
    SELECT r.id, r.description, r.status, r.vehicle_type AS "vehicleType",
           r.city, r.state, r.budget_max AS "budgetMax", r.created_at AS "createdAt",
           u.email AS "buyerEmail", u.name AS "buyerName",
           b.name AS "brandName", m.name AS "modelName"
    FROM requirements r
    LEFT JOIN users u ON u.id = r.buyer_id
    LEFT JOIN brands b ON b.id = r.brand_id
    LEFT JOIN models m ON m.id = r.model_id
    ORDER BY r.created_at DESC
  `);
  const filtered = q
    ? rows.filter(r =>
        r.buyerEmail?.toLowerCase().includes(q.toLowerCase()) ||
        r.brandName?.toLowerCase().includes(q.toLowerCase()) ||
        r.modelName?.toLowerCase().includes(q.toLowerCase()) ||
        r.city?.toLowerCase().includes(q.toLowerCase()) ||
        r.description?.toLowerCase().includes(q.toLowerCase())
      )
    : rows;
  res.json(filtered);
});

// DELETE /api/admin/requirements/:id — Delete a requirement
app.delete('/api/admin/requirements/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const row = await db.get('SELECT id FROM requirements WHERE id = $1', [id]);
  if (!row) return res.status(404).json({ error: 'Requirement not found.' });
  await db.run('DELETE FROM requirements WHERE id = $1', [id]);
  await logAdminAction('delete_requirement', 'requirement', id);
  res.json({ ok: true });
});

// GET /api/admin/offers — List all offers
app.get('/api/admin/offers', adminAuth, async (req, res) => {
  const { q } = req.query;
  const rows = await db.all(`
    SELECT o.id, o.price, o.status, o.details, o.variant, o.year,
           o.dealer_name AS "dealerName", o.dealer_location AS "dealerLocation",
           o.created_at AS "createdAt",
           ub.email AS "buyerEmail",
           ubr.email AS "brokerEmail", ubr.business_name AS "brokerName",
           b.name AS "brandName", m.name AS "modelName"
    FROM offers o
    LEFT JOIN requirements r ON r.id = o.requirement_id
    LEFT JOIN users ub ON ub.id = r.buyer_id
    LEFT JOIN users ubr ON ubr.id = o.broker_id
    LEFT JOIN brands b ON b.id = r.brand_id
    LEFT JOIN models m ON m.id = r.model_id
    ORDER BY o.created_at DESC
  `);
  const filtered = q
    ? rows.filter(r =>
        r.buyerEmail?.toLowerCase().includes(q.toLowerCase()) ||
        r.brokerEmail?.toLowerCase().includes(q.toLowerCase()) ||
        r.brokerName?.toLowerCase().includes(q.toLowerCase()) ||
        r.brandName?.toLowerCase().includes(q.toLowerCase()) ||
        r.modelName?.toLowerCase().includes(q.toLowerCase())
      )
    : rows;
  res.json(filtered);
});

// DELETE /api/admin/offers/:id — Delete an offer
app.delete('/api/admin/offers/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const row = await db.get('SELECT id FROM offers WHERE id = $1', [id]);
  if (!row) return res.status(404).json({ error: 'Offer not found.' });
  await db.run('DELETE FROM offers WHERE id = $1', [id]);
  await logAdminAction('delete_offer', 'offer', id);
  res.json({ ok: true });
});

// GET /api/admin/listings — List all broker listings
app.get('/api/admin/listings', adminAuth, async (req, res) => {
  const { q } = req.query;
  const rows = await db.all(`
    SELECT bl.id, bl.year, bl.price, bl.status, bl.city, bl.km_driven AS "kmDriven",
           bl.fuel_type AS "fuelType", bl.transmission, bl.created_at AS "createdAt",
           u.email AS "brokerEmail", u.business_name AS "brokerName",
           b.name AS "brandName", m.name AS "modelName"
    FROM broker_listings bl
    LEFT JOIN users u ON u.id = bl.broker_id
    LEFT JOIN brands b ON b.id = bl.brand_id
    LEFT JOIN models m ON m.id = bl.model_id
    ORDER BY bl.created_at DESC
  `);
  const filtered = q
    ? rows.filter(r =>
        r.brokerEmail?.toLowerCase().includes(q.toLowerCase()) ||
        r.brokerName?.toLowerCase().includes(q.toLowerCase()) ||
        r.brandName?.toLowerCase().includes(q.toLowerCase()) ||
        r.modelName?.toLowerCase().includes(q.toLowerCase()) ||
        r.city?.toLowerCase().includes(q.toLowerCase())
      )
    : rows;
  res.json(filtered);
});

// DELETE /api/admin/listings/:id — Delete a listing
app.delete('/api/admin/listings/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const row = await db.get('SELECT id FROM broker_listings WHERE id = $1', [id]);
  if (!row) return res.status(404).json({ error: 'Listing not found.' });
  await db.run('DELETE FROM broker_listings WHERE id = $1', [id]);
  await logAdminAction('delete_listing', 'listing', id);
  res.json({ ok: true });
});

// GET /api/admin/logs — View admin action audit log
app.get('/api/admin/logs', adminAuth, async (_req, res) => {
  const rows = await db.all(
    'SELECT id, action, target_type AS "targetType", target_id AS "targetId", created_at AS "createdAt" FROM admin_logs ORDER BY created_at DESC LIMIT 500'
  );
  res.json(rows);
});



// ========== GLOBAL ERROR HANDLER ==========

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed.' });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

export default app;
