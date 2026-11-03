import type { Metadata } from "next";
import WorkshopApp from "@/components/workshop/WorkshopApp";
import { fr } from "@/i18n/fr";

// l'atelier ne montre que ce qui est gardé dans le navigateur : rien à indexer
export const metadata: Metadata = { title: fr.workshop.title, description: fr.workshop.lead, robots: { index: false }, alternates: { canonical: "/atelier/" } };

export default function WorkshopPage() {
  return <WorkshopApp />;
}
