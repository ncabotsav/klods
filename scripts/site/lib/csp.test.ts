import { test } from "node:test";
import assert from "node:assert/strict";
import { inlineScripts, pagePolicy, sha256, withPolicy } from "./csp.ts";

const page = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><script src="/_next/a.js" async=""></script></head><body><script>self.__next_f.push([1,"a"])</script><script type="application/ld+json">{"@type":"HowTo"}</script><script type="module">import "x"</script></body></html>`;

test("seuls les scripts en ligne exécutables sont retenus", () => {
  assert.deepEqual(inlineScripts(page), [`self.__next_f.push([1,"a"])`, `import "x"`]);
});

test("la politique liste l'empreinte de chaque script en ligne", () => {
  const p = pagePolicy(page);
  assert.ok(p.includes(sha256(`self.__next_f.push([1,"a"])`)));
  assert.ok(p.includes("object-src 'none'"));
  assert.ok(!/script-src[^;]*unsafe/.test(p));
});

test("la balise est posée au début du head, une seule fois", () => {
  const once = withPolicy(page);
  assert.ok(once.startsWith(`<!DOCTYPE html><html lang="fr"><head><meta http-equiv="Content-Security-Policy"`));
  assert.equal(withPolicy(once), once);
});

test("empreinte au format attendu par les navigateurs", () => {
  // valeur de référence : echo -n 'alert(1)' | openssl dgst -sha256 -binary | base64
  assert.equal(sha256("alert(1)"), "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='");
});
