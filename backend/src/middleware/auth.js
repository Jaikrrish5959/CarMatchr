import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  console.error('Create a .env file with JWT_SECRET=<your-secret>');
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

export { JWT_SECRET };
