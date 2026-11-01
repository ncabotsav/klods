import { test } from "node:test";
import assert from "node:assert/strict";
import { packModel, splitMpd } from "./ldraw-pack.ts";
import { analyzeModel } from "./ldraw-analyze.ts";

/*
 * Mini-bibliothèque en mémoire : une plaque 2 × 4 faite d'une sous-pièce et d'une primitive,
 * comme dans la vraie bibliothèque LDraw (parts/, parts/s/, p/).
 */
const LIBRARY: Record<string, string> = {
  "parts/3020.dat": "0 Plate  2 x  4\n0 Name: 3020.dat\n0 !LDRAW_ORG Part UPDATE 2004-03\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 s/3020s01.dat\n",
  "parts/s/3020s01.dat": "0 ~Plate  2 x  4 without Front Face\n0 !LDRAW_ORG Subpart\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 box5.dat\n",
  "p/box5.dat": "0 Box with 5 Faces\n0 !LDRAW_ORG Primitive\n4 16 1 1 1 -1 1 1 -1 1 -1 1 1 -1\n2 24 1 1 1 -1 1 1\n",
  "parts/3001.dat": "0 Brick  2 x  4\n0 !LDRAW_ORG Part\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 box5.dat\n",
};
const read = (p: string) => LIBRARY[p] ?? null;
const LDCONFIG = "0 LDraw.org Configuration File\n0 !COLOUR Red CODE 4 VALUE #C91A09 EDGE #333333\n0 !COLOUR Yellow CODE 14 VALUE #F2CD37 EDGE #333333\n";

// Un modèle OMR typique : un modèle principal, un sous-modèle, des étapes, des références sans chemin
const OMR = [
  "0 FILE 9999-1.mpd",
  "0 Test Model",
  "0 Name: 9999-1.mpd",
  "1 4 0 0 0 1 0 0 0 1 0 0 0 1 3020.dat",
  "0 STEP",
  "1 14 0 -8 0 1 0 0 0 1 0 0 0 1 Sub Assembly.ldr",
  "0 STEP",
  "1 4 0 -32 0 1 0 0 0 1 0 0 0 1 3001.DAT",
  "1 4 40 -32 0 1 0 0 0 1 0 0 0 1 9999.dat",
  "0 STEP",
  "0 FILE Sub Assembly.ldr",
  "0 Sub Assembly",
  "1 16 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat",
  "0 STEP",
  "1 16 0 -24 0 1 0 0 0 1 0 0 0 1 3020.dat",
  "",
].join("\r\n");

test("découpe un fichier MPD en blocs", () => {
  const blocks = splitMpd(OMR);
  assert.deepEqual(blocks.map((b) => b.name), ["9999-1.mpd", "Sub Assembly.ldr"]);
});

test("intègre pièces, sous-pièces et primitives, et signale l'introuvable", () => {
  const packed = packModel(OMR, LDCONFIG, read);
  assert.deepEqual(packed.missing, ["9999.dat"]);
  assert.equal(packed.libraryFiles, 4);
  assert.equal(packed.embeddedFiles, 1);
  assert.match(packed.text, /^0 FILE parts\/s\/3020s01\.dat$/m);
  assert.match(packed.text, /^0 FILE p\/box5\.dat$/m);
  assert.match(packed.text, /^1 4 0 -32 0 1 0 0 0 1 0 0 0 1 parts\/3001\.dat$/m);
  // le sous-modèle garde son nom, le modèle principal n'a pas de « 0 FILE »
  assert.match(packed.text, /^0 FILE Sub Assembly\.ldr$/m);
  assert.doesNotMatch(packed.text, /^0 FILE 9999-1\.mpd$/m);
  // chaque fichier n'est intégré qu'une fois
  assert.equal(packed.text.match(/^0 FILE parts\/3020\.dat$/gm)?.length, 1);
});

test("une pièce introuvable n'empêche pas le modèle de se charger", async () => {
  const packed = packModel(OMR, LDCONFIG, read);
  assert.match(packed.text, /^0 FILE 9999\.dat$/m);
  const stats = await analyzeModel(packed.text);
  assert.equal(stats.parts, 5); // la pièce vide compte, le packer la signale à part
});

test("le fichier packé se charge avec LDrawLoader, avec ses étapes", async () => {
  const packed = packModel(OMR.replace(/^.*9999\.dat\r$/m, ""), LDCONFIG, read);
  assert.deepEqual(packed.missing, []);
  const stats = await analyzeModel(packed.text);
  assert.equal(stats.parts, 4); // 3020 + 3001 dans le principal, 3001 + 3020 dans le sous-modèle
  assert.equal(stats.uniqueParts, 4); // 3020 et 3001 rouges ; 3001 et 3020 jaunes (couleur 16 héritée du sous-modèle)
  assert.ok(stats.steps >= 3, `au moins 3 étapes, ${stats.steps} trouvées`);
  assert.equal(stats.stepCommands, 4);
});
