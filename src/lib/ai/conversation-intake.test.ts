import assert from "node:assert/strict";
import test from "node:test";
import { isEmergencyCommand, languageWelcome } from "./conversation-intake.ts";

test("une urgence est déclenchée uniquement par le mot exact URGENCE", () => {
  assert.equal(isEmergencyCommand("URGENCE"), true);
  assert.equal(isEmergencyCommand("urgence !"), true);
  assert.equal(isEmergencyCommand("J'ai une douleur urgente"), false);
  assert.equal(isEmergencyCommand("saignement"), false);
});

test("le menu de capacités est affiché après la langue", () => {
  assert.match(languageWelcome("fr"), /tapez URGENCE/);
  assert.match(languageWelcome("fr"), /1\./);
  assert.match(languageWelcome("fr"), /rendez-vous/);
});
