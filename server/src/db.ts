import { PrismaClient } from '@prisma/client';

export const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

export function isDatabaseEnabled() {
  return Boolean(prisma);
}
