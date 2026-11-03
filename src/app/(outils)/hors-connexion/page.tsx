import type { Metadata } from "next";
import OfflinePage from "@/components/OfflinePage";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.offline.title, robots: { index: false, follow: false } };

/** Montrée par le service worker quand une page demandée n'est ni sur le réseau ni en cache. */
export default function Page() {
  return <OfflinePage />;
}
