-- CreateTable
CREATE TABLE "periodic_check_items" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "interval_months" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "skipped_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodic_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodic_check_records" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "check_date" DATE NOT NULL,
    "location" VARCHAR(200),
    "doctor" VARCHAR(100),
    "findings" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodic_check_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "periodic_check_items_member_id_idx" ON "periodic_check_items"("member_id");

-- CreateIndex
CREATE INDEX "periodic_check_records_item_id_idx" ON "periodic_check_records"("item_id");

-- AddForeignKey
ALTER TABLE "periodic_check_items" ADD CONSTRAINT "periodic_check_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodic_check_records" ADD CONSTRAINT "periodic_check_records_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "periodic_check_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
