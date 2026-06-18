import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  console.error('Create a .env file with JWT_SECRET=<your-secret>');
  process.exit(1);
}

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
  console.error('FATAL: ADMIN_JWT_SECRET environment variable is not set.');
  console.error('Create a .env file with ADMIN_JWT_SECRET=<your-admin-secret>');
  process.exit(1);
}

/**
 * Middleware: verify JWT and attach decoded payload to req.user.
 * Rejects with 401 if token is missing or invalid.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { sub, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Middleware factory: restrict access to specific roles.
 * Must be used AFTER authenticate().
 *
 * Usage: requireRole('admin')
 *        requireRole('admin', 'broker')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

/**
 * Middleware: verify the authenticated user owns the resource.
 * Compares req.user.sub against req.params[paramName].
 *
 * Usage: requireOwnership('id')  — checks req.params.id === req.user.sub
 */
export function requireOwnership(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role === 'admin') {
      // Admins can act on any resource
      return next();
    }
    if (String(req.params[paramName]) !== String(req.user.sub)) {
      return res.status(403).json({ error: 'You can only modify your own resources.' });
    }
    next();
  };
}

// ========== STANDALONE ADMIN APP AUTH ==========
// Uses a completely separate JWT secret — public user tokens are NEVER valid here.

/**
 * Sign a short-lived JWT for the standalone admin app.
 * Payload marks this as an owner-level token using the dedicated ADMIN_JWT_SECRET.
 */
export function signAdminToken() {
  return jwt.sign(
    { owner: true },
    ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * Middleware: verify admin-only JWT (signed with ADMIN_JWT_SECRET).
 * Public user JWTs signed with JWT_SECRET will be rejected.
 */
export function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (!decoded.owner) {
      return res.status(403).json({ error: 'Not authorized as owner.' });
    }
    req.adminOwner = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid admin authentication token.' });
  }
}

export { JWT_SECRET };
