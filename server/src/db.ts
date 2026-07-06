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

export function isDatabaseEnabled() {
  return prisma !== null;
}
