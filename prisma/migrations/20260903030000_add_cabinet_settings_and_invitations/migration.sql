ALTER TABLE "Cabinet" ADD COLUMN "notificationSettings" JSONB;

CREATE TABLE "CabinetInvitation" (
  "id" TEXT NOT NULL,
  "cabinetId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'RECEPTIONIST',
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CabinetInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CabinetInvitation_cabinetId_email_key" ON "CabinetInvitation"("cabinetId", "email");
CREATE INDEX "CabinetInvitation_email_acceptedAt_idx" ON "CabinetInvitation"("email", "acceptedAt");
ALTER TABLE "CabinetInvitation" ADD CONSTRAINT "CabinetInvitation_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
