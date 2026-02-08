-- CreateTable
CREATE TABLE "vaccine_skips" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "vaccine_code" VARCHAR(50) NOT NULL,
    "season_label" VARCHAR(20) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccine_skips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vaccine_skips_member_id_idx" ON "vaccine_skips"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_skips_member_id_vaccine_code_season_label_key" ON "vaccine_skips"("member_id", "vaccine_code", "season_label");

-- AddForeignKey
ALTER TABLE "vaccine_skips" ADD CONSTRAINT "vaccine_skips_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
