import type { Metadata } from "next";
import TextPage from "@/components/TextPage";
import { fr } from "@/i18n/fr";

const t = fr.legal;

export const metadata: Metadata = { title: t.title, description: t.lead, alternates: { canonical: "/mentions-legales/" } };

export default function LegalPage() {
  return <TextPage content={t} />;
}
