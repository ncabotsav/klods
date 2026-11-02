import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout sur le site construit (out/) servi sous /klods.
 * Il faut des données : `npm run data:fixtures` en local, les données du cache en CI.
 * En CI (E2E_ALL_BROWSERS=1), on joue aussi Safari (WebKit, iPhone) et Firefox.
 */
const chromiumGl = { launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } };

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:4173/klods/",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], ...chromiumGl } },
    { name: "téléphone", use: { ...devices["Pixel 7"], ...chromiumGl } },
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          { name: "safari-iphone", use: { ...devices["iPhone 13"] } },
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        ]
      : []),
  ],
  webServer: { command: "node scripts/serve-out.mjs 4173", url: "http://localhost:4173/klods/", reuseExistingServer: !process.env.CI },
});
