ALTER TABLE "Cabinet"
  ADD COLUMN "practitionerName" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "building" TEXT,
  ADD COLUMN "floor" TEXT,
  ADD COLUMN "mapsUrl" TEXT,
  ADD COLUMN "accessInstructions" TEXT,
  ADD COLUMN "openingHours" JSONB,
  ADD COLUMN "supportedLanguages" TEXT[] NOT NULL DEFAULT ARRAY['fr']::TEXT[];
