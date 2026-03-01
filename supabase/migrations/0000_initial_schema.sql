-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'GLOBAL_ADMIN', 'SUPERVISOR', 'LOCAL_USER', 'READ_ONLY');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "active_markets_limit" INTEGER NOT NULL,
    "user_seat_limit" INTEGER NOT NULL,
    "ai_token_quota" INTEGER NOT NULL,
    "ai_tokens_used" INTEGER NOT NULL,
    "token_reset_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "language_preference" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMarket" (
    "user_id" UUID NOT NULL,
    "market_id" UUID NOT NULL,

    CONSTRAINT "UserMarket_pkey" PRIMARY KEY ("user_id","market_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Market_name_tenant_id_key" ON "Market"("name", "tenant_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMarket" ADD CONSTRAINT "UserMarket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMarket" ADD CONSTRAINT "UserMarket_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
