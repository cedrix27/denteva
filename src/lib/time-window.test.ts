import assert from "node:assert/strict";
import test from "node:test";
import { isWithinOpeningHours, parseOpeningHours, zonedDateKey, zonedTimeToUtc } from "./time-window.ts";

const CASABLANCA = "Africa/Casablanca";
const HOURS = { weekdays: "09:00 – 18:00", saturday: "Fermé", sunday: "Fermé" };

test("parseOpeningHours accepte les séparateurs saisis par les cabinets", () => {
  const expected = { startMinutes: 540, endMinutes: 1080 };
  assert.deepEqual(parseOpeningHours({ weekdays: "09:00 – 18:00" }).weekdays, expected);
  assert.deepEqual(parseOpeningHours({ weekdays: "09:00-18:00" }).weekdays, expected);
  assert.deepEqual(parseOpeningHours({ weekdays: "9h - 18h" }).weekdays, expected);
});

test("parseOpeningHours traite les jours fermés et les saisies incohérentes", () => {
  assert.equal(parseOpeningHours({ saturday: "Fermé" }).saturday, null);
  assert.equal(parseOpeningHours({ sunday: "" }).sunday, null);
  assert.equal(parseOpeningHours({ weekdays: "18:00 – 09:00" }).weekdays, null);
  assert.equal(parseOpeningHours(null).weekdays, null);
});

test("zonedTimeToUtc suit le décalage réel du Maroc", () => {
  // Hors Ramadan : UTC+1.
  assert.equal(zonedTimeToUtc(2026, 9, 10, 9, 0, CASABLANCA).toISOString(), "2026-09-10T08:00:00.000Z");
  // Pendant le Ramadan, le Maroc repasse en UTC+0 : un décalage fixe donnerait une heure fausse.
  assert.equal(zonedTimeToUtc(2026, 3, 2, 9, 0, CASABLANCA).toISOString(), "2026-03-02T09:00:00.000Z");
});

test("zonedDateKey renvoie la date locale du cabinet", () => {
  assert.equal(zonedDateKey(zonedTimeToUtc(2026, 9, 10, 9, 0, CASABLANCA), CASABLANCA), "2026-09-10");
  // 23h30 locales restent le même jour côté cabinet, même si l'instant UTC a basculé.
  assert.equal(zonedDateKey(zonedTimeToUtc(2026, 9, 10, 23, 30, CASABLANCA), CASABLANCA), "2026-09-10");
});

test("isWithinOpeningHours respecte les bornes et la durée du rendez-vous", () => {
  const at = (day: number, hour: number, minute: number) => zonedTimeToUtc(2026, 9, day, hour, minute, CASABLANCA);
  assert.equal(isWithinOpeningHours(at(10, 9, 0), 30, HOURS, CASABLANCA), true);
  assert.equal(isWithinOpeningHours(at(10, 17, 30), 30, HOURS, CASABLANCA), true, "dernier créneau complet");
  assert.equal(isWithinOpeningHours(at(10, 17, 45), 30, HOURS, CASABLANCA), false, "déborde la fermeture");
  assert.equal(isWithinOpeningHours(at(10, 8, 30), 30, HOURS, CASABLANCA), false, "avant l'ouverture");
  assert.equal(isWithinOpeningHours(at(12, 10, 0), 30, HOURS, CASABLANCA), false, "samedi fermé");
  assert.equal(isWithinOpeningHours(at(13, 10, 0), 30, HOURS, CASABLANCA), false, "dimanche fermé");
});
