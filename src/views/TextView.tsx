import type { Metadata } from "next";
import TextPage from "@/components/TextPage";
import { dictFor, type Locale } from "@/i18n";
import { bilingual, TEXT_PAGES } from "@/lib/seo";

/** Pages de texte sans partie propre : confidentialité, conditions, mentions légales. */
type Key = "privacy" | "terms" | "legal";

export const textMetadata = (key: Key, locale: Locale): Metadata => {
  const t = dictFor(locale)[key];
  return { title: t.title, description: t.lead, alternates: bilingual(locale, TEXT_PAGES[key]) };
};

export default function TextView({ page, locale }: { page: Key; locale: Locale }) {
  return <TextPage content={dictFor(locale)[page]} />;
}
