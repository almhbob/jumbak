import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { UserRole } from '@prisma/client';
import { cities, countries, estimateFare, findCity, findVehicleType, vehicleTypes } from './config.js';
import { prisma, isDatabaseEnabled } from './db.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const drivers = [
  { id: 'driver_1', name: 'Mohammed Ahmed', phone: '+249900000001', vehicleTypeId: 'rickshaw', vehicle: 'Blue rickshaw', rating: 4.8, online: true, cityId: 'rufaa' },
  { id: 'driver_2', name: 'Ali Altayeb', phone: '+249900000002', vehicleTypeId: 'car', vehicle: 'White car', rating: 4.7, online: true, cityId: 'rufaa' },
  { id: 'driver_3', name: 'Khalid Osman', phone: '+249900000003', vehicleTypeId: 'van', vehicle: 'Family van', rating: 4.6, online: false, cityId: 'khartoum' }
];

const memoryRides: any[] = [];
const memoryUsers: any[] = [];
const memoryCities: any[] = [...cities];
const memoryVehicleTypes: any[] = [...vehicleTypes];

function findMemoryRide(id: string) {
  return memoryRides.find((item) => item.id === id);
}

function normalizeRole(role?: string): UserRole {
  if (role === 'DRIVER') return UserRole.DRIVER;
  if (role === 'ADMIN') return UserRole.ADMIN;
  return UserRole.PASSENGER;
}

function publicUser(user: any) {
  return { id: user.id, phone: user.phone, name: user.name, role: user.role };
}

app.get('/', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', message: 'Multi-city transport platform', database: isDatabaseEnabled() });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', region: 'global-ready', database: isDatabaseEnabled() });
});

app.post('/api/auth/request-otp', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) return res.status(400).json({ error: 'Phone is required' });
  res.json({ ok: true, phone, devOtp: '123456', message: 'OTP generated for development. Replace with SMS provider before production.' });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const code = String(req.body.code || '').trim();
  const name = String(req.body.name || '').trim() || null;
  const role = normalizeRole(String(req.body.role || 'PASSENGER'));
  if (!phone) return res.status(400).json({ error: 'Phone is required' });
  if (code !== '123456') return res.status(401).json({ error: 'Invalid OTP' });

  if (prisma) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { name: name || undefined, role },
      create: { phone, name, role }
    });
    return res.json({ ok: true, user: publicUser(user), token: `dev_${user.id}` });
  }

  let user = memoryUsers.find((item) => item.phone === phone);
  if (!user) {
    user = { id: `user_${Date.now()}`, phone, name, role, createdAt: new Date().toISOString() };
    memoryUsers.push(user);
  } else {
    user.name = name || user.name;
    user.role = role;
  }
  res.json({ ok: true, user: publicUser(user), token: `dev_${user.id}` });
});

app.get('/api/config', async (_req, res) => {
  if (prisma) {
    const [dbCountries, dbCities, dbVehicleTypes] = await Promise.all([
      prisma.country.findMany(),
      prisma.city.findMany({ include: { zones: true } }),
      prisma.vehicleType.findMany()
    ]);
    return res.json({ countries: dbCountries, cities: dbCities, vehicleTypes: dbVehicleTypes });
  }
  res.json({ countries, cities: memoryCities, vehicleTypes: memoryVehicleTypes });
});

app.post('/api/admin/cities', async (req, res) => {
  const id = String(req.body.id || '').trim().toLowerCase();
  const countryId = String(req.body.countryId || 'sd');
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || '').trim();
  const zonesAr = Array.isArray(req.body.zonesAr) ? req.body.zonesAr : [];
  const zonesEn = Array.isArray(req.body.zonesEn) ? req.body.zonesEn : [];
  if (!id || !nameAr || !nameEn) return res.status(400).json({ error: 'id, nameAr and nameEn are required' });

  if (prisma) {
    const city = await prisma.city.upsert({
      where: { id },
      update: { countryId, nameAr, nameEn },
      create: { id, countryId, nameAr, nameEn }
    });
    for (let i = 0; i < Math.max(zonesAr.length, zonesEn.length); i++) {
      await prisma.zone.upsert({
        where: { id: `${id}_${i}` },
        update: { nameAr: zonesAr[i] || zonesEn[i] || `Zone ${i + 1}`, nameEn: zonesEn[i] || zonesAr[i] || `Zone ${i + 1}` },
        create: { id: `${id}_${i}`, cityId: id, nameAr: zonesAr[i] || zonesEn[i] || `Zone ${i + 1}`, nameEn: zonesEn[i] || zonesAr[i] || `Zone ${i + 1}` }
      });
    }
    return res.status(201).json(city);
  }

  const city = { id, countryId, nameAr, nameEn, zonesAr, zonesEn };
  const index = memoryCities.findIndex((item) => item.id === id);
  if (index >= 0) memoryCities[index] = city; else memoryCities.push(city);
  res.status(201).json(city);
});

app.post('/api/admin/vehicle-types', async (req, res) => {
  const id = String(req.body.id || '').trim().toLowerCase();
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || '').trim();
  const baseFare = Number(req.body.baseFare || 0);
  const perKmFare = Number(req.body.perKmFare || 0);
  const minimumFare = Number(req.body.minimumFare || 0);
  if (!id || !nameAr || !nameEn || !baseFare || !perKmFare || !minimumFare) return res.status(400).json({ error: 'Missing vehicle type fields' });

  const item = { id, nameAr, nameEn, baseFare, perKmFare, minimumFare };
  if (prisma) {
    const vehicleType = await prisma.vehicleType.upsert({ where: { id }, update: item, create: item });
    return res.status(201).json(vehicleType);
  }

  const index = memoryVehicleTypes.findIndex((value) => value.id === id);
  if (index >= 0) memoryVehicleTypes[index] = item; else memoryVehicleTypes.push(item);
  res.status(201).json(item);
});

app.post('/api/drivers/register', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const name = String(req.body.name || '').trim();
  const cityId = String(req.body.cityId || 'rufaa');
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');
  const plateNo = String(req.body.plateNo || '').trim();
  const color = String(req.body.color || '').trim();
  const model = String(req.body.model || '').trim();
  if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' });

  if (prisma) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { name, role: UserRole.DRIVER },
      create: { phone, name, role: UserRole.DRIVER }
    });
    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: { cityId, isOnline: false, isVerified: false },
      create: { userId: user.id, cityId, isOnline: false, isVerified: false }
    });
    const vehicle = await prisma.vehicle.upsert({
      where: { driverId: driver.id },
      update: { vehicleTypeId, plateNo, color, model },
      create: { driverId: driver.id, vehicleTypeId, plateNo, color, model }
    });
    return res.status(201).json({ ok: true, user: publicUser(user), driver, vehicle });
  }

  const driver = { id: `driver_${Date.now()}`, name, phone, cityId, vehicleTypeId, vehicle: `${color || 'Vehicle'} ${model || vehicleTypeId}`, rating: 5, online: false, verified: false, plateNo };
  drivers.push(driver);
  res.status(201).json({ ok: true, driver });
});

app.get('/api/drivers', async (req, res) => {
  const cityId = String(req.query.cityId || '');
  const vehicleTypeId = String(req.query.vehicleTypeId || '');

  if (prisma) {
    const result = await prisma.driver.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(vehicleTypeId ? { vehicle: { vehicleTypeId } } : {})
      },
      include: { user: true, vehicle: { include: { vehicleType: true } } }
    });
    return res.json(result.map((driver) => ({
      id: driver.id,
      name: driver.user.name || driver.user.phone,
      vehicleTypeId: driver.vehicle?.vehicleTypeId,
      vehicle: driver.vehicle?.vehicleType.nameEn || 'Vehicle',
      rating: 4.8,
      online: driver.isOnline,
      verified: driver.isVerified,
      cityId: driver.cityId
    })));
  }

  const result = drivers.filter((driver) => {
    if (cityId && driver.cityId !== cityId) return false;
    if (vehicleTypeId && driver.vehicleTypeId !== vehicleTypeId) return false;
    return true;
  });
  res.json(result);
});

app.post('/api/pricing/estimate', async (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');
  const cityId = String(req.body.cityId || 'rufaa');

  if (prisma) {
    const [city, vehicle] = await Promise.all([
      prisma.city.findUnique({ where: { id: cityId }, include: { country: true } }),
      prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } })
    ]);
    const fallbackCity = findCity(cityId);
    const fallbackVehicle = findVehicleType(vehicleTypeId);
    const selectedVehicle = vehicle || fallbackVehicle;
    const estimatedFare = Math.max(Math.round(selectedVehicle.baseFare + distanceKm * selectedVehicle.perKmFare), selectedVehicle.minimumFare);
    return res.json({ currency: city?.country.currency || (fallbackCity.countryId === 'sa' ? 'SAR' : 'SDG'), city: city || fallbackCity, vehicle: selectedVehicle, distanceKm, estimatedFare });
  }

  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  res.json({ currency: city.countryId === 'sa' ? 'SAR' : 'SDG', city, vehicle, distanceKm, estimatedFare: estimateFare(distanceKm, vehicleTypeId) });
});

app.get('/api/rides', async (_req, res) => {
  if (prisma) {
    const result = await prisma.ride.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { city: true, vehicleType: true, driver: { include: { user: true } } } });
    return res.json(result);
  }
  res.json(memoryRides.slice().reverse());
});

app.get('/api/rides/:id', async (req, res) => {
  if (prisma) {
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id }, include: { city: true, vehicleType: true, driver: { include: { user: true } } } });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    return res.json(ride);
  }
  const ride = findMemoryRide(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
});

app.post('/api/rides', async (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  const cityId = String(req.body.cityId || 'rufaa');
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');

  if (prisma) {
    const vehicle = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
    const selectedVehicle = vehicle || findVehicleType(vehicleTypeId);
    const matchedDriver = await prisma.driver.findFirst({ where: { cityId, isOnline: true, isVerified: true, vehicle: { vehicleTypeId } } });
    const ride = await prisma.ride.create({
      data: {
        cityId,
        vehicleTypeId,
        driverId: matchedDriver?.id,
        pickupLabel: req.body.pickupLabel || 'Pickup',
        destinationLabel: req.body.destinationLabel || 'Destination',
        distanceKm,
        estimatedFare: Math.max(Math.round(selectedVehicle.baseFare + distanceKm * selectedVehicle.perKmFare), selectedVehicle.minimumFare),
        status: 'REQUESTED'
      }
    });
    return res.status(201).json(ride);
  }

  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  const matchedDriver = drivers.find((driver) => driver.cityId === cityId && driver.vehicleTypeId === vehicleTypeId && driver.online);
  const ride = {
    id: `ride_${Date.now()}`,
    cityId,
    cityName: city.nameEn,
    vehicleTypeId,
    vehicleName: vehicle.nameEn,
    driverId: matchedDriver?.id || null,
    driverName: matchedDriver?.name || null,
    pickupLabel: req.body.pickupLabel || city.zonesEn[0],
    destinationLabel: req.body.destinationLabel || city.zonesEn[1],
    distanceKm,
    estimatedFare: estimateFare(distanceKm, vehicleTypeId),
    status: 'REQUESTED',
    rating: null,
    createdAt: new Date().toISOString()
  };
  memoryRides.push(ride);
  res.status(201).json(ride);
});

app.patch('/api/rides/:id/status', async (req, res) => {
  if (prisma) {
    const ride = await prisma.ride.update({ where: { id: req.params.id }, data: { status: req.body.status || 'REQUESTED' } }).catch(() => null);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    return res.json(ride);
  }
  const ride = findMemoryRide(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  ride.status = req.body.status || ride.status;
  ride.updatedAt = new Date().toISOString();
  res.json(ride);
});

app.patch('/api/rides/:id/rating', async (req, res) => {
  const rating = Number(req.body.rating || 0);
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  if (prisma) {
    const ride = await prisma.ride.update({ where: { id: req.params.id }, data: { rating, status: 'COMPLETED' } }).catch(() => null);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    return res.json(ride);
  }

  const ride = findMemoryRide(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  ride.rating = rating;
  ride.status = 'COMPLETED';
  ride.updatedAt = new Date().toISOString();
  res.json(ride);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`JUMBAK API running on port ${port}`));
