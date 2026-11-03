import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRandom } from "./random.ts";

test("tirage au hasard : le bon nombre, sans doublon, sans toucher à la liste", () => {
  const list = Array.from({ length: 16 }, (_, i) => i);
  const picked = pickRandom(list, 4);
  assert.equal(picked.length, 4);
  assert.equal(new Set(picked).size, 4);
  assert.ok(picked.every((n) => list.includes(n)));
  assert.deepEqual(list, Array.from({ length: 16 }, (_, i) => i));
  assert.deepEqual(pickRandom([1, 2], 4).sort(), [1, 2]);
  // avec un hasard fixé, le tirage est reproductible
  assert.deepEqual(pickRandom(list, 3, () => 0), [0, 1, 2]);
});

test("chaque set de la réserve finit par sortir", () => {
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) for (const n of pickRandom([0, 1, 2, 3, 4, 5, 6, 7], 4)) seen.add(n);
  assert.equal(seen.size, 8);
});
