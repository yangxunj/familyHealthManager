-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('SELF', 'SPOUSE', 'FATHER', 'MOTHER', 'SON', 'DAUGHTER', 'GRANDFATHER', 'GRANDMOTHER', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A', 'B', 'AB', 'O', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PHYSICAL_EXAM', 'LAB_REPORT', 'IMAGING_REPORT', 'MEDICAL_RECORD', 'PRESCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('HEIGHT', 'WEIGHT', 'WAIST', 'SYSTOLIC_BP', 'DIASTOLIC_BP', 'HEART_RATE', 'FASTING_GLUCOSE', 'POSTPRANDIAL_GLUCOSE', 'HBA1C', 'TOTAL_CHOLESTEROL', 'TRIGLYCERIDES', 'HDL', 'LDL', 'TEMPERATURE', 'BLOOD_OXYGEN');

-- CreateEnum
CREATE TYPE "MeasurementContext" AS ENUM ('MORNING', 'BEFORE_MEAL', 'AFTER_MEAL', 'AFTER_EXERCISE', 'BEFORE_SLEEP', 'OTHER');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "avatar" VARCHAR(500),
    "phone" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "relationship" "Relationship" NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_date" DATE NOT NULL,
    "avatar" VARCHAR(500),
    "blood_type" "BloodType" NOT NULL DEFAULT 'UNKNOWN',
    "height" DECIMAL(5,2),
    "weight" DECIMAL(5,2),
    "chronic_diseases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "check_date" DATE NOT NULL,
    "institution" VARCHAR(200),
    "files" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "parsed_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "record_type" "RecordType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "context" "MeasurementContext" NOT NULL DEFAULT 'OTHER',
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "source" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    "document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_advices" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "health_score" INTEGER,
    "data_snapshot" JSONB NOT NULL,
    "model_used" VARCHAR(50),
    "tokens_used" INTEGER,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_advices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "family_members_user_id_idx" ON "family_members"("user_id");

-- CreateIndex
CREATE INDEX "family_members_user_id_deleted_at_idx" ON "family_members"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "documents_member_id_idx" ON "documents"("member_id");

-- CreateIndex
CREATE INDEX "documents_member_id_type_idx" ON "documents"("member_id", "type");

-- CreateIndex
CREATE INDEX "documents_member_id_check_date_idx" ON "documents"("member_id", "check_date");

-- CreateIndex
CREATE INDEX "health_records_member_id_idx" ON "health_records"("member_id");

-- CreateIndex
CREATE INDEX "health_records_member_id_record_type_idx" ON "health_records"("member_id", "record_type");

-- CreateIndex
CREATE INDEX "health_records_member_id_record_date_idx" ON "health_records"("member_id", "record_date");

-- CreateIndex
CREATE INDEX "health_advices_member_id_idx" ON "health_advices"("member_id");

-- CreateIndex
CREATE INDEX "health_advices_member_id_generated_at_idx" ON "health_advices"("member_id", "generated_at");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_sessions_member_id_idx" ON "chat_sessions"("member_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_advices" ADD CONSTRAINT "health_advices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
