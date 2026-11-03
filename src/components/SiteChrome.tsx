import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import SkipLink from "./SkipLink";
import { GITHUB_REPO } from "@/lib/site";

/** Nombre d'étoiles du dépôt, lu une fois au build (rien si GitHub ne répond pas). */
async function githubStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const n = (await res.json()).stargazers_count;
    return typeof n === "number" ? n : null;
  } catch {
    return null;
  }
}

/** Habillage commun des pages : lien d'évitement, en-tête, contenu, pied de page (textes dans la langue de la page). */
export default async function SiteChrome({ children }: { children: ReactNode }) {
  const stars = await githubStars();
  return (
    <>
      <SkipLink />
      <SiteHeader stars={stars} />
      <main id="contenu">{children}</main>
      <SiteFooter />
    </>
  );
}
