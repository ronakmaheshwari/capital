-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'verifier', 'organiser', 'admin');

-- CreateEnum
CREATE TYPE "OTPPurpose" AS ENUM ('signup', 'forgot_password', 'ticket_validation');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'cancelled');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('movie', 'concert', 'sports', 'theatre', 'comedy', 'conference', 'workshop', 'exhibition', 'festival', 'other');

-- CreateEnum
CREATE TYPE "EventGenre" AS ENUM ('action', 'drama', 'comedy', 'romance', 'horror', 'thriller', 'sci_fi', 'fantasy', 'documentary', 'animation', 'classical', 'rock', 'pop', 'jazz', 'hip_hop', 'sports_general', 'other');

-- CreateEnum
CREATE TYPE "EventLanguage" AS ENUM ('english', 'hindi', 'marathi', 'spanish', 'french', 'german', 'japanese', 'korean', 'chinese', 'tamil', 'telugu', 'multi_language');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ISSUED', 'CANCELLED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('Initiate', 'DEPOSIT', 'WITHDRAWAL', 'PURCHASE', 'REFUND', 'CANCEL', 'PAYOUT');

-- CreateEnum
CREATE TYPE "BankName" AS ENUM ('yesbank', 'bob', 'hdfc', 'icic', 'kotak');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'INR');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('active', 'suspended', 'closed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "profile_image_url" TEXT,
    "public_key" TEXT,
    "encrypted_private_key" TEXT,
    "city" TEXT,
    "state" TEXT,
    "DOB" TIMESTAMP(3),
    "zip_code" TEXT,
    "phone_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "ticketVerificationId" TEXT,
    "otp_code" TEXT NOT NULL,
    "purpose" "OTPPurpose" NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JwtToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JwtToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "banner_url" TEXT,
    "hero_image_url" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "category" "EventCategory" NOT NULL,
    "genre" "EventGenre",
    "language" "EventLanguage",
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSlot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_url" TEXT,
    "capacity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "eventSlotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qr_code_data" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "scanned_at" TIMESTAMP(3),
    "scannedById" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketVerification" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verification_time" TIMESTAMP(3) NOT NULL,
    "is_successful" BOOLEAN NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "TicketVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bank_name" "BankName" NOT NULL,
    "card_number" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "bank_name" "BankName",
    "ticketId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "ticket_count" INTEGER,
    "token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" TIMESTAMP(3),
    "walletId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "status" "WalletStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPayoutAt" TIMESTAMP(3),

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_number_key" ON "User"("phone_number");

-- CreateIndex
CREATE INDEX "User_email_phone_number_idx" ON "User"("email", "phone_number");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "JwtToken_token_idx" ON "JwtToken"("token");

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "EventSlot_eventId_idx" ON "EventSlot"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_eventSlotId_idx" ON "Ticket"("eventSlotId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_card_number_key" ON "Card"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_token_key" ON "Transaction"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_ticketVerificationId_fkey" FOREIGN KEY ("ticketVerificationId") REFERENCES "TicketVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JwtToken" ADD CONSTRAINT "JwtToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSlot" ADD CONSTRAINT "EventSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventSlotId_fkey" FOREIGN KEY ("eventSlotId") REFERENCES "EventSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketVerification" ADD CONSTRAINT "TicketVerification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketVerification" ADD CONSTRAINT "TicketVerification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
