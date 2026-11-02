import { expect, test } from "@playwright/test";

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";

test("un set ouvert une fois se rejoue sans réseau", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "mode hors ligne simulé par Chromium");
  // première visite : le service worker s'installe, puis prend la main sur la page
  await page.goto(`set/${SET}/monter/`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole("button", { name: "Commencer" })).toBeEnabled({ timeout: 60_000 });

  // mode avion : la page, le modèle et les étapes viennent du cache
  await context.setOffline(true);
  await page.goto(`set/${SET}/monter/?etape=2`);
  await expect(page.getByRole("button", { name: /Étape suivante/ })).toBeEnabled({ timeout: 60_000 });
  await page.getByRole("button", { name: /Étape suivante/ }).click();
  await expect(page.locator("p[aria-live]").first()).toContainText("3 sur");

  // une page jamais vue renvoie vers « Hors connexion », qui liste le set gardé
  await page.goto("a-propos/");
  await expect(page.getByRole("heading", { name: "Hors connexion" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(SET) })).toBeVisible();
  await context.setOffline(false);
});
