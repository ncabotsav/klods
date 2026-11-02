import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES_FR, themeFr, themePathFr } from "./themes-fr.ts";

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
