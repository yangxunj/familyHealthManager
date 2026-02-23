-- AlterTable
ALTER TABLE "family_members" ADD COLUMN "user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "family_members_user_id_key" ON "family_members"("user_id");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
