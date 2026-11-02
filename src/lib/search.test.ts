import { test } from "node:test";
import assert from "node:assert/strict";
import { createSearch, editDistance, normalize, type SearchEntry } from "./search.ts";

const e = (n: string, t: string, h: string | null, y = 2010, ok = true): SearchEntry => ({ n, t, h, y, p: 100, s: 10, e: ok, c: false });

const index = [
  e("4915-1", "Mini Construction", "Creator", 2007),
  e("4918-1", "Mini Flyers", "Creator", 2007),
  e("8094-1", "Control Center", "Mindstorms", 1990),
  e("8094-2", "Control Center (variante)", "Mindstorms", 1991),
  e("10179-1", "Ultimate Collector's Millennium Falcon", "Star Wars", 2007),
  e("6086-1", "Black Knight's Castle", "Castle", 1992, false),
  e("60051-1", "High-Speed Passenger Train", "City", 2014),
];
const { search } = createSearch(index);
const first = (q: string) => search(q)[0]?.entry.n;

test("normalize enlève accents et ponctuation", () => {
  assert.equal(normalize("  Château-fort  d'Été "), "chateau fort d ete");
});

test("editDistance s'arrête au-delà du maximum", () => {
  assert.equal(editDistance("falcon", "falcom", 1), 1);
  assert.equal(editDistance("castle", "cattle", 2), 1);
  assert.ok(editDistance("abc", "xyz", 1) > 1);
});

test("numéro avec ou sans -1", () => {
  assert.equal(first("4915"), "4915-1");
  assert.equal(first("4915-1"), "4915-1");
  assert.equal(first("8094-2"), "8094-2");
  assert.equal(first("8094"), "8094-1");
  assert.deepEqual(
    search("491").map((h) => h.entry.n),
    ["4915-1", "4918-1"],
  );
});

test("nom, morceau de nom et thème", () => {
  assert.equal(first("millennium falcon"), "10179-1");
  assert.equal(first("falcon"), "10179-1");
  assert.equal(first("castle"), "6086-1");
  assert.equal(search("creator").length, 2);
  assert.equal(first("passenger train"), "60051-1");
});

test("une faute de frappe par mot", () => {
  assert.equal(first("millenium"), "10179-1");
  assert.equal(first("falcom"), "10179-1");
  assert.equal(first("contrl center"), "8094-1");
});

test("tous les mots doivent correspondre", () => {
  assert.equal(search("mini falcon").length, 0);
  assert.equal(search("").length, 0);
  assert.equal(search("zzzz").length, 0);
});

test("le nom anglais d'un thème traduit reste cherchable", () => {
  const { search } = createSearch([{ n: "6390-1", t: "Main Street", h: "Ville", a: "Town Classic Town", y: 1980, p: 500, s: 40, e: true, c: false }]);
  assert.equal(search("ville")[0]?.entry.n, "6390-1");
  assert.equal(search("town")[0]?.entry.n, "6390-1");
});
