import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jnbk-dev-secret-change-in-production';
const JWT_EXPIRY = '12h';
const REFRESH_EXPIRY = '30d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET env var is not set. Using insecure default in production is not allowed.');
  process.exit(1);
}

export type StaffPayload = {
  staffId: string;
  username: string;
  role: string;
};

export function signToken(payload: StaffPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function signRefreshToken(payload: StaffPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyRefreshToken(token: string): StaffPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as StaffPayload & { type?: string };
    if (decoded.type !== 'refresh') return null;
    const { type: _type, ...payload } = decoded as StaffPayload & { type: string };
    return payload;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): StaffPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as StaffPayload;
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.staff = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.staff) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.staff.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
