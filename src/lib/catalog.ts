/**
 * Petites fonctions sur le catalogue, utilisables partout (site et scripts) sans charger zod :
 * le format de sets.json et sa validation sont dans catalog-schema.ts.
 */
import type { ModelEntry, SetEntry } from "./catalog-schema.ts";

export type { ModelEntry, ModelStatus, SetEntry, SetsIndex } from "./catalog-schema.ts";

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

/** Très gros modèle (plus de 6 Mo de texte LDraw) : l'ouverture prend du temps, surtout sur téléphone. */
export const isHeavy = (model: Pick<ModelEntry, "bytes">) => model.bytes > 6_000_000;

/** Service des pièces manquantes du fabricant. */
export const MISSING_PARTS_URL = "https://www.lego.com/fr-fr/service/replacementparts";

/**
 * Durée de montage estimée, en minutes, arrondie à 5 minutes : environ 7 secondes par pièce,
 * plus une minute par étape pour lire et vérifier. Une indication, pas une promesse.
 */
export const estimateMinutes = (model: Pick<ModelEntry, "parts" | "steps">) =>
  Math.max(5, Math.round((model.parts * 7 + model.steps * 60) / 60 / 5) * 5);
