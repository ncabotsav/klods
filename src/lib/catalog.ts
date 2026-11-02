import { z } from "zod";

/**
 * Format de public/data/sets.json, produit par `npm run data:index` et lu par le site.
 * Le même schéma valide le fichier à l'écriture (scripts) et à la lecture (site).
 */

/**
 * État d'un modèle après le contrôle :
 * - ok : se charge, a de vraies étapes, rien ne manque
 * - incomplet : se charge, mais l'OMR signale des pièces manquantes ou une référence est introuvable
 * - sans-etapes : se charge, mais le fichier n'est pas découpé en étapes (une seule étape)
 * - echec : ne se charge pas, ou ne contient aucune pièce
 */
export const ModelStatus = z.enum(["ok", "incomplet", "sans-etapes", "echec"]);
export type ModelStatus = z.infer<typeof ModelStatus>;

export const ModelEntry = z.object({
  slug: z.string(),
  name: z.string(),
  main: z.boolean(),
  /** Auteur du fichier LDraw, à citer sur la fiche (licence CC BY). */
  author: z.string(),
  /** Chemin du fichier packé et compressé, relatif à la racine du site (« data/models/8094-1/principal.mpd.gz »). */
  file: z.string(),
  bytes: z.number().int().nonnegative(),
  bytesGz: z.number().int().nonnegative(),
  steps: z.number().int().nonnegative(),
  parts: z.number().int().nonnegative(),
  uniqueParts: z.number().int().nonnegative(),
  status: ModelStatus,
  missingParts: z.boolean(),
  missingPatterns: z.boolean(),
  missingStickers: z.boolean(),
  /** Références introuvables dans le fichier et dans la bibliothèque. */
  missingFiles: z.number().int().nonnegative(),
});
export type ModelEntry = z.infer<typeof ModelEntry>;

export const SetEntry = z.object({
  /** Numéro du set, par exemple « 8094-1 ». */
  number: z.string(),
  name: z.string(),
  /** Thème de premier niveau (« Technic »), puis le chemin complet (« Technic › Competition »). */
  theme: z.string().nullable(),
  themePath: z.array(z.string()),
  year: z.number().int().nullable(),
  /** Nombre de pièces annoncé par Rebrickable pour le set (toutes boîtes comprises). */
  setParts: z.number().int().nullable(),
  omrId: z.number().int(),
  models: z.array(ModelEntry),
});
export type SetEntry = z.infer<typeof SetEntry>;

export const SetsIndex = z.object({
  generatedAt: z.string(),
  ldrawLibrary: z.string(),
  sets: z.array(SetEntry),
});
export type SetsIndex = z.infer<typeof SetsIndex>;

/** Nom de dossier ou de fichier sûr pour une URL : minuscules, sans accents, tirets. */
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "modele";

/** Modèles qu'on peut ouvrir : tout sauf les échecs de chargement. */
export const playableModels = (set: SetEntry) => set.models.filter((m) => m.status !== "echec");

/** Modèle à ouvrir par défaut : le principal s'il est jouable, sinon le premier jouable. */
export const defaultModel = (set: SetEntry) => {
  const models = playableModels(set);
  return models.find((m) => m.main) ?? models[0];
};

/** Lien vers la notice officielle : le numéro sans le suffixe de version (« 4915-1 » → « 4915 »). */
export const officialManualUrl = (number: string) =>
  `https://www.lego.com/fr-fr/service/building-instructions/${encodeURIComponent(number.replace(/-\d+$/, ""))}`;

/** Service des pièces manquantes du fabricant. */
export const MISSING_PARTS_URL = "https://www.lego.com/fr-fr/service/replacementparts";

/**
 * Durée de montage estimée, en minutes, arrondie à 5 minutes : environ 7 secondes par pièce,
 * plus une minute par étape pour lire et vérifier. Une indication, pas une promesse.
 */
export const estimateMinutes = (model: Pick<ModelEntry, "parts" | "steps">) =>
  Math.max(5, Math.round((model.parts * 7 + model.steps * 60) / 60 / 5) * 5);
