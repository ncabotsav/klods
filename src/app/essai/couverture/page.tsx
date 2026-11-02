import type { Metadata } from "next";
import CoverDraw from "./CoverDraw";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.covers.title, robots: { index: false, follow: false } };

/** Page de dessin des couvertures, ouverte par `npm run data:covers` : pas dans le menu, pas indexée. */
export default function CoverPage() {
  return <CoverDraw />;
}
