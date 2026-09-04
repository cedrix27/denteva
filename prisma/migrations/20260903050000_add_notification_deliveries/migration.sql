CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "cabinetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_cabinetId_key_period_key" ON "NotificationDelivery"("cabinetId", "key", "period");
CREATE INDEX "NotificationDelivery_cabinetId_createdAt_idx" ON "NotificationDelivery"("cabinetId", "createdAt");
