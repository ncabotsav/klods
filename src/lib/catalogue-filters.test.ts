import { test } from "node:test";
import assert from "node:assert/strict";
import { decadesOf, filterEntries, type CatalogueFilters } from "./catalogue-filters.ts";
import { createSearch, type SearchEntry } from "./search.ts";

const e = (n: string, t: string, h: string, y: number, p: number, ok = true): SearchEntry => ({ n, t, h, y, p, s: 10, e: ok, c: false });
const entries = [
  e("8094-1", "Control Center", "Mindstorms", 1990, 600),
  e("4915-1", "Mini Construction", "Creator", 2007, 67),
  e("10179-1", "Millennium Falcon", "Star Wars", 2007, 5195),
  e("6086-1", "Black Knight's Castle", "Castle", 1992, 588, false),
];
const none: CatalogueFilters = { q: "", theme: "", decade: 0, parts: "", withSteps: false, sort: "number" };
const nums = (list: SearchEntry[]) => list.map((x) => x.n);

test("sans filtre : tout, par numéro", () => {
  assert.deepEqual(nums(filterEntries(entries, none)), ["4915-1", "6086-1", "8094-1", "10179-1"]);
});

test("thème, décennie, taille, avec étapes", () => {
  assert.deepEqual(nums(filterEntries(entries, { ...none, theme: "Creator" })), ["4915-1"]);
  assert.deepEqual(nums(filterEntries(entries, { ...none, decade: 1990 })), ["6086-1", "8094-1"]);
  assert.deepEqual(nums(filterEntries(entries, { ...none, parts: "large" })), ["6086-1", "8094-1"]);
  assert.deepEqual(nums(filterEntries(entries, { ...none, parts: "huge" })), ["10179-1"]);
  assert.deepEqual(nums(filterEntries(entries, { ...none, decade: 1990, withSteps: true })), ["8094-1"]);
});

test("tris", () => {
  assert.deepEqual(nums(filterEntries(entries, { ...none, sort: "recent" })), ["4915-1", "10179-1", "6086-1", "8094-1"]);
  assert.deepEqual(nums(filterEntries(entries, { ...none, sort: "parts" }))[0], "10179-1");
  assert.deepEqual(nums(filterEntries(entries, { ...none, sort: "name" }))[0], "6086-1");
});

test("recherche : pertinence, puis filtres", () => {
  const engine = createSearch(entries);
  assert.deepEqual(nums(filterEntries(entries, { ...none, q: "falcon" }, engine)), ["10179-1"]);
  assert.deepEqual(nums(filterEntries(entries, { ...none, q: "2007", theme: "Creator" }, engine)), ["4915-1"]);
});

test("décennies", () => {
  assert.deepEqual(decadesOf(entries), [1990, 2000]);
});
