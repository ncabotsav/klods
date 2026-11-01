import type { NextConfig } from "next";

/*
 * Klods est un site statique (`output: "export"`) tant qu'il vit sur GitHub Pages.
 * Sur Pages, il est servi depuis /klods : la CI fixe NEXT_PUBLIC_BASE_PATH=/klods.
 * En local et sur un domaine à lui, la variable reste vide.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // GitHub Pages sert /catalogue/index.html pour /catalogue/ : un dossier par page évite les 404
  trailingSlash: true,
  // pas d'optimisation d'images à la volée sans serveur
  images: { unoptimized: true },
  // AGENTS.md est le nôtre : `next dev` ne doit pas le réécrire
  agentRules: false,
};

export default nextConfig;
