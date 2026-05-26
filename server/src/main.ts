import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma, isDatabaseEnabled } from './db.js';
import { countries } from './config.js';
import { memoryCities, memoryVehicleTypes } from './routes/configStore.js';
import { rufaaZones } from './data/rufaaZones.js';
import { findCity, findVehicleType, estimateFare } from './config.js';

import authRoutes from './routes/authRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ridesRoutes from './routes/ridesRoutes.js';
import driversRoutes from './routes/driversRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import legalRoutes from './routes/legalRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to known origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3001', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/notifications', notificationRoutes);

// Public config endpoint
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

// Fare estimation
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

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'Jnbk', appAr: 'جنبك', region: 'global-ready', database: isDatabaseEnabled() });
});

app.get('/', (_req, res) => {
  res.json({ ok: true, app: 'Jnbk', appAr: 'جنبك', message: 'Multi-city transport platform', database: isDatabaseEnabled() });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`Jnbk API running on port ${port}`));
