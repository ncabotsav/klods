import type { Metadata, Viewport } from "next";
import "./globals.css";
import { archivo, atkinson, plexMono } from "./fonts";
import ServiceWorker from "@/components/ServiceWorker";
import Analytics from "@/components/Analytics";
import { siteMetadata } from "@/lib/site-metadata";
import { THEME_SCRIPT } from "@/lib/theme";

/*
 * Mise en page racine, commune aux deux langues. L'habillage (en-tête, pied de page) et la langue
 * viennent des groupes de pages :
 * - (pages) : pages françaises qu'on trouve par un moteur de recherche, à la racine ;
 * - en : leurs versions anglaises, sous /en ;
 * - (outils) : pages communes (montage, impression, atelier, retours, hors connexion), dans la langue
 *   choisie dans le navigateur.
 * La page construite est déclarée en français ; une page anglaise porte lang="en" sur son contenu,
 * et la langue de la balise html suit celle de la page dès son chargement.
 */
export const metadata: Metadata = siteMetadata("fr");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // la barre du navigateur ne lit pas les variables CSS : mêmes valeurs que --bg dans globals.css
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e151c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme peut être posé par THEME_SCRIPT avant React : pas d'alerte d'hydratation pour lui
    <html lang="fr" className={`${archivo.variable} ${atkinson.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* thème choisi, posé avant le premier affichage (pas d'éclair de l'autre thème) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
