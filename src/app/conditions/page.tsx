import type { Metadata } from "next";
import TextPage from "@/components/TextPage";
import { fr } from "@/i18n/fr";

const t = fr.terms;

export const metadata: Metadata = { title: t.title, description: t.lead, alternates: { canonical: "/conditions/" } };

export default function TermsPage() {
  return <TextPage content={t} />;
}
