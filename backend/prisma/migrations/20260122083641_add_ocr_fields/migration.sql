-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "ocr_error" TEXT,
ADD COLUMN     "ocr_progress" INTEGER,
ADD COLUMN     "ocr_status" VARCHAR(20),
ADD COLUMN     "ocr_text" TEXT;
