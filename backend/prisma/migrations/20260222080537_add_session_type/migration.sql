-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('GENERAL', 'FOOD_QUERY');

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "type" "SessionType" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "chat_sessions_family_id_type_idx" ON "chat_sessions"("family_id", "type");
