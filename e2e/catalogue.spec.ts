import { expect, test } from "@playwright/test";

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";
const BASE = SET.replace(/-1$/, "");

test("trouver un set depuis l'accueil en moins de 10 secondes", async ({ page }) => {
  const t0 = Date.now();
  await page.goto("./");
  const field = page.getByRole("searchbox", { name: "Numéro ou nom du set" });
  await field.fill(BASE);
  await expect(page.getByRole("link", { name: new RegExp(SET) }).first()).toBeVisible();
  await field.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/set/${SET}/$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(10_000);
  // la fiche cite l'auteur du modèle et mène au montage
  await expect(page.getByText(/publié sur LDraw\.org sous licence CC BY/).first()).toBeVisible();
  await page.getByRole("link", { name: /Commencer le montage|Voir le modèle/ }).click();
  await expect(page).toHaveURL(new RegExp(`/set/${SET}/monter/`));
});

test("filtrer le catalogue, et garder les filtres dans l'adresse", async ({ page }) => {
  await page.goto("catalogue/");
  const count = page.getByRole("status");
  const total = Number((await count.innerText()).match(/\d+/)![0]);
  const theme = page.getByLabel("Thème", { exact: true });
  const first = (await theme.locator("option").nth(1).innerText()).replace(/\s*\(\d+\)$/, "");
  await theme.selectOption({ index: 1 });
  await expect(count).toContainText(`sur ${total}`);
  await expect(page).toHaveURL(/theme=/);
  await page.reload();
  await expect(page.getByLabel("Thème", { exact: true })).toHaveValue(first);
});

test("un set absent renvoie vers sa notice officielle", async ({ page }) => {
  await page.goto("set/99999-1/");
  await expect(page.getByRole("heading", { name: "Le set 99999-1 n'est pas encore en 3D" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir sa notice officielle" })).toHaveAttribute("href", /99999/);
});

test("le sitemap liste toutes les fiches", async ({ request }) => {
  const index: { n: string }[] = await (await request.get("recherche.json")).json();
  const sitemap = await (await request.get("sitemap.xml")).text();
  expect(index.length).toBeGreaterThan(0);
  const missing = index.filter((e) => !sitemap.includes(`/set/${e.n}/</loc>`));
  expect(missing).toEqual([]);
});

test("le bandeau Préversion se ferme et le reste", async ({ page }) => {
  await page.goto("./");
  const banner = page.getByRole("complementary", { name: "Préversion" });
  await expect(banner).toBeVisible();
  await page.getByRole("button", { name: "Fermer le bandeau" }).click();
  await expect(banner).toBeHidden();
  await page.goto("catalogue/");
  await expect(page.getByRole("heading", { name: "Catalogue", level: 1 })).toBeVisible();
  await expect(banner).toBeHidden();
});
