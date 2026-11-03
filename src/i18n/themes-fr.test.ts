import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES_FR, themeFr, themeName, themePathFr, themePathIn } from "./themes-fr.ts";

test("thèmes traduits, noms de gamme gardés, inconnus inchangés", () => {
  assert.equal(themeFr("Town"), "Ville");
  assert.equal(themeFr("Castle"), "Château");
  assert.equal(themeFr("Technic"), "Technic");
  assert.equal(themeFr("Thème inconnu"), "Thème inconnu");
  assert.equal(themePathFr(["Town", "Classic Town"]), "Ville › Ville classique");
});

test("pas de tiret cadratin, la marque toujours avec ®", () => {
  for (const fr of Object.values(THEMES_FR)) {
    assert.doesNotMatch(fr, /—/);
    if (/lego/i.test(fr)) assert.match(fr, /LEGO®/);
  }
});

test("en anglais : nom d'origine, ou nom propre pour les groupes et les noms qui portent la marque", () => {
  assert.equal(themeName("Town", "en"), "Town");
  assert.equal(themeName("Train", "en"), themeName("Trains", "en"));
  assert.equal(themeName("UCS", "en"), "Ultimate Collector Series");
  assert.equal(themeName("LEGO Brand Store", "en"), "Brand Stores");
  assert.equal(themeName("The LEGO Movie", "en"), "The LEGO® Movie");
  assert.equal(themePathIn(["Town", "Classic Town"], "en"), "Town › Classic Town");
  // un groupe français = un groupe anglais : mêmes pages de thème dans les deux langues
  const groups = new Map<string, Set<string>>();
  for (const raw of Object.keys(THEMES_FR)) (groups.get(themeFr(raw)) ?? groups.set(themeFr(raw), new Set()).get(themeFr(raw))!).add(themeName(raw, "en"));
  for (const [fr, en] of groups) assert.equal(en.size, 1, `${fr} : ${[...en].join(", ")}`);
  for (const raw of Object.keys(THEMES_FR)) {
    const name = themeName(raw, "en");
    if (/lego/i.test(name)) assert.match(name, /LEGO®/, name);
  }
});
