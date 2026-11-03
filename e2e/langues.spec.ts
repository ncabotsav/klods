import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { logPageErrors } from "./console";

logPageErrors();

/** Un set présent dans les fixtures et dans le vrai catalogue. */
const SET = process.env.E2E_SET ?? "889-1";

test("les pages anglaises existent, déclarent leur version française, et passent l'audit", async ({ page }) => {
  await page.goto("en/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Build your LEGO® sets in 3D, step by step.");
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/$/);
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);

  await page.goto(`en/set/${SET}/`);
  await expect(page).toHaveTitle(/building instructions in 3D/);
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", new RegExp(`/set/${SET}/$`));
  await expect(page.getByRole("link", { name: "Start building" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
});

test("le lien de langue mène à la même page dans l'autre langue", async ({ page }) => {
  await page.goto(`set/${SET}/`);
  await page.getByRole("link", { name: "Read in English" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/set/${SET}/$`));
  await page.getByRole("link", { name: "Lire en français" }).click();
  await expect(page).toHaveURL(new RegExp(`/klods/set/${SET}/$`));
});

test("après une page anglaise, le montage parle anglais ; il change de langue sur place", async ({ page }) => {
  await page.goto(`en/set/${SET}/`);
  await page.getByRole("link", { name: "Start building" }).click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Everything's here, let's start" }).click();
  await expect(page.locator("p[aria-live]").first()).toContainText("1 of");
  await expect(page.getByText(/^(Add \d|Place )/).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByRole("link", { name: "Lire en français" }).click();
  await expect(page.locator("p[aria-live]").first()).toContainText("1 sur");
  await expect(page.getByText(/^(Ajoute \d|Pose )/).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("le catalogue anglais mène aux fiches anglaises, avec les thèmes en anglais", async ({ page }) => {
  await page.goto("en/catalogue/");
  await expect(page.getByRole("heading", { name: "Catalogue", level: 1 })).toBeVisible();
  const first = page.locator('a[href*="/en/set/"]').first();
  await expect(first).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Themes" })).toBeVisible();
});
