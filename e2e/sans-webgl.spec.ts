import { expect, test } from "@playwright/test";
import { logPageErrors } from "./console";

logPageErrors();

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";

// Chromium sans WebGL : comme un vieux navigateur, ou une machine sans pilote graphique
test.skip(({ browserName }) => browserName !== "chromium", "options de lancement de Chromium");
test.use({ launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] } });

test("le montage reste utilisable sans vue 3D", async ({ page }) => {
  await page.goto(`set/${SET}/monter/?etape=1`);
  await expect(page.getByText("Ton navigateur ne peut pas afficher la 3D")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Étape suivante/ }).click();
  await expect(page.locator("p[aria-live]").first()).toContainText("2 sur");
});

test("sans WebGL, le parcours de montage reste accessible", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto(`set/${SET}/monter/?etape=1`);
  await expect(page.getByText("Ton navigateur ne peut pas afficher la 3D")).toBeVisible({ timeout: 60_000 });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});
