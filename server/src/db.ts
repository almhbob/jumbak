import { PrismaClient } from '@prisma/client';

export let prisma: PrismaClient | null = null;

export async function initDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const client = new PrismaClient();
  try {
    await client.$queryRaw`SELECT 1`;
    prisma = client;
    console.log('[db] Connected');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[db] Connection failed, running in memory mode:', msg);
    await client.$disconnect().catch(() => {});
  }
}

export function isDatabaseEnabled() {
  return prisma !== null;
}
