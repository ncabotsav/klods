import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.soon.catalogue.title };

export default function CataloguePage() {
  return <ComingSoon title={fr.soon.catalogue.title} body={fr.soon.catalogue.body} />;
}
