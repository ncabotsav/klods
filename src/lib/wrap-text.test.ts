import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapText } from "./wrap-text.ts";

test("le nom du set se coupe en lignes, la dernière finit par « … » si c'est trop long", () => {
  const measure = (s: string) => s.length * 10;
  assert.deepEqual(wrapText(measure, "Radar Truck", 300, 3), ["Radar Truck"]);
  assert.deepEqual(wrapText(measure, "Medieval Knights Castle With Drawbridge", 160, 2), ["Medieval Knights", "Castle With…"]);
});
