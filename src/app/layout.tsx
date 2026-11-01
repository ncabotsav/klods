import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { fr } from "@/i18n/fr";
import { SITE_URL } from "@/lib/site";

const title = fr.site.title;

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: { default: title, template: `%s · ${fr.site.name}` },
  description: fr.site.description,
  applicationName: fr.site.name,
  // site encore vide : pas d'indexation avant la préversion (sprint 4)
  robots: { index: false, follow: false },
  openGraph: { type: "website", siteName: fr.site.name, title, description: fr.site.description, locale: "fr_FR" },
  twitter: { card: "summary_large_image", title, description: fr.site.description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e151c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <a href="#contenu" className="skip">
          {fr.nav.skip}
        </a>
        <SiteHeader />
        <main id="contenu">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
