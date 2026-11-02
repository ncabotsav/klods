import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { logPageErrors } from "./console";

logPageErrors();

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";

/** Audit axe (règles WCAG A et AA) : aucune violation sérieuse ou critique. */
async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`)).toEqual([]);
}

for (const [name, path] of [
  ["accueil", "./"],
  ["catalogue", "catalogue/"],
  ["fiche", `set/${SET}/`],
  ["à propos", "a-propos/"],
  ["confidentialité", "confidentialite/"],
  ["hors connexion", "hors-connexion/"],
  ["set absent", "set/99999-1/"],
] as const) {
  test(`accessibilité : ${name}`, async ({ page }) => {
    await page.goto(path);
    await audit(page);
  });
}

test("accessibilité : parcours de montage (couverture, pièces, étape)", async ({ page }) => {
  await page.goto(`set/${SET}/monter/`);
  await expect(page.getByRole("button", { name: "Commencer" })).toBeEnabled({ timeout: 60_000 });
  await audit(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expect(page.getByRole("heading", { name: "Vérifie tes pièces" })).toBeVisible();
  await audit(page);
  await page.getByRole("button", { name: "Tout est là, je commence" }).click();
  await expect(page.getByRole("button", { name: /Étape suivante/ })).toBeVisible();
  await audit(page);
});

test("le montage se pilote au clavier", async ({ page, isMobile }) => {
  test.skip(isMobile, "pas de clavier sur téléphone");
  await page.goto(`set/${SET}/monter/?etape=1`);
  const label = page.locator("p[aria-live]").first();
  await expect(label).toContainText("1 sur", { timeout: 60_000 });
  await page.keyboard.press("ArrowRight");
  await expect(label).toContainText("2 sur");
  await page.keyboard.press("ArrowLeft");
  await expect(label).toContainText("1 sur");
});

test("accessibilité en thème sombre : accueil, fiche, étape", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  for (const path of ["./", `set/${SET}/`]) {
    await page.goto(path);
    await audit(page);
  }
  await page.goto(`set/${SET}/monter/?etape=2`);
  await expect(page.getByRole("button", { name: /Étape suivante/ })).toBeVisible({ timeout: 60_000 });
  await audit(page);
});
