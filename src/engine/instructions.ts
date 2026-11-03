/**
 * Consignes pour une étape, en français : « Ajoute 2 plaques 2 × 4 jaunes et 1 brique 1 × 2 rouge. »,
 * ou en anglais : « Add 2 yellow Plate 2 × 4 and 1 red Brick 1 × 2. »
 * Les noms viennent de la description LDraw de chaque pièce (en anglais) ; en français, le premier mot
 * est traduit quand on le connaît (src/i18n/ldraw-fr.ts) et les couleurs s'accordent en genre et en nombre.
 */
import type { Object3D } from "three";
import { COLOURS_FR, MINIFIG_WORDS_FR, PART_WORDS_FR } from "../i18n/ldraw-fr.ts";
import { loaderName, type ModelText } from "./ldraw-text.ts";
import type { Step } from "./steps.ts";

/** Langue des consignes (mêmes codes que le site). */
export type Lang = "fr" | "en";

export type PartGroup = {
  key: string;
  /** Fichier de la pièce, « parts/3020.dat ». */
  file: string;
  /** Numéro de la pièce, « 3020 ». */
  number: string;
  colourCode: string;
  colourName: string;
  hex: string | null;
  count: number;
  /** Nom français sans la couleur : court au singulier et au pluriel (« plaque 2 × 4 »), et complet. */
  name: { one: string; many: string; full: string };
  gender: "m" | "f";
  /** Une pièce de l'étape, pour dessiner sa miniature. */
  sample: Object3D;
};

/** Couleur effective d'une pièce : la sienne, ou celle héritée de son sous-ensemble (16 = couleur du parent). */
export function colourCodeOf(o: Object3D): string {
  for (let cur: Object3D | null = o; cur; cur = cur.parent) {
    const c = cur.userData?.colorCode;
    if (c != null && c !== "16" && c !== "24") return String(c);
  }
  return "16";
}

/** Nettoie une description LDraw : « Plate  2 x  4 » → « Plate 2 × 4 » ; enlève les préfixes ~ _ = |. */
export function cleanDescription(d: string) {
  return d
    .replace(/^[~_=|]+/, "")
    .replace(/\s+/g, " ")
    .replace(/(\d) x (\d)/g, "$1 × $2")
    .replace(/(\d) x (\d)/g, "$1 × $2")
    .trim();
}

/** Dimensions d'une description : « 2 × 4 », « 1 × 1 × 0.667 » ; à défaut, un nombre en tête (« Beam 5 »). */
function dimensionsOf(tail: string): string {
  const m = tail.match(/\d+(?:[./]\d+)?(?: × \d+(?:[./]\d+)?)+/);
  if (m) return m[0];
  return tail.match(/^\d+(?:[./]\d+)?L?\b/)?.[0] ?? "";
}

export type FrenchName = {
  /** Court, pour la consigne : nom et dimensions (« plaque 2 × 2 »). */
  one: string;
  many: string;
  /** Complet, pour la liste des pièces : nom français et reste de la description LDraw (« plaque 2 × 2 with Groove »). */
  full: string;
  gender: "m" | "f";
};

/** Nom français d'une pièce, au singulier et au pluriel, avec son genre. */
export function frenchPartName(description: string): FrenchName {
  const clean = cleanDescription(description);
  const [first, ...rest] = clean.split(" ");

  let w: { word: string; plural: string; g: "m" | "f" } | undefined;
  let qualifier = "";
  let tail = rest.join(" ");
  if (first === "Technic" && PART_WORDS_FR[rest[0]]) {
    // « Technic Beam 5 » → « poutre Technic 5 »
    w = PART_WORDS_FR[rest[0]];
    qualifier = " Technic";
    tail = rest.slice(1).join(" ");
  } else if (first === "Minifig" && MINIFIG_WORDS_FR[rest[0]]) {
    // « Minifig Torso with Classic Space Pattern » → « torse de figurine »
    w = MINIFIG_WORDS_FR[rest[0]];
    tail = rest.slice(1).join(" ");
  } else {
    w = PART_WORDS_FR[first];
  }

  // inconnu : on garde le nom LDraw (en anglais), invariable
  if (!w) return { one: clean, many: clean, full: clean, gender: "m" };

  const dims = dimensionsOf(tail);
  const short = (noun: string) => `${noun}${qualifier}${dims ? ` ${dims}` : ""}`;
  return { one: short(w.word), many: short(w.plural), full: `${w.word}${qualifier} ${tail}`.trim(), gender: w.g };
}

/** Couleur accordée : « jaune » / « jaunes », « blanche » / « blanches », « gris clair » invariable. */
export function frenchColour(colourName: string, gender: "m" | "f", plural: boolean): string {
  const c = COLOURS_FR[colourName];
  if (!c) return colourName.replace(/_/g, " ").toLowerCase();
  const base = gender === "f" ? c.f : c.m;
  if (!plural || c.inv) return base;
  // seul le premier mot s'accorde : « bleu clair transparent » reste ainsi ; « rouge transparente » → « rouges transparentes »
  return base
    .split(" ")
    .map((w, i, all) => (i === 0 || (all.length > 1 && /^transparent/.test(w)) ? (/[sx]$/.test(w) ? w : `${w}s`) : w))
    .join(" ");
}

/** Nom anglais : la description LDraw nettoyée, invariable. */
const englishPartName = (description: string): FrenchName => {
  const clean = cleanDescription(description);
  return { one: clean, many: clean, full: clean, gender: "m" };
};

/** Couleur dans la langue des consignes : accordée en français, nom LDraw en minuscules en anglais. */
export function colourLabel(colourName: string, gender: "m" | "f", plural: boolean, lang: Lang = "fr"): string {
  return lang === "fr" ? frenchColour(colourName, gender, plural) : colourName.replace(/_/g, " ").toLowerCase();
}

/** Regroupe les pièces d'une étape par numéro et couleur, dans l'ordre où elles apparaissent. */
export function groupParts(parts: Object3D[], info: ModelText, lang: Lang = "fr"): PartGroup[] {
  const groups = new Map<string, PartGroup>();
  for (const p of parts) {
    const file = loaderName(String(p.userData.fileName ?? ""));
    const colourCode = colourCodeOf(p);
    const key = `${file}#${colourCode}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
      continue;
    }
    const description = info.descriptions.get(file) ?? file.replace(/^parts\//, "").replace(/\.dat$/, "");
    const { one, many, full, gender } = lang === "fr" ? frenchPartName(description) : englishPartName(description);
    const colour = info.colours.get(colourCode);
    groups.set(key, {
      key,
      file,
      number: file.replace(/^parts\//, "").replace(/\.dat$/i, ""),
      colourCode,
      colourName: colour?.name ?? "",
      hex: colour?.hex ?? null,
      count: 1,
      name: { one, many, full },
      gender,
      sample: p,
    });
  }
  return [...groups.values()];
}

const join = (items: string[], lang: Lang) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${lang === "fr" ? "et" : "and"} ${items.at(-1)}`);

export function describeGroup(g: PartGroup, lang: Lang = "fr"): string {
  const plural = g.count > 1;
  const name = plural ? g.name.many : g.name.one;
  if (lang === "en") return `${g.count} ${g.colourName ? `${colourLabel(g.colourName, g.gender, plural, "en")} ` : ""}${name}`;
  const colour = g.colourName ? ` ${frenchColour(g.colourName, g.gender, plural)}` : "";
  return `${g.count} ${name}${colour}`;
}

/** Consigne complète d'une étape. `letterOf` donne la lettre d'un sous-ensemble posé. */
export function stepInstruction(step: Step, info: ModelText, letterOf: (assembly: Object3D) => string | undefined, lang: Lang = "fr"): string {
  // deux pièces différentes au même nom français (bras gauche et bras droit) se disent ensemble : « 2 bras »
  const merged = new Map<string, PartGroup>();
  for (const g of groupParts(step.parts, info, lang)) {
    const key = `${g.name.one}#${g.colourName}`;
    const m = merged.get(key);
    if (m) merged.set(key, { ...m, count: m.count + g.count });
    else merged.set(key, g);
  }
  const bits = [...merged.values()].map((g) => describeGroup(g, lang));
  const sentences: string[] = [];
  if (bits.length) sentences.push(lang === "fr" ? `Ajoute ${join(bits, lang)}.` : `Add ${join(bits, lang)}.`);

  const counts = new Map<string, number>();
  for (const a of step.assemblies) {
    const l = letterOf(a) ?? "?";
    counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  for (const [l, n] of counts) {
    if (lang === "fr") sentences.push(n > 1 ? `Pose les ${n} sous-ensembles ${l}.` : `Pose le sous-ensemble ${l}.`);
    else sentences.push(n > 1 ? `Place the ${n} sub-assemblies ${l}.` : `Place sub-assembly ${l}.`);
  }
  return sentences.join(" ");
}
