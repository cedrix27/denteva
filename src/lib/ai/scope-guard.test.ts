import assert from "node:assert/strict";
import test from "node:test";
import { isClearlyOutsideCabinetScope, outsideCabinetScopeReply } from "./scope-guard.ts";

test("bloque les demandes de code avant tout appel au modèle", () => {
  assert.equal(isClearlyOutsideCabinetScope("Écris-moi un code Python pour une calculatrice"), true);
  assert.equal(isClearlyOutsideCabinetScope("Can you write JavaScript code?"), true);
});

test("laisse passer les demandes utiles au cabinet", () => {
  assert.equal(isClearlyOutsideCabinetScope("Je voudrais prendre rendez-vous pour un détartrage"), false);
  assert.equal(isClearlyOutsideCabinetScope("Quels sont vos horaires ?"), false);
});

test("redirige dans la langue choisie", () => {
  assert.match(outsideCabinetScopeReply("fr"), /cabinet dentaire/i);
  assert.match(outsideCabinetScopeReply("en"), /dental practice/i);
  assert.match(outsideCabinetScopeReply("darija"), /العيادة/);
});
