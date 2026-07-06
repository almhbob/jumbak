-- Add TransactionType enum and wallet tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
    CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'RIDE_PAYMENT', 'REFUND', 'DRIVER_EARNING', 'WITHDRAWAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Wallet" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "balance"   INTEGER NOT NULL DEFAULT 0,
  "currency"  TEXT NOT NULL DEFAULT 'SDG',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_key" ON "Wallet"("userId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wallet_userId_fkey') THEN
    ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WalletTransaction" (
  "id"          TEXT NOT NULL,
  "walletId"    TEXT NOT NULL,
  "amount"      INTEGER NOT NULL,
  "type"        "TransactionType" NOT NULL,
  "description" TEXT,
  "rideId"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WalletTransaction_walletId_fkey') THEN
    ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey"
      FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
