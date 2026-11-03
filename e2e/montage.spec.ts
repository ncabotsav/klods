import { expect, test } from "@playwright/test";
import { logPageErrors } from "./console";

logPageErrors();

/** Un set présent dans les fixtures et dans le vrai catalogue, avec sous-ensembles et ROTSTEP. */
const SET = process.env.E2E_SET ?? "889-1";
const next = (page: import("@playwright/test").Page) => page.getByRole("button", { name: /Étape suivante/ });
const stepLabel = (page: import("@playwright/test").Page) => page.locator("p[aria-live]");

test("monter un set de bout en bout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`set/${SET}/monter/`);
  await expect(page.getByRole("button", { name: "Commencer" })).toBeEnabled({ timeout: 60_000 });
  await page.getByRole("button", { name: "Commencer" }).click();

  await expect(page.getByRole("heading", { name: "Vérifie tes pièces" })).toBeVisible();
  await page.getByRole("button", { name: "Tout est là, je commence" }).click();

  await expect(stepLabel(page)).toContainText("1 sur");
  const total = Number((await stepLabel(page).innerText()).match(/sur (\d+)/)![1]);
  for (let i = 1; i < total; i++) await next(page).click();
  await expect(stepLabel(page)).toContainText(`${total} sur ${total}`);
  await page.getByRole("button", { name: "Terminer" }).click();

  await expect(page.getByRole("heading", { name: "Montage terminé" })).toBeVisible();
  await expect(page.getByText("Ton temps")).toBeVisible();
  expect(errors).toEqual([]);
});

test("reprendre un montage après avoir fermé la page", async ({ page }) => {
  await page.goto(`set/${SET}/monter/`);
  await page.getByRole("button", { name: "Commencer" }).click({ timeout: 60_000 });
  await page.getByRole("button", { name: "Tout est là, je commence" }).click();
  await next(page).click();
  await next(page).click();
  await expect(stepLabel(page)).toContainText("3 sur");
  await expect(page).toHaveURL(/etape=3/);

  // le geste retour recule d'une étape
  await page.goBack();
  await expect(stepLabel(page)).toContainText("2 sur");

  // la couverture propose de reprendre là où on en était, et l'accueil aussi
  await page.goto(`set/${SET}/monter/`);
  await expect(page.getByRole("button", { name: "Reprendre à l'étape 2" })).toBeVisible({ timeout: 60_000 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Reprendre" })).toBeVisible();
  await page.getByRole("link", { name: /Continuer/ }).click();
  await expect(stepLabel(page)).toContainText("2 sur", { timeout: 60_000 });
});

test("marquer une pièce manquante", async ({ page }) => {
  await page.goto(`set/${SET}/monter/?vue=pieces`);
  await page.getByRole("button", { name: "Manquante" }).first().click({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Pièces manquantes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander des pièces manquantes" })).toBeVisible();
});

test("retirer un montage de « Reprendre », puis annuler", async ({ page }) => {
  await page.goto(`set/${SET}/monter/?etape=3`);
  await expect(stepLabel(page)).toContainText("3 sur", { timeout: 60_000 });
  await page.goto("./");
  const resume = page.getByRole("region", { name: "Reprendre" });
  const remove = resume.getByRole("button", { name: /^Retirer « .+ » de la liste$/ });
  await expect(remove).toHaveCount(1);
  await remove.click();
  // le focus passe sur « Annuler », qui lit le message
  const undo = page.getByRole("button", { name: "Annuler" });
  await expect(undo).toBeFocused();
  await expect(page.getByText(/est retiré, avec sa progression/)).toBeVisible();
  await expect(resume.getByRole("link", { name: /Continuer/ })).toHaveCount(0);
  await undo.click();
  await expect(resume.getByRole("link", { name: /Continuer/ })).toHaveCount(1);
  await expect(resume.getByRole("link", { name: /Continuer/ })).toBeFocused();
  // retirer pour de bon : l'encart disparaît une fois le bandeau parti
  await remove.click();
  await page.reload();
  await expect(page.getByRole("region", { name: "Reprendre" })).toHaveCount(0);
});
