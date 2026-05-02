import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { cities, countries, estimateFare, findCity, findVehicleType, vehicleTypes } from './config.js';
import { prisma, isDatabaseEnabled } from './db.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const APP_NAME = 'Jnbk';
const APP_NAME_AR = 'جنبك';

type StaffRoleInput = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';
const memoryStaff: any[] = [];
const memoryLegalDocuments: any[] = [];

function hashPassword(password: string) { return crypto.createHash('sha256').update(password).digest('hex'); }
function normalizeStaffRole(role: string): StaffRoleInput {
  const normalized = String(role || '').toLowerCase();
  if (['supervisor', 'support', 'accountant', 'finance', 'developer', 'business'].includes(normalized)) return normalized as StaffRoleInput;
  return 'operations';
}
function dbStaffRole(role: StaffRoleInput) { return role.toUpperCase() as any; }
function publicStaff(member: any) { return { id: member.id, name: member.name, phone: member.phone, email: member.email, username: member.username, role: String(member.role || '').toLowerCase(), status: String(member.status || '').toLowerCase(), notes: member.notes, lastLoginAt: member.lastLoginAt, createdAt: member.createdAt }; }
function publicLegalDocument(doc: any) { return { key: doc.key, titleAr: doc.titleAr, titleEn: doc.titleEn, contentAr: doc.contentAr, contentEn: doc.contentEn, status: doc.status, version: doc.version, updatedBy: doc.updatedBy, createdAt: doc.createdAt, updatedAt: doc.updatedAt }; }

const drivers = [
  { id: 'driver_1', name: 'Mohammed Ahmed', phone: '+249900000001', vehicleTypeId: 'rickshaw', vehicle: 'Blue rickshaw', rating: 4.8, online: true, cityId: 'rufaa' },
  { id: 'driver_2', name: 'Ali Altayeb', phone: '+249900000002', vehicleTypeId: 'car', vehicle: 'White car', rating: 4.7, online: true, cityId: 'rufaa' },
  { id: 'driver_3', name: 'Khalid Osman', phone: '+249900000003', vehicleTypeId: 'van', vehicle: 'Family van', rating: 4.6, online: false, cityId: 'khartoum' }
];
const memoryRides: any[] = [];
const memoryUsers: any[] = [];
const memorySupportRequests: any[] = [];
const memoryCities: any[] = [...cities];
const memoryVehicleTypes: any[] = [...vehicleTypes];
function findMemoryRide(id: string) { return memoryRides.find((item) => item.id === id); }
function normalizeRole(role?: string): UserRole { if (role === 'DRIVER') return UserRole.DRIVER; if (role === 'ADMIN') return UserRole.ADMIN; return UserRole.PASSENGER; }
function publicUser(user: any) { return { id: user.id, phone: user.phone, name: user.name, role: user.role }; }

app.get('/', (_req, res) => { res.json({ ok: true, app: APP_NAME, appAr: APP_NAME_AR, message: 'Multi-city transport platform', database: isDatabaseEnabled() }); });
app.get('/health', (_req, res) => { res.json({ ok: true, app: APP_NAME, appAr: APP_NAME_AR, region: 'global-ready', database: isDatabaseEnabled() }); });

app.get('/api/legal/:key', async (req, res) => {
  const key = String(req.params.key || '').trim().toLowerCase();
  if (!key) return res.status(400).json({ error: 'key is required' });
  if (prisma) {
    const doc = await prisma.legalDocument.findUnique({ where: { key } as any }).catch(() => null as any);
    if (!doc) return res.status(404).json({ error: 'Legal document not found' });
    return res.json(publicLegalDocument(doc));
  }
  const doc = memoryLegalDocuments.find((item) => item.key === key);
  if (!doc) return res.status(404).json({ error: 'Legal document not found' });
  res.json(publicLegalDocument(doc));
});

app.put('/api/legal/:key', async (req, res) => {
  const key = String(req.params.key || '').trim().toLowerCase();
  const titleAr = String(req.body.titleAr || '').trim();
  const titleEn = String(req.body.titleEn || '').trim();
  const contentAr = String(req.body.contentAr || '').trim();
  const contentEn = String(req.body.contentEn || '').trim();
  const status = String(req.body.status || 'draft').trim();
  const updatedBy = String(req.body.updatedBy || '').trim() || null;
  if (!key || !titleAr || !titleEn || !contentAr || !contentEn) return res.status(400).json({ error: 'Missing legal document fields' });
  if (prisma) {
    const existing = await prisma.legalDocument.findUnique({ where: { key } as any }).catch(() => null as any);
    const doc = await prisma.legalDocument.upsert({ where: { key } as any, create: { key, titleAr, titleEn, contentAr, contentEn, status, updatedBy } as any, update: { titleAr, titleEn, contentAr, contentEn, status, updatedBy, version: { increment: 1 } } as any });
    return res.json({ ok: true, document: publicLegalDocument(doc), created: !existing });
  }
  const index = memoryLegalDocuments.findIndex((item) => item.key === key);
  const doc = { key, titleAr, titleEn, contentAr, contentEn, status, updatedBy, version: index >= 0 ? memoryLegalDocuments[index].version + 1 : 1, updatedAt: new Date().toISOString(), createdAt: index >= 0 ? memoryLegalDocuments[index].createdAt : new Date().toISOString() };
  if (index >= 0) memoryLegalDocuments[index] = doc; else memoryLegalDocuments.push(doc);
  res.json({ ok: true, document: publicLegalDocument(doc), created: index < 0 });
});

app.post('/api/staff/login', async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = normalizeStaffRole(String(req.body.role || 'operations'));
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
  const passwordHash = hashPassword(password);
  if (prisma) {
    const member = await prisma.staffMember.findUnique({ where: { username } as any }).catch(() => null as any);
    if (!member || member.passwordHash !== passwordHash || String(member.role).toLowerCase() !== role || member.status !== 'ACTIVE') return res.status(401).json({ error: 'Invalid credentials or role' });
    const updated = await prisma.staffMember.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } as any });
    return res.json({ ok: true, staff: publicStaff(updated), token: `staff_${updated.id}_${Date.now()}` });
  }
  const member = memoryStaff.find((item) => item.username === username && item.passwordHash === passwordHash && item.role === role && item.status === 'active');
  if (!member) return res.status(401).json({ error: 'Invalid credentials or role' });
  member.lastLoginAt = new Date().toISOString();
  res.json({ ok: true, staff: publicStaff(member), token: `staff_${member.id}_${Date.now()}` });
});

app.get('/api/staff', async (_req, res) => { if (prisma) { const staff = await prisma.staffMember.findMany({ orderBy: { createdAt: 'desc' } as any }).catch(() => [] as any[]); return res.json(staff.map(publicStaff)); } res.json(memoryStaff.slice().reverse().map(publicStaff)); });
app.post('/api/staff', async (req, res) => { const name = String(req.body.name || '').trim(); const role = normalizeStaffRole(String(req.body.role || 'operations')); const phone = String(req.body.phone || '').trim() || null; const email = String(req.body.email || '').trim() || null; const notes = String(req.body.notes || '').trim() || null; const username = String(req.body.username || `${name.toLowerCase().replace(/\s+/g, '.')}.${role}`).trim().toLowerCase(); const temporaryPassword = String(req.body.password || `Jnbk@${Math.floor(1000 + Math.random() * 9000)}#`); if (!name || !username) return res.status(400).json({ error: 'name and username are required' }); const passwordHash = hashPassword(temporaryPassword); if (prisma) { const member = await prisma.staffMember.create({ data: { name, phone, email, username, passwordHash, role: dbStaffRole(role), notes } as any }); return res.status(201).json({ ok: true, staff: publicStaff(member), temporaryPassword }); } const member = { id: `staff_${Date.now()}`, name, phone, email, username, passwordHash, role, status: 'active', notes, createdAt: new Date().toISOString(), lastLoginAt: null }; memoryStaff.push(member); res.status(201).json({ ok: true, staff: publicStaff(member), temporaryPassword }); });
app.patch('/api/staff/:id', async (req, res) => { const status = String(req.body.status || '').toUpperCase(); if (prisma) { const member = await prisma.staffMember.update({ where: { id: req.params.id }, data: { ...(status ? { status } : {}), ...(req.body.role ? { role: dbStaffRole(normalizeStaffRole(String(req.body.role))) } : {}) } as any }).catch(() => null as any); if (!member) return res.status(404).json({ error: 'Staff member not found' }); return res.json({ ok: true, staff: publicStaff(member) }); } const member = memoryStaff.find((item) => item.id === req.params.id); if (!member) return res.status(404).json({ error: 'Staff member not found' }); if (status) member.status = status.toLowerCase(); if (req.body.role) member.role = normalizeStaffRole(String(req.body.role)); res.json({ ok: true, staff: publicStaff(member) }); });

app.post('/api/auth/request-otp', (req, res) => { const phone = String(req.body.phone || '').trim(); if (!phone) return res.status(400).json({ error: 'Phone is required' }); res.json({ ok: true, phone, devOtp: '123456', message: 'OTP generated for development. Replace with SMS provider before production.' }); });
app.post('/api/auth/verify-otp', async (req, res) => { const phone = String(req.body.phone || '').trim(); const code = String(req.body.code || '').trim(); const name = String(req.body.name || '').trim() || null; const role = normalizeRole(String(req.body.role || 'PASSENGER')); if (!phone) return res.status(400).json({ error: 'Phone is required' }); if (code !== '123456') return res.status(401).json({ error: 'Invalid OTP' }); if (prisma) { const user = await prisma.user.upsert({ where: { phone }, update: { name: name || undefined, role }, create: { phone, name, role } }); return res.json({ ok: true, user: publicUser(user), token: `dev_${user.id}` }); } let user = memoryUsers.find((item) => item.phone === phone); if (!user) { user = { id: `user_${Date.now()}`, phone, name, role, createdAt: new Date().toISOString() }; memoryUsers.push(user); } else { user.name = name || user.name; user.role = role; } res.json({ ok: true, user: publicUser(user), token: `dev_${user.id}` }); });

app.get('/api/config', async (_req, res) => { if (prisma) { const [dbCountries, dbCities, dbVehicleTypes] = await Promise.all([prisma.country.findMany(), prisma.city.findMany({ include: { zones: true } }), prisma.vehicleType.findMany()]); return res.json({ countries: dbCountries, cities: dbCities, vehicleTypes: dbVehicleTypes }); } res.json({ countries, cities: memoryCities, vehicleTypes: memoryVehicleTypes }); });
app.post('/api/admin/cities', async (req, res) => { const id = String(req.body.id || '').trim().toLowerCase(); const countryId = String(req.body.countryId || 'sd'); const nameAr = String(req.body.nameAr || '').trim(); const nameEn = String(req.body.nameEn || '').trim(); const zonesAr = Array.isArray(req.body.zonesAr) ? req.body.zonesAr : []; const zonesEn = Array.isArray(req.body.zonesEn) ? req.body.zonesEn : []; if (!id || !nameAr || !nameEn) return res.status(400).json({ error: 'id, nameAr and nameEn are required' }); if (prisma) { const city = await prisma.city.upsert({ where: { id }, update: { countryId, nameAr, nameEn }, create: { id, countryId, nameAr, nameEn } }); for (let i = 0; i < Math.max(zonesAr.length, zonesEn.length); i++) { await prisma.zone.upsert({ where: { id: `${id}_${i}` }, update: { nameAr: zonesAr[i] || zonesEn[i] || `Zone ${i + 1}`, nameEn: zonesEn[i] || zonesAr[i] || `Zone ${i + 1}` }, create: { id: `${id}_${i}`, cityId: id, nameAr: zonesAr[i] || zonesEn[i] || `Zone ${i + 1}`, nameEn: zonesEn[i] || zonesAr[i] || `Zone ${i + 1}` } }); } return res.status(201).json(city); } const city = { id, countryId, nameAr, nameEn, zonesAr, zonesEn }; const index = memoryCities.findIndex((item) => item.id === id); if (index >= 0) memoryCities[index] = city; else memoryCities.push(city); res.status(201).json(city); });
app.post('/api/admin/vehicle-types', async (req, res) => { const id = String(req.body.id || '').trim().toLowerCase(); const nameAr = String(req.body.nameAr || '').trim(); const nameEn = String(req.body.nameEn || '').trim(); const baseFare = Number(req.body.baseFare || 0); const perKmFare = Number(req.body.perKmFare || 0); const minimumFare = Number(req.body.minimumFare || 0); if (!id || !nameAr || !nameEn || !baseFare || !perKmFare || !minimumFare) return res.status(400).json({ error: 'Missing vehicle type fields' }); const item = { id, nameAr, nameEn, baseFare, perKmFare, minimumFare }; if (prisma) { const vehicleType = await prisma.vehicleType.upsert({ where: { id }, update: item, create: item }); return res.status(201).json(vehicleType); } const index = memoryVehicleTypes.findIndex((value) => value.id === id); if (index >= 0) memoryVehicleTypes[index] = item; else memoryVehicleTypes.push(item); res.status(201).json(item); });
app.get('/api/support', async (_req, res) => { if (prisma) { const requests = await prisma.supportRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); return res.json(requests); } res.json(memorySupportRequests.slice().reverse()); });
app.post('/api/support', async (req, res) => { const category = String(req.body.category || '').trim(); const message = String(req.body.message || '').trim(); const lang = String(req.body.lang || 'ar').trim(); const phone = String(req.body.phone || '').trim() || null; const name = String(req.body.name || '').trim() || null; if (!category || !message) return res.status(400).json({ error: 'category and message are required' }); if (prisma) { const request = await prisma.supportRequest.create({ data: { category, message, lang, phone, name } }); return res.status(201).json({ ok: true, request }); } const request = { id: `support_${Date.now()}`, category, message, lang, phone, name, status: 'OPEN', createdAt: new Date().toISOString() }; memorySupportRequests.push(request); res.status(201).json({ ok: true, request }); });
app.patch('/api/support/:id/status', async (req, res) => { const status = String(req.body.status || 'OPEN'); if (prisma) { const request = await prisma.supportRequest.update({ where: { id: req.params.id }, data: { status: status as any } }).catch(() => null); if (!request) return res.status(404).json({ error: 'Support request not found' }); return res.json(request); } const request = memorySupportRequests.find((item) => item.id === req.params.id); if (!request) return res.status(404).json({ error: 'Support request not found' }); request.status = status; request.updatedAt = new Date().toISOString(); res.json(request); });
app.post('/api/drivers/register', async (req, res) => { const phone = String(req.body.phone || '').trim(); const name = String(req.body.name || '').trim(); const cityId = String(req.body.cityId || 'rufaa'); const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw'); const plateNo = String(req.body.plateNo || '').trim(); const color = String(req.body.color || '').trim(); const model = String(req.body.model || '').trim(); if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' }); if (prisma) { const user = await prisma.user.upsert({ where: { phone }, update: { name, role: UserRole.DRIVER }, create: { phone, name, role: UserRole.DRIVER } }); const driver = await prisma.driver.upsert({ where: { userId: user.id }, update: { cityId, isOnline: false, isVerified: false }, create: { userId: user.id, cityId, isOnline: false, isVerified: false } }); const vehicle = await prisma.vehicle.upsert({ where: { driverId: driver.id }, update: { vehicleTypeId, plateNo, color, model }, create: { driverId: driver.id, vehicleTypeId, plateNo, color, model } }); return res.status(201).json({ ok: true, user: publicUser(user), driver, vehicle }); } const driver = { id: `driver_${Date.now()}`, name, phone, cityId, vehicleTypeId, vehicle: `${color || 'Vehicle'} ${model || vehicleTypeId}`, rating: 5, online: false, verified: false, plateNo }; drivers.push(driver); res.status(201).json({ ok: true, driver }); });
app.get('/api/drivers', async (req, res) => { const cityId = String(req.query.cityId || ''); const vehicleTypeId = String(req.query.vehicleTypeId || ''); if (prisma) { const result = await prisma.driver.findMany({ where: { ...(cityId ? { cityId } : {}), ...(vehicleTypeId ? { vehicle: { vehicleTypeId } } : {}) }, include: { user: true, vehicle: { include: { vehicleType: true } } } }); return res.json(result.map((driver) => ({ id: driver.id, name: driver.user.name || driver.user.phone, vehicleTypeId: driver.vehicle?.vehicleTypeId, vehicle: driver.vehicle?.vehicleType.nameEn || 'Vehicle', rating: 4.8, online: driver.isOnline, verified: driver.isVerified, cityId: driver.cityId }))); } const result = drivers.filter((driver) => (!cityId || driver.cityId === cityId) && (!vehicleTypeId || driver.vehicleTypeId === vehicleTypeId)); res.json(result); });
app.post('/api/pricing/estimate', async (req, res) => { const distanceKm = Number(req.body.distanceKm || 2); const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw'); const cityId = String(req.body.cityId || 'rufaa'); if (prisma) { const [city, vehicle] = await Promise.all([prisma.city.findUnique({ where: { id: cityId }, include: { country: true } }), prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } })]); const fallbackCity = findCity(cityId); const fallbackVehicle = findVehicleType(vehicleTypeId); const selectedVehicle = vehicle || fallbackVehicle; const estimatedFare = Math.max(Math.round(selectedVehicle.baseFare + distanceKm * selectedVehicle.perKmFare), selectedVehicle.minimumFare); return res.json({ currency: city?.country.currency || (fallbackCity.countryId === 'sa' ? 'SAR' : 'SDG'), city: city || fallbackCity, vehicle: selectedVehicle, distanceKm, estimatedFare }); } const city = findCity(cityId); const vehicle = findVehicleType(vehicleTypeId); res.json({ currency: city.countryId === 'sa' ? 'SAR' : 'SDG', city, vehicle, distanceKm, estimatedFare: estimateFare(distanceKm, vehicleTypeId) }); });
app.get('/api/rides', async (_req, res) => { if (prisma) return res.json(await prisma.ride.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { city: true, vehicleType: true, driver: { include: { user: true } } })); res.json(memoryRides.slice().reverse()); });
app.get('/api/rides/:id', async (req, res) => { if (prisma) { const ride = await prisma.ride.findUnique({ where: { id: req.params.id }, include: { city: true, vehicleType: true, driver: { include: { user: true } } } }); if (!ride) return res.status(404).json({ error: 'Ride not found' }); return res.json(ride); } const ride = findMemoryRide(req.params.id); if (!ride) return res.status(404).json({ error: 'Ride not found' }); res.json(ride); });
app.post('/api/rides', async (req, res) => { const distanceKm = Number(req.body.distanceKm || 2); const cityId = String(req.body.cityId || 'rufaa'); const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw'); if (prisma) { const vehicle = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } }); const selectedVehicle = vehicle || findVehicleType(vehicleTypeId); const matchedDriver = await prisma.driver.findFirst({ where: { cityId, isOnline: true, isVerified: true, vehicle: { vehicleTypeId } } }); const ride = await prisma.ride.create({ data: { cityId, vehicleTypeId, driverId: matchedDriver?.id, pickupLabel: req.body.pickupLabel || 'Pickup', destinationLabel: req.body.destinationLabel || 'Destination', distanceKm, estimatedFare: Math.max(Math.round(selectedVehicle.baseFare + distanceKm * selectedVehicle.perKmFare), selectedVehicle.minimumFare), status: 'REQUESTED' } }); return res.status(201).json(ride); } const city = findCity(cityId); const vehicle = findVehicleType(vehicleTypeId); const matchedDriver = drivers.find((driver) => driver.cityId === cityId && driver.vehicleTypeId === vehicleTypeId && driver.online); const ride = { id: `ride_${Date.now()}`, cityId, cityName: city.nameEn, vehicleTypeId, vehicleName: vehicle.nameEn, driverId: matchedDriver?.id || null, driverName: matchedDriver?.name || null, pickupLabel: req.body.pickupLabel || city.zonesEn[0], destinationLabel: req.body.destinationLabel || city.zonesEn[1], distanceKm, estimatedFare: estimateFare(distanceKm, vehicleTypeId), status: 'REQUESTED', rating: null, createdAt: new Date().toISOString() }; memoryRides.push(ride); res.status(201).json(ride); });
app.patch('/api/rides/:id/status', async (req, res) => { if (prisma) { const ride = await prisma.ride.update({ where: { id: req.params.id }, data: { status: req.body.status || 'REQUESTED' } }).catch(() => null); if (!ride) return res.status(404).json({ error: 'Ride not found' }); return res.json(ride); } const ride = findMemoryRide(req.params.id); if (!ride) return res.status(404).json({ error: 'Ride not found' }); ride.status = req.body.status || ride.status; ride.updatedAt = new Date().toISOString(); res.json(ride); });
app.patch('/api/rides/:id/rating', async (req, res) => { const rating = Number(req.body.rating || 0); if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' }); if (prisma) { const ride = await prisma.ride.update({ where: { id: req.params.id }, data: { rating, status: 'COMPLETED' } }).catch(() => null); if (!ride) return res.status(404).json({ error: 'Ride not found' }); return res.json(ride); } const ride = findMemoryRide(req.params.id); if (!ride) return res.status(404).json({ error: 'Ride not found' }); ride.rating = rating; ride.status = 'COMPLETED'; ride.updatedAt = new Date().toISOString(); res.json(ride); });
const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`${APP_NAME} API running on port ${port}`));
