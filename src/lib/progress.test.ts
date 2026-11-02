import { test } from "node:test";
import assert from "node:assert/strict";
import { BREAK_MS, addActiveTime, followedEnough, formatDuration } from "./progress.ts";

test("le temps de montage ignore les pauses", () => {
  let p = { activeMs: 0, lastAt: 0 };
  p = addActiveTime(p, 1_000); // première action : rien à compter
  assert.equal(p.activeMs, 0);
  p = addActiveTime(p, 61_000); // une minute plus tard
  assert.equal(p.activeMs, 60_000);
  p = addActiveTime(p, 61_000 + BREAK_MS + 1); // une pause
  assert.equal(p.activeMs, 60_000);
  p = addActiveTime(p, 61_000 + BREAK_MS + 1 + 30_000);
  assert.equal(p.activeMs, 90_000);
});

test("un montage suivi à 90 % compte comme fait", () => {
  assert.equal(followedEnough([0, 1, 2, 3, 4, 5, 6, 7, 8], 10), true);
  assert.equal(followedEnough([0, 9], 10), false);
  assert.equal(followedEnough([0, 0, 1, 1], 3), false);
});

test("durées lisibles", () => {
  assert.equal(formatDuration(25 * 60_000), "25 min");
  assert.equal(formatDuration(95 * 60_000), "1 h 35");
  assert.equal(formatDuration(120 * 60_000), "2 h");
  assert.equal(formatDuration(5_000), "1 min");
});
