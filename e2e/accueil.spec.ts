import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { logPageErrors } from "./console";

logPageErrors();

test("l'accueil montre un vrai set qui se monte, avec un lien vers son montage", async ({ page }) => {
  await page.goto("./");
  const preview = page.locator("figure").filter({ has: page.getByRole("link", { name: /^Voir l'exemple : monter / }) });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("img", { name: /^Aperçu 3D : / })).toBeVisible();
  await expect(preview.getByRole("link", { name: /^Voir l'exemple/ })).toHaveAttribute("href", /\/set\/[^/]+\/monter\/$/);
  // la vue 3D arrive après le chargement de la page, par-dessus la couverture ; sans WebGL (Firefox en CI),
  // la couverture reste seule
  const webgl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  });
  if (webgl) await expect(preview.locator("canvas")).toBeAttached({ timeout: 30_000 });
  else await expect(preview.locator("canvas")).toHaveCount(0);
});

test("« Comment ça marche » a un dessin par étape", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("ol li svg")).toHaveCount(3);
});

test("le thème se choisit (clair, sombre, automatique) et reste après un rechargement", async ({ page }) => {
  await page.goto("./");
  const button = page.getByRole("button", { name: "Thème : Automatique" });
  await button.click();
  await page.getByRole("button", { name: "Sombre" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Thème : Sombre" })).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations.map((v) => v.id)).toEqual([]);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Échap referme le choix sans rien changer
  await page.getByRole("button", { name: "Thème : Sombre" }).click();
  await expect(page.getByRole("group", { name: "Thème" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("group", { name: "Thème" })).toBeHidden();

  await page.getByRole("button", { name: "Thème : Sombre" }).click();
  await page.getByRole("button", { name: "Automatique" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
});
