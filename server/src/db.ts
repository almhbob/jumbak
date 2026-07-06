import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

export let prisma: PrismaClient | null = null;

export async function initDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  // Run migrations using paths resolved relative to this file — independent of cwd
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.resolve(dir, '../prisma/schema.prisma');
    const prismaBin = path.resolve(dir, '../../node_modules/.bin/prisma');
    execSync(`"${prismaBin}" migrate deploy --schema="${schemaPath}"`, {
      env: { ...process.env },
      stdio: 'inherit',
    });
    console.log('[db] Migrations applied');
  } catch (err) {
    console.error('[db] Migrations failed:', err instanceof Error ? err.message : String(err));
  }

  const client = new PrismaClient();
  try {
    await client.$queryRaw`SELECT 1`;
    prisma = client;
    console.log('[db] Connected');
    await bootstrapDeveloperAccount(client);
    await seedReferenceData(client);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[db] Connection failed, running in memory mode:', msg);
    await client.$disconnect().catch(() => {});
  }
}

async function bootstrapDeveloperAccount(client: PrismaClient): Promise<void> {
  try {
    const count = await client.staffMember.count();
    if (count > 0) return;
    const pwd = process.env.BOOTSTRAP_ADMIN_PASSWORD || '123456';
    const hash = await bcrypt.hash(pwd, 10);
    await client.staffMember.create({
      data: {
        name: 'Developer',
        username: 'developer',
        passwordHash: hash,
        role: 'DEVELOPER',
        status: 'ACTIVE',
      },
    });
    console.log('[db] Bootstrap developer account created');
  } catch (err) {
    console.error('[db] Bootstrap seeding skipped:', err instanceof Error ? err.message : String(err));
  }
}

async function seedReferenceData(client: PrismaClient): Promise<void> {
  const [{ countries, cities }, { rufaaZones }] = await Promise.all([
    import('./config.js'),
    import('./data/rufaaZones.js'),
  ]);

  // Each step is independent — a failure in one doesn't block the others.
  // Count-guards prevent redundant inserts on subsequent cold starts.

  const [cntCountries, cntCities, cntZones, cntVehicles] = await Promise.all([
    client.country.count().catch(() => -1),
    client.city.count().catch(() => -1),
    client.zone.count().catch(() => -1),
    client.vehicleType.count().catch(() => -1),
  ]);

  if (cntCountries === 0) {
    await client.country.createMany({
      data: countries.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, currency: c.currency })),
      skipDuplicates: true,
    }).then((r) => console.log(`[db] Countries seeded: ${r.count}`))
      .catch((e: Error) => console.error('[db] Countries seed error:', e.message));
  }

  if (cntCities === 0) {
    await client.city.createMany({
      data: cities.map((c) => ({ id: c.id, countryId: c.countryId, nameAr: c.nameAr, nameEn: c.nameEn })),
      skipDuplicates: true,
    }).then((r) => console.log(`[db] Cities seeded: ${r.count}`))
      .catch((e: Error) => console.error('[db] Cities seed error:', e.message));
  }

  if (cntZones === 0) {
    const zoneData = [
      ...rufaaZones.map((z) => ({
        id: z.id, cityId: z.cityId, nameAr: z.nameAr, nameEn: z.nameEn,
        category: z.category, multiplier: 1.0,
        ...(z.fixedFare !== undefined ? { fixedFare: z.fixedFare } : {}),
      })),
      { id: 'khartoum-center',   cityId: 'khartoum', nameAr: 'الخرطوم',   nameEn: 'Khartoum',       category: 'أحياء وشوارع',  multiplier: 1.0 },
      { id: 'khartoum-bahri',    cityId: 'khartoum', nameAr: 'بحري',       nameEn: 'Bahri',          category: 'أحياء وشوارع',  multiplier: 1.0 },
      { id: 'khartoum-omdurman', cityId: 'khartoum', nameAr: 'أمدرمان',    nameEn: 'Omdurman',       category: 'أحياء وشوارع',  multiplier: 1.0 },
      { id: 'khartoum-airport',  cityId: 'khartoum', nameAr: 'المطار',     nameEn: 'Airport',        category: 'مرافق ومعالم', multiplier: 1.0 },
      { id: 'dammam-center',     cityId: 'dammam',   nameAr: 'وسط الدمام', nameEn: 'Central Dammam', category: 'أحياء وشوارع',  multiplier: 1.0 },
      { id: 'dammam-corniche',   cityId: 'dammam',   nameAr: 'الكورنيش',   nameEn: 'Corniche',       category: 'مرافق ومعالم', multiplier: 1.0 },
      { id: 'dammam-airport',    cityId: 'dammam',   nameAr: 'المطار',     nameEn: 'Airport',        category: 'مرافق ومعالم', multiplier: 1.0 },
    ];
    await client.zone.createMany({ data: zoneData, skipDuplicates: true })
      .then((r) => console.log(`[db] Zones seeded: ${r.count}`))
      .catch((e: Error) => console.error('[db] Zones seed error:', e.message));
  }

  if (cntVehicles === 0) {
    await client.vehicleType.createMany({
      data: [
        { id: 'rickshaw', nameAr: 'ركشة',       nameEn: 'Rickshaw', baseFare: 500,  perKmFare: 300, minimumFare: 1000, isVisible: true  },
        { id: 'car',      nameAr: 'سيارة',       nameEn: 'Car',      baseFare: 900,  perKmFare: 550, minimumFare: 1800, isVisible: false },
        { id: 'van',      nameAr: 'حافلة صغيرة', nameEn: 'Van',      baseFare: 1200, perKmFare: 700, minimumFare: 2500, isVisible: false },
      ],
      skipDuplicates: true,
    }).then((r) => console.log(`[db] VehicleTypes seeded: ${r.count}`))
      .catch((e: Error) => console.error('[db] VehicleTypes seed error:', e.message));
  }
}

export function isDatabaseEnabled() {
  return prisma !== null;
}
