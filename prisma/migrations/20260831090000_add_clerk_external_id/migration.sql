ALTER TABLE "User" ADD COLUMN "externalId" TEXT NOT NULL;

CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");
