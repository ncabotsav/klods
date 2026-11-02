import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout du parcours de montage, sur le site construit (out/) servi sous /klods.
 * Il faut des données : `npm run data:fixtures` en local, les données du cache en CI.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:4173/klods/",
    trace: "retain-on-failure",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    { name: "téléphone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "node scripts/serve-out.mjs 4173", url: "http://localhost:4173/klods/", reuseExistingServer: !process.env.CI },
});
