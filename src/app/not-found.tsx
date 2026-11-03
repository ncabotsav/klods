import type { Metadata } from "next";
import SiteChrome from "@/components/SiteChrome";
import NotFoundContent from "@/components/NotFoundContent";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.notFound.title, robots: { index: false, follow: true } };

/**
 * Page 404 (un seul fichier pour tout le site) : dans la langue choisie dans le navigateur, ou celle
 * de l'adresse demandée (/en/…). Reconnaît un numéro de set absent et renvoie vers sa notice officielle.
 */
export default function NotFound() {
  return (
    <LocaleProvider>
      <SiteChrome>
        <NotFoundContent />
      </SiteChrome>
    </LocaleProvider>
  );
}
