-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'User');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('Proper', 'Outsource');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other', 'Unknown');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('Analyst', 'Associate', 'Consultant', 'SeniorConsultant', 'Manager', 'SeniorManager', 'Director', 'Partner');

-- CreateEnum
CREATE TYPE "SalesStatus" AS ENUM ('Actual', 'Forecast');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('Transportation', 'Reimbursement', 'Other');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('SemiDelegation', 'Contract', 'Other');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'User',
    "login_id" TEXT NOT NULL,
    "login_pw" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "member_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "employment_type" "EmploymentType" NOT NULL,
    "position" TEXT,
    "department" TEXT,
    "grade" "Grade",
    "pitch" INTEGER,
    "affiliation" TEXT,
    "purchase_unit_price" DECIMAL(14,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "linked_user_id" TEXT,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "half" INTEGER NOT NULL,
    "admin_mission" TEXT,
    "admin_review" TEXT,
    "self_mission" TEXT,
    "self_review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "member_id" TEXT NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "client_code" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "client_id" TEXT NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesEntry" (
    "id" TEXT NOT NULL,
    "sales_key" TEXT NOT NULL,
    "period_month" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "SalesStatus" NOT NULL,
    "contract_type" "ContractType" NOT NULL DEFAULT 'SemiDelegation',
    "memo" TEXT,
    "year" INTEGER NOT NULL,
    "half" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "purchase_cost" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "member_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "SalesEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sales_entry_id" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "seq_key" TEXT NOT NULL,
    "current_no" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL,
    "pad_digits" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_id_key" ON "User"("login_id");

-- CreateIndex
CREATE INDEX "User_is_active_idx" ON "User"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_id_idx" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Member_member_code_key" ON "Member"("member_code");

-- CreateIndex
CREATE UNIQUE INDEX "Member_linked_user_id_key" ON "Member"("linked_user_id");

-- CreateIndex
CREATE INDEX "Member_is_active_idx" ON "Member"("is_active");

-- CreateIndex
CREATE INDEX "Member_employment_type_idx" ON "Member"("employment_type");

-- CreateIndex
CREATE INDEX "Mission_member_id_idx" ON "Mission"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_member_id_fiscal_year_half_key" ON "Mission"("member_id", "fiscal_year", "half");

-- CreateIndex
CREATE UNIQUE INDEX "Client_client_code_key" ON "Client"("client_code");

-- CreateIndex
CREATE INDEX "Client_is_active_idx" ON "Client"("is_active");

-- CreateIndex
CREATE INDEX "Contact_client_id_idx" ON "Contact"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesEntry_sales_key_key" ON "SalesEntry"("sales_key");

-- CreateIndex
CREATE INDEX "SalesEntry_member_id_idx" ON "SalesEntry"("member_id");

-- CreateIndex
CREATE INDEX "SalesEntry_client_id_idx" ON "SalesEntry"("client_id");

-- CreateIndex
CREATE INDEX "SalesEntry_period_month_idx" ON "SalesEntry"("period_month");

-- CreateIndex
CREATE INDEX "SalesEntry_year_half_idx" ON "SalesEntry"("year", "half");

-- CreateIndex
CREATE INDEX "SalesEntry_is_deleted_idx" ON "SalesEntry"("is_deleted");

-- CreateIndex
CREATE INDEX "Expense_sales_entry_id_idx" ON "Expense"("sales_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "NumberSequence_seq_key_key" ON "NumberSequence"("seq_key");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_sales_entry_id_fkey" FOREIGN KEY ("sales_entry_id") REFERENCES "SalesEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

