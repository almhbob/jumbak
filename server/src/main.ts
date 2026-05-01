import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const drivers = [
  { id: 'driver_1', name: 'Mohammed Ahmed', vehicle: 'Blue rickshaw', rating: 4.8, online: true },
  { id: 'driver_2', name: 'Ali Altayeb', vehicle: 'Yellow rickshaw', rating: 4.7, online: true }
];

const rides: any[] = [];

function estimateFare(distanceKm: number) {
  return Math.max(Math.round(500 + distanceKm * 300), 1000);
}

app.get('/', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', message: 'Rickshaw near you' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'JUMBAK', region: 'Rufaa Sudan' });
});

app.get('/api/drivers', (_req, res) => {
  res.json(drivers);
});

app.post('/api/pricing/estimate', (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  res.json({ currency: 'SDG', distanceKm, estimatedFare: estimateFare(distanceKm) });
});

app.get('/api/rides', (_req, res) => {
  res.json(rides.slice().reverse());
});

app.post('/api/rides', (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  const ride = {
    id: `ride_${Date.now()}`,
    pickupLabel: req.body.pickupLabel || 'Market',
    destinationLabel: req.body.destinationLabel || 'Hospital',
    distanceKm,
    estimatedFare: estimateFare(distanceKm),
    status: 'REQUESTED',
    createdAt: new Date().toISOString()
  };
  rides.push(ride);
  res.status(201).json(ride);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`JUMBAK API running on port ${port}`));
