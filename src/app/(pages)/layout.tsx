import SiteChrome from "@/components/SiteChrome";
import { LocaleProvider } from "@/i18n/LocaleProvider";

/** Pages françaises (accueil, catalogue, fiches, pages de texte). */
export default function FrenchLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="fr">
      <SiteChrome>{children}</SiteChrome>
    </LocaleProvider>
  );
}
