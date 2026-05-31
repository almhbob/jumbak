-- Add TransactionType enum and wallet tables
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'RIDE_PAYMENT', 'REFUND', 'DRIVER_EARNING', 'WITHDRAWAL');

CREATE TABLE "Wallet" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "balance"   INTEGER NOT NULL DEFAULT 0,
  "currency"  TEXT NOT NULL DEFAULT 'SDG',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WalletTransaction" (
  "id"          TEXT NOT NULL,
  "walletId"    TEXT NOT NULL,
  "amount"      INTEGER NOT NULL,
  "type"        "TransactionType" NOT NULL,
  "description" TEXT,
  "rideId"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
