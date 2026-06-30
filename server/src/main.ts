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
import driverProfileRoutes from './routes/driverProfileRoutes.js';
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
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([
  'http://localhost:3001',
  'http://localhost:3000',
  'https://jnbk-admin.pages.dev',
  'https://jumbak-admin.vercel.app',
  'https://jumbak-admin-git-main-asim-abdulrahman-mohammed.vercel.app',
  ...configuredOrigins,
]));

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
app.use('/api/drivers/me', driverProfileRoutes);
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
      prisma.vehicleType.findMany({ where: { isVisible: true }, orderBy: { id: 'asc' } }),
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

// ─── Public legal pages (required for Google Play listing) ────────────────
const legalHtml = (titleAr: string, titleEn: string, sections: { h: string; p: string }[]) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titleAr} — جنبك</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a2535;line-height:1.7}
h1{color:#063B63;font-size:1.6rem}h2{color:#063B63;font-size:1.1rem;margin-top:2rem}
p{color:#374151}footer{margin-top:3rem;color:#9ca3af;font-size:.85rem;border-top:1px solid #e5e7eb;padding-top:1rem}</style>
</head><body>
<h1>${titleAr}<br><small style="font-size:.7em;color:#6b7280">${titleEn}</small></h1>
${sections.map(s => `<h2>${s.h}</h2><p>${s.p}</p>`).join('\n')}
<footer>جنبك — Jnbk &nbsp;|&nbsp; آخر تحديث: ${new Date().getFullYear()}</footer>
</body></html>`;

app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(legalHtml('سياسة الخصوصية', 'Privacy Policy', [
    { h: 'البيانات التي نجمعها', p: 'رقم الهاتف، الاسم، المدينة، بيانات الرحلات، رسائل الدعم، وبيانات السائق والمركبة عند الحاجة.' },
    { h: 'كيف نستخدم البيانات', p: 'تشغيل الرحلات، دعم المستخدمين، إدارة السائقين، حساب الأسعار، تحسين السلامة، وإصدار التقارير التشغيلية.' },
    { h: 'بيانات الموقع', p: 'قد تُستخدم بيانات الموقع لاختيار نقطة الانطلاق والوجهة وحساب المسافة وربط السائقين القريبين.' },
    { h: 'أمن البيانات', p: 'يتم تقييد الوصول حسب الصلاحية. في الإنتاج يُستخدم اتصال مشفر وجلسات آمنة وصلاحيات محدودة.' },
    { h: 'حذف البيانات', p: 'يمكن للمستخدمين طلب حذف بياناتهم عبر قسم الدعم في التطبيق.' },
    { h: 'التواصل', p: 'يمكن التواصل عبر التطبيق أو البريد الإلكتروني للدعم المنشور في صفحة المتجر.' },
  ]));
});

app.get('/terms', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(legalHtml('شروط الاستخدام', 'Terms of Use', [
    { h: 'نطاق الخدمة', p: 'يوفر جنبك منصة تقنية لربط الركاب بمقدمي خدمات النقل المتاحين حسب المدن والخدمات المدعومة.' },
    { h: 'مسؤوليات المستخدم', p: 'يلتزم المستخدم بتقديم بيانات صحيحة واحترام السائقين والركاب وعدم إساءة استخدام المنصة.' },
    { h: 'مسؤوليات السائق', p: 'يلتزم السائق بتقديم بيانات صحيحة والامتثال للأنظمة المحلية والحفاظ على سلامة المركبة ومعايير الرحلة.' },
    { h: 'الأسعار', p: 'قد يتغير السعر التقديري حسب المسافة والمدينة ونوع الخدمة والعروض أو التعديلات التشغيلية.' },
    { h: 'إيقاف الحساب', p: 'يمكن لجنبك إيقاف الحسابات المرتبطة بالاحتيال أو السلوك غير الآمن أو الشكاوى المتكررة أو مخالفة القواعد.' },
  ]));
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
