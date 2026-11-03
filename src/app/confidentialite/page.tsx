import type { Metadata } from "next";
import TextPage from "@/components/TextPage";
import { fr } from "@/i18n/fr";

const t = fr.privacy;

export const metadata: Metadata = { title: t.title, description: t.lead, alternates: { canonical: "/confidentialite/" } };

export default function PrivacyPage() {
  return <TextPage content={t} />;
}
