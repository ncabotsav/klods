/** Le dépôt GitHub du projet, affiché dans l'en-tête. */
export const GITHUB_REPO = "ncabotsav/klods";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

/** Préfixe des URL quand le site vit dans un sous-dossier (GitHub Pages : /klods). Vide en local. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Adresse publique du site, pour les cartes de partage, le sitemap et les liens absolus. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ncabotsav.github.io/klods").replace(/\/$/, "");

/**
 * Chemin d'un fichier de /public, préfixé par BASE_PATH.
 * `next/link` ajoute le préfixe tout seul, mais pas `fetch()` ni les balises `<img>` brutes.
 */
export const asset = (path: string) => `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
