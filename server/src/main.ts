import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { cities, countries, estimateFare, findCity, findVehicleType, vehicleTypes } from './config.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const drivers = [
  { id: 'driver_1', name: 'Mohammed Ahmed', vehicleTypeId: 'rickshaw', vehicle: 'Blue rickshaw', rating: 4.8, online: true, cityId: 'rufaa' },
  { id: 'driver_2', name: 'Ali Altayeb', vehicleTypeId: 'car', vehicle: 'White car', rating: 4.7, online: true, cityId: 'rufaa' },
  { id: 'driver_3', name: 'Khalid Osman', vehicleTypeId: 'van', vehicle: 'Family van', rating: 4.6, online: false, cityId: 'khartoum' }
];

const rides: any[] = [];

app.get('/', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', message: 'Multi-city transport platform' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', region: 'global-ready' });
});

app.get('/api/config', (_req, res) => {
  res.json({ countries, cities, vehicleTypes });
});

app.get('/api/drivers', (req, res) => {
  const cityId = String(req.query.cityId || '');
  const vehicleTypeId = String(req.query.vehicleTypeId || '');
  const result = drivers.filter((driver) => {
    if (cityId && driver.cityId !== cityId) return false;
    if (vehicleTypeId && driver.vehicleTypeId !== vehicleTypeId) return false;
    return true;
  });
  res.json(result);
});

app.post('/api/pricing/estimate', (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');
  const cityId = String(req.body.cityId || 'rufaa');
  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  res.json({ currency: city.countryId === 'sa' ? 'SAR' : 'SDG', city, vehicle, distanceKm, estimatedFare: estimateFare(distanceKm, vehicleTypeId) });
});

app.get('/api/rides', (_req, res) => {
  res.json(rides.slice().reverse());
});

app.post('/api/rides', (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  const cityId = String(req.body.cityId || 'rufaa');
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');
  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  const ride = {
    id: `ride_${Date.now()}`,
    cityId,
    cityName: city.nameEn,
    vehicleTypeId,
    vehicleName: vehicle.nameEn,
    pickupLabel: req.body.pickupLabel || city.zonesEn[0],
    destinationLabel: req.body.destinationLabel || city.zonesEn[1],
    distanceKm,
    estimatedFare: estimateFare(distanceKm, vehicleTypeId),
    status: 'REQUESTED',
    createdAt: new Date().toISOString()
  };
  rides.push(ride);
  res.status(201).json(ride);
});

app.patch('/api/rides/:id/status', (req, res) => {
  const ride = rides.find((item) => item.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  ride.status = req.body.status || ride.status;
  ride.updatedAt = new Date().toISOString();
  res.json(ride);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`JUMBAK API running on port ${port}`));
