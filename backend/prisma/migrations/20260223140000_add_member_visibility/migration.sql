-- AlterTable
ALTER TABLE "users" ADD COLUMN "member_visibility_configured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "member_visibility" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_visibility_user_id_idx" ON "member_visibility"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_visibility_user_id_member_id_key" ON "member_visibility"("user_id", "member_id");
