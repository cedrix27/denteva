-- Store the Meta phone number routing key for every WhatsApp Business integration.
ALTER TABLE "IntegrationAccount" ADD COLUMN "externalPhoneNumberId" TEXT;
ALTER TABLE "IntegrationAccount" ADD COLUMN "displayPhoneNumber" TEXT;

CREATE UNIQUE INDEX "IntegrationAccount_externalPhoneNumberId_key"
  ON "IntegrationAccount"("externalPhoneNumberId");
