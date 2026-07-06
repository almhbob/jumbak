import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export let prisma: PrismaClient | null = null;

export async function initDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
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
