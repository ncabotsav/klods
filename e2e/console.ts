import { test } from "@playwright/test";

/**
 * Garde les erreurs de la page (console et exceptions) et les affiche si le test échoue :
 * en CI, c'est la seule trace lisible sans télécharger les traces Playwright.
 * Un blocage par la CSP (script, image ou requête refusés) fait échouer le test.
 */
export function logPageErrors() {
  const errors: string[] = [];
  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`[exception] ${e.message}`));
  });
  test.afterEach(async ({}, info) => {
    const blocked = errors.filter((e) => /Content Security Policy|Content-Security-Policy/i.test(e));
    if (blocked.length) throw new Error(`Bloqué par la CSP :\n${blocked.slice(0, 5).join("\n")}`);
    if (info.status !== info.expectedStatus && errors.length) console.log(`Erreurs de la page (${info.project.name}) :\n${errors.slice(0, 20).join("\n")}`);
  });
}
