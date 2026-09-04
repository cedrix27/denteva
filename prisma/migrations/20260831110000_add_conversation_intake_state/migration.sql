CREATE TYPE "ConversationIntakeState" AS ENUM ('LANGUAGE_SELECTION', 'OPEN');
ALTER TABLE "Conversation" ADD COLUMN "intakeState" "ConversationIntakeState" NOT NULL DEFAULT 'LANGUAGE_SELECTION';
