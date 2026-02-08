-- CreateTable
CREATE TABLE "vaccine_records" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "vaccine_code" VARCHAR(50),
    "vaccine_name" VARCHAR(100) NOT NULL,
    "dose_number" INTEGER NOT NULL DEFAULT 1,
    "total_doses" INTEGER,
    "vaccinated_at" DATE NOT NULL,
    "location" VARCHAR(200),
    "manufacturer" VARCHAR(100),
    "batch_number" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccine_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vaccine_records_member_id_idx" ON "vaccine_records"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_records_member_id_vaccine_name_dose_number_key" ON "vaccine_records"("member_id", "vaccine_name", "dose_number");

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
