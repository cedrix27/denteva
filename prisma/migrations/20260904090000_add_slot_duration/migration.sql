-- Default appointment length used when the assistant proposes and books slots.
ALTER TABLE "Cabinet" ADD COLUMN "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30;
