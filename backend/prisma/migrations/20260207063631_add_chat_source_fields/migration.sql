-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "source_advice_id" TEXT,
ADD COLUMN     "source_item_index" INTEGER,
ADD COLUMN     "source_item_title" VARCHAR(200),
ADD COLUMN     "source_item_type" VARCHAR(20);

-- CreateIndex
CREATE INDEX "chat_sessions_source_advice_id_idx" ON "chat_sessions"("source_advice_id");

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_source_advice_id_fkey" FOREIGN KEY ("source_advice_id") REFERENCES "health_advices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
