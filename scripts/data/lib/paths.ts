import path from "node:path";

/** Racine du dépôt (les scripts se lancent depuis là avec `npm run`). */
export const ROOT = process.cwd();

/** Téléchargements bruts : jamais commités (voir .gitignore). */
export const RAW = path.join(ROOT, "data", "raw");
export const RAW_OMR = path.join(RAW, "omr");
export const RAW_OMR_PAGES = path.join(RAW_OMR, "pages");
export const RAW_OMR_MODELS = path.join(RAW_OMR, "models");
export const RAW_LDRAW = path.join(RAW, "ldraw");
export const LDRAW_LIBRARY = path.join(RAW_LDRAW, "ldraw");
export const RAW_REBRICKABLE = path.join(RAW, "rebrickable");

/** Résultats intermédiaires des scripts (fiches OMR lues, rapports) : jamais commités non plus. */
export const BUILD = path.join(ROOT, "data", "build");
export const OMR_SETS_JSON = path.join(BUILD, "omr-sets.json");
export const PACK_REPORT = path.join(BUILD, "pack-report.json");
export const CHECK_REPORT = path.join(BUILD, "check-report.json");
export const CHECK_SUMMARY = path.join(BUILD, "check-summary.md");

/** Fichiers publiés avec le site (servis par GitHub Pages sous /data). */
export const PUBLIC_DATA = path.join(ROOT, "public", "data");
export const PUBLIC_MODELS = path.join(PUBLIC_DATA, "models");
export const SETS_INDEX = path.join(PUBLIC_DATA, "sets.json");

/** Fichier LDraw d'un modèle OMR dans le cache ; la version fait partie du nom, un fichier mis à jour est donc retéléchargé. */
export const omrModelFile = (m: { fileId: number; version: string; fileName: string }) =>
  path.join(RAW_OMR_MODELS, `${m.fileId}-${m.version || "0"}${path.extname(m.fileName).toLowerCase()}`);

/** Liste de départ des identifiants OMR, commitée. */
export const OMR_IDS_FILE = path.join(ROOT, "data", "omr-ids.txt");
