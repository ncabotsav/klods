import { expect, test } from "@playwright/test";
import { logPageErrors } from "./console";

logPageErrors();

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";

// Chromium sans WebGL : comme un vieux navigateur, ou une machine sans pilote graphique
test.use({ launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] } });

test("le montage reste utilisable sans vue 3D", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "options de lancement de Chromium");
  await page.goto(`set/${SET}/monter/?etape=1`);
  await expect(page.getByText("Ton navigateur ne peut pas afficher la 3D")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Étape suivante/ }).click();
  await expect(page.locator("p[aria-live]").first()).toContainText("2 sur");
});
