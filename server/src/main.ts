import 'dotenv/config';
import * as Sentry from '@sentry/node';

// Sentry must be initialized before any other imports that may throw
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import { argv } from 'process';
import { prisma, isDatabaseEnabled } from './db.js';
import { countries } from './config.js';
import { memoryCities, memoryVehicleTypes } from './routes/configStore.js';
import { rufaaZones } from './data/rufaaZones.js';
import { findCity, findVehicleType, estimateFare } from './config.js';
import { initSocket } from './services/socketService.js';
import { logger } from './services/logger.js';

import authRoutes from './routes/authRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ridesRoutes from './routes/ridesRoutes.js';
import driversRoutes from './routes/driversRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import legalRoutes from './routes/legalRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import { memoryStaff } from './store.js';
import bcrypt from 'bcryptjs';

// Bootstrap developer account for memory mode (no database)
(async () => {
  if (memoryStaff.length === 0) {
    const pwd = process.env.BOOTSTRAP_ADMIN_PASSWORD || '123456';
    const hash = await bcrypt.hash(pwd, 10);
    memoryStaff.push({
      id: 'dev_bootstrap',
      name: 'Developer',
      phone: null,
      email: null,
      username: 'developer',
      passwordHash: hash,
      role: 'developer',
      status: 'active',
      notes: null,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });
    logger.info('Bootstrap developer account created for memory mode');
  }
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
const httpServer = createServer(app);

// Trust Railway / Cloudflare reverse proxy so rate-limiter and req.ip work correctly
app.set('trust proxy', 1);

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3001', 'http://localhost:3000', 'https://jnbk-admin.pages.dev'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ─── Security ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Global rate limit — 200 req/min per IP (generous for mobile clients)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    message: { error: 'Too many requests, please slow down' },
  })
);

// ─── HTTP request logging ──────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);

// ─── Config ────────────────────────────────────────────────────────────────
app.get('/api/config', async (_req, res) => {
  if (prisma) {
    const [dbCountries, dbCities, dbVehicleTypes] = await Promise.all([
      prisma.country.findMany(),
      prisma.city.findMany({ include: { zones: true } }),
      prisma.vehicleType.findMany(),
    ]);
    return res.json({ countries: dbCountries, cities: dbCities, vehicleTypes: dbVehicleTypes });
  }
  const citiesWithZones = memoryCities.map((city) => ({
    ...city,
    zones: rufaaZones.filter((z) => z.cityId === city.id),
  }));
  res.json({ countries, cities: citiesWithZones, vehicleTypes: memoryVehicleTypes });
});

// ─── Fare estimation ───────────────────────────────────────────────────────
app.post('/api/pricing/estimate', async (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');
  const cityId = String(req.body.cityId || 'rufaa');

  if (prisma) {
    const [city, vehicle] = await Promise.all([
      prisma.city.findUnique({ where: { id: cityId }, include: { country: true } }),
      prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } }),
    ]);
    const fallbackCity = findCity(cityId);
    const fallbackVehicle = findVehicleType(vehicleTypeId);
    const selectedVehicle = vehicle || fallbackVehicle;
    const estimatedFare = Math.max(
      Math.round(selectedVehicle.baseFare + distanceKm * selectedVehicle.perKmFare),
      selectedVehicle.minimumFare
    );
    return res.json({
      currency: city?.country.currency || (fallbackCity.countryId === 'sa' ? 'SAR' : 'SDG'),
      city: city || fallbackCity,
      vehicle: selectedVehicle,
      distanceKm,
      estimatedFare,
    });
  }

  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  res.json({
    currency: city.countryId === 'sa' ? 'SAR' : 'SDG',
    city,
    vehicle,
    distanceKm,
    estimatedFare: estimateFare(distanceKm, vehicleTypeId),
  });
});

// ─── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'Jnbk', appAr: 'جنبك', region: 'global-ready', database: isDatabaseEnabled() });
});

// ─── Static / web app ──────────────────────────────────────────────────────
app.use('/app', express.static(publicDir));
app.get('/app/*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    app: 'Jnbk',
    appAr: 'جنبك',
    message: 'Multi-city transport platform',
    database: isDatabaseEnabled(),
    webApp: '/app',
    realtime: '/socket.io',
  });
});

// ─── Sentry error handler (must come after routes) ────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ─── Socket.io ─────────────────────────────────────────────────────────────
initSocket(httpServer, allowedOrigins);

// ─── Start (only when run directly, not imported by tests) ─────────────────
const currentFile = fileURLToPath(import.meta.url);
const isMain = argv[1] === currentFile || argv[1]?.endsWith('/main.js');

if (isMain) {
  const port = Number(process.env.PORT || 4000);
  httpServer.listen(port, '0.0.0.0', () => {
    logger.info(`Jnbk API running on port ${port}`, { database: isDatabaseEnabled(), realtime: true });
  });
}

export { app, httpServer };
