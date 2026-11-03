import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { logPageErrors } from "./console";

logPageErrors();

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";

/** Un montage terminé et un en cours, comme s'ils avaient été faits sur cet appareil. */
const seed = (now: number) => ({
  [`${SET}/principal`]: {
    number: SET, model: "principal", name: "Set terminé", modelName: "Modèle principal", steps: 10, step: 9,
    seen: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], activeMs: 25 * 60_000, lastAt: now, startedAt: now - 3_600_000, updatedAt: now,
    partsChecked: true, missing: [], finishedAt: now, finishedMs: 25 * 60_000, matched: true,
  },
  "4915-1/principal": {
    number: "4915-1", model: "principal", name: "Set en cours", modelName: "Modèle principal", steps: 40, step: 4,
    seen: [0, 1, 2, 3, 4], activeMs: 5 * 60_000, lastAt: now, startedAt: now, updatedAt: now - 1000,
    partsChecked: true, missing: [], finishedAt: null, finishedMs: null, matched: null,
  },
});

test("l'atelier vide propose le catalogue et l'ouverture d'une sauvegarde", async ({ page }) => {
  await page.goto("atelier/");
  await expect(page.getByRole("heading", { name: "Ton atelier est vide" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvrir une sauvegarde" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistrer mon atelier" })).toHaveCount(0);
});

test("l'atelier montre les chiffres, la vitrine et les montages en cours, et se sauvegarde", async ({ page }, info) => {
  await page.addInitScript((data) => localStorage.setItem("klods:progress:v1", JSON.stringify(data)), seed(Date.now()));
  await page.goto("atelier/");
  const stats = page.getByRole("region", { name: "Tes chiffres" });
  await expect(stats).toContainText("set terminé1");
  await expect(stats).toContainText("étapes suivies15");
  await expect(stats).toContainText("30 min");
  await expect(page.getByRole("region", { name: "En cours" })).toContainText("Set en cours");
  const shelf = page.getByRole("region", { name: "Ta vitrine" });
  await expect(shelf).toContainText("Monté en 25 min");
  await expect(shelf.getByRole("link", { name: "Remonter Set terminé" })).toHaveAttribute("href", new RegExp(`set/${SET}/monter/$`));

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);

  // sauvegarde, puis reprise dans un navigateur vide
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Enregistrer mon atelier" }).click()]);
  const file = info.outputPath("atelier.json");
  await download.saveAs(file);
  await page.evaluate(() => localStorage.clear());
  // nouvel onglet sans le script qui remplit l'atelier : le navigateur est vide
  const fresh = await page.context().newPage();
  await fresh.goto("atelier/");
  await expect(fresh.getByRole("heading", { name: "Ton atelier est vide" })).toBeVisible();
  await fresh.locator('input[type="file"]').setInputFiles({ name: "atelier.json", mimeType: "application/json", buffer: await readFile(file) });
  await expect(fresh.getByRole("status").filter({ hasText: "ajoutés" })).toContainText("2 montages ajoutés");
  await expect(fresh.getByRole("region", { name: "Ta vitrine" })).toContainText("Set terminé");
});
