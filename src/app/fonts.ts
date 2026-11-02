import localFont from "next/font/local";

/*
 * Polices auto-hébergées (fichiers des paquets @fontsource, licence OFL), chargées par next/font :
 * préchargées dans le <head>, avec une police de repli ajustée pour éviter que la page saute.
 * Les familles sont exposées en variables CSS, reprises par les jetons de globals.css.
 */
export const archivo = localFont({
  src: "../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-archivo",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  adjustFontFallback: "Arial",
});

export const atkinson = localFont({
  src: [
    { path: "../../node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-atkinson",
  adjustFontFallback: "Arial",
});

export const plexMono = localFont({
  src: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-plex-mono",
  preload: false,
  adjustFontFallback: false,
});
