import { expect, test } from "@playwright/test";
import { logPageErrors } from "./console";

logPageErrors();

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";

test("signaler une étape pas claire depuis le montage", async ({ page }) => {
  // le serveur de test est statique : on joue le rôle du Worker /api/retours
  const sent: unknown[] = [];
  await page.route("**/api/retours", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true}' });
  });

  await page.goto(`set/${SET}/monter/?etape=2`);
  await page.getByRole("link", { name: "Signaler un souci" }).click({ timeout: 60_000 });

  await expect(page.getByRole("heading", { name: "Envoyer un retour" })).toBeVisible();
  await expect(page.getByText(`le set ${SET}`)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Une étape pas claire" })).toBeChecked();

  // message vide : l'erreur est annoncée et reçoit le focus, rien ne part
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator("#retour-erreur")).toContainText("quelques mots");
  await expect(page.getByLabel("Ton message")).toHaveAttribute("aria-invalid", "true");
  expect(sent).toEqual([]);

  await page.getByLabel("Ton message").fill("On ne voit pas où va la plaque grise.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("heading", { name: /ton retour est bien arrivé/ })).toBeFocused();
  expect(sent).toEqual([{ kind: "etape", message: "On ne voit pas où va la plaque grise.", email: "", website: "", set: SET, model: "principal", step: 2 }]);

  await page.getByRole("link", { name: "Revenir à la page" }).click();
  await expect(page).toHaveURL(new RegExp(`set/${SET}/monter/\\?modele=principal&etape=2`));
});

test("sans réseau, le formulaire donne l'adresse de contact", async ({ page }) => {
  await page.route("**/api/retours", (route) => route.abort());
  await page.goto("retours/");
  await page.getByRole("radio", { name: "Un bug du site" }).check();
  await page.getByLabel("Ton message").fill("Le bouton ne répond pas.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator("#retour-erreur")).toContainText("contact@klods.app");
});
