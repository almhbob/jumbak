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
  try {
    const countryCount = await client.country.count();
    if (countryCount > 0) return; // already seeded

    // Dynamic import so this module stays lightweight when DB is not used
    const [{ countries, cities }, { rufaaZones }] = await Promise.all([
      import('./config.js'),
      import('./data/rufaaZones.js'),
    ]);

    // 1. Countries
    await client.country.createMany({
      data: countries.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, currency: c.currency })),
      skipDuplicates: true,
    });

    // 2. Cities
    await client.city.createMany({
      data: cities.map((c) => ({ id: c.id, countryId: c.countryId, nameAr: c.nameAr, nameEn: c.nameEn })),
      skipDuplicates: true,
    });

    // 3. Zones (Rufaa + simple placeholder zones for other cities)
    const zones = [
      ...rufaaZones.map((z) => ({
        id: z.id,
        cityId: z.cityId,
        nameAr: z.nameAr,
        nameEn: z.nameEn,
        category: z.category,
        multiplier: 1.0,
        ...(z.fixedFare !== undefined ? { fixedFare: z.fixedFare } : {}),
      })),
      // Khartoum placeholder zones
      { id: 'khartoum-center', cityId: 'khartoum', nameAr: 'الخرطوم', nameEn: 'Khartoum', category: 'أحياء وشوارع', multiplier: 1.0 },
      { id: 'khartoum-bahri', cityId: 'khartoum', nameAr: 'بحري', nameEn: 'Bahri', category: 'أحياء وشوارع', multiplier: 1.0 },
      { id: 'khartoum-omdurman', cityId: 'khartoum', nameAr: 'أمدرمان', nameEn: 'Omdurman', category: 'أحياء وشوارع', multiplier: 1.0 },
      { id: 'khartoum-airport', cityId: 'khartoum', nameAr: 'المطار', nameEn: 'Airport', category: 'مرافق ومعالم', multiplier: 1.0 },
      // Dammam placeholder zones
      { id: 'dammam-center', cityId: 'dammam', nameAr: 'وسط الدمام', nameEn: 'Central Dammam', category: 'أحياء وشوارع', multiplier: 1.0 },
      { id: 'dammam-corniche', cityId: 'dammam', nameAr: 'الكورنيش', nameEn: 'Corniche', category: 'مرافق ومعالم', multiplier: 1.0 },
      { id: 'dammam-airport', cityId: 'dammam', nameAr: 'المطار', nameEn: 'Airport', category: 'مرافق ومعالم', multiplier: 1.0 },
    ];
    await client.zone.createMany({ data: zones, skipDuplicates: true });

    // 4. Vehicle types
    await client.vehicleType.createMany({
      data: [
        { id: 'rickshaw', nameAr: 'ركشة',       nameEn: 'Rickshaw', baseFare: 500,  perKmFare: 300, minimumFare: 1000, isVisible: true },
        { id: 'car',      nameAr: 'سيارة',       nameEn: 'Car',      baseFare: 900,  perKmFare: 550, minimumFare: 1800, isVisible: false },
        { id: 'van',      nameAr: 'حافلة صغيرة', nameEn: 'Van',      baseFare: 1200, perKmFare: 700, minimumFare: 2500, isVisible: false },
      ],
      skipDuplicates: true,
    });

    console.log('[db] Reference data seeded (countries, cities, zones, vehicle types)');
  } catch (err) {
    console.error('[db] Reference data seeding failed:', err instanceof Error ? err.message : String(err));
  }
}

export function isDatabaseEnabled() {
  return prisma !== null;
}
