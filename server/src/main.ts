import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { cities, countries, estimateFare, findCity, findVehicleType, vehicleTypes } from './config.js';
import { prisma, isDatabaseEnabled } from './db.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const drivers = [
  { id: 'driver_1', name: 'Mohammed Ahmed', vehicleTypeId: 'rickshaw', vehicle: 'Blue rickshaw', rating: 4.8, online: true, cityId: 'rufaa' },
  { id: 'driver_2', name: 'Ali Altayeb', vehicleTypeId: 'car', vehicle: 'White car', rating: 4.7, online: true, cityId: 'rufaa' },
  { id: 'driver_3', name: 'Khalid Osman', vehicleTypeId: 'van', vehicle: 'Family van', rating: 4.6, online: false, cityId: 'khartoum' }
];

const memoryRides: any[] = [];

function findMemoryRide(id: string) {
  return memoryRides.find((item) => item.id === id);
}

app.get('/', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', message: 'Multi-city transport platform', database: isDatabaseEnabled() });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', region: 'global-ready', database: isDatabaseEnabled() });
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
  res.json({ countries, cities, vehicleTypes });
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
    const matchedDriver = await prisma.driver.findFirst({ where: { cityId, isOnline: true, vehicle: { vehicleTypeId } } });
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
