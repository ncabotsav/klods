import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatRanges, parseRanges } from "./ranges.ts";

test("lit des plages en ignorant les commentaires", () => {
  assert.deepEqual(parseRanges("# Identifiants, relevés le 2026-11-01 : 1 470 sets.\n1-3,5\n# fin\n7-8"), [1, 2, 3, 5, 7, 8]);
});

test("formatRanges est l'inverse de parseRanges", () => {
  assert.equal(formatRanges([5, 1, 2, 3, 7, 8, 3]), "1-3,5,7-8");
});

test("le fichier data/omr-ids.txt contient les 1 470 sets relevés", () => {
  assert.equal(parseRanges(readFileSync("data/omr-ids.txt", "utf8")).length, 1470);
});
