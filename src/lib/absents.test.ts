import { test } from "node:test";
import assert from "node:assert/strict";
import { absentEntries, buildAbsents } from "./absents.ts";
import { createSearch } from "./search.ts";

const rows = [
  { set_num: "42213-1", name: "Ford Bronco SUV", year: "2025", num_parts: "943", theme: "Technic" },
  { set_num: "4915-1", name: "Mini Construction", year: "2007", num_parts: "69", theme: "Creator" },
  { set_num: "5005257-1", name: "Book", year: "2018", num_parts: "0", theme: "Books" },
  { set_num: "42154-1", name: "2022 Ford GT", year: "2022", num_parts: "1466", theme: "Technic" },
];

test("garde les sets absents de Klods, avec des briques", () => {
  const file = buildAbsents(rows, new Set(["4915-1"]));
  assert.deepEqual(
    file.sets.map((s) => s[0]),
    ["42213-1", "42154-1"],
  );
  assert.deepEqual(file.themes, ["Technic"]);
});

test("les absents se cherchent par numéro et par nom", () => {
  const search = createSearch(absentEntries(buildAbsents(rows, new Set())));
  assert.equal(search.search("42213", 5)[0]?.entry.t, "Ford Bronco SUV");
  assert.equal(search.search("bronco", 5)[0]?.entry.n, "42213-1");
  assert.equal(search.search("Technic", 5)[0]?.entry.h, "Technic");
});
