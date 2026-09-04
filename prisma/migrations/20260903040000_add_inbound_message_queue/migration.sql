CREATE TYPE "InboundMessageJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "InboundMessageJob" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "cabinetId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "InboundMessageJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundMessageJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InboundMessageJob_externalId_key" ON "InboundMessageJob"("externalId");
CREATE INDEX "InboundMessageJob_status_availableAt_idx" ON "InboundMessageJob"("status", "availableAt");
CREATE INDEX "InboundMessageJob_conversationId_idx" ON "InboundMessageJob"("conversationId");
