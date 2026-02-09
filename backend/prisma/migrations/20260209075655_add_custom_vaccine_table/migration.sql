-- CreateTable
CREATE TABLE "custom_vaccines" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "frequency" VARCHAR(20) NOT NULL,
    "total_doses" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_vaccines_family_id_idx" ON "custom_vaccines"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_vaccines_family_id_name_key" ON "custom_vaccines"("family_id", "name");

-- AddForeignKey
ALTER TABLE "custom_vaccines" ADD CONSTRAINT "custom_vaccines_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
