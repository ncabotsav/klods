import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.soon.workshop.title };

export default function WorkshopPage() {
  return <ComingSoon title={fr.soon.workshop.title} body={fr.soon.workshop.body} />;
}
