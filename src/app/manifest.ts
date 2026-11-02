import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/site";
import { fr } from "@/i18n/fr";

/** Installation sur l'écran d'accueil : nom, icônes, couleurs (mêmes valeurs que --accent et --bg). */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const base = `${BASE_PATH}/`;
  return {
    name: fr.site.title,
    short_name: fr.site.name,
    description: fr.site.description,
    lang: "fr",
    start_url: base,
    scope: base,
    display: "standalone",
    background_color: "#eef2f6",
    theme_color: "#0055bf",
    icons: [
      { src: `${BASE_PATH}/icons/icone-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE_PATH}/icons/icone-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE_PATH}/icons/icone-masquable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
