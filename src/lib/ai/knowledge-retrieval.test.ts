import assert from "node:assert/strict";
import test from "node:test";
import { findRelevantKnowledge } from "./knowledge-retrieval.ts";

const entries = [
  { category: "Horaires", question: "Quels sont vos horaires d'ouverture ?", answer: "Le cabinet est ouvert du lundi au vendredi." },
  { category: "Soins", question: "Proposez-vous le blanchiment dentaire ?", answer: "Oui, sur rendez-vous après consultation." },
  { category: "Tarifs", question: "Quel est le prix du détartrage ?", answer: "Le tarif est indiqué lors de la consultation." },
];

test("sélectionne les fiches pertinentes, quelle que soit leur date de mise à jour", () => {
  const result = findRelevantKnowledge("Je voudrais un blanchiment", entries);
  assert.deepEqual(result.map((entry) => entry.question), ["Proposez-vous le blanchiment dentaire ?"]);
});

test("n'envoie aucune fiche quand la question n'a aucun lien avec la Base IA", () => {
  assert.deepEqual(findRelevantKnowledge("Quel temps fera-t-il demain ?", entries), []);
});

test("limite le contexte aux résultats les mieux classés", () => {
  assert.equal(findRelevantKnowledge("Quel est le prix du détartrage ?", entries, 1).length, 1);
});
