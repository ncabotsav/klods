import type { Metadata, Viewport } from "next";
import "./globals.css";
import { archivo, atkinson, plexMono } from "./fonts";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PreviewBanner from "@/components/PreviewBanner";
import ServiceWorker from "@/components/ServiceWorker";
import { fr } from "@/i18n/fr";
import { SITE_URL } from "@/lib/site";

const title = fr.site.title;

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: { default: title, template: `%s · ${fr.site.name}` },
  description: fr.site.description,
  applicationName: fr.site.name,
  openGraph: {
    type: "website",
    siteName: fr.site.name,
    title,
    description: fr.site.description,
    locale: "fr_FR",
    images: [{ url: "/partage.png", width: 1200, height: 630, alt: fr.site.name }],
  },
  twitter: { card: "summary_large_image", title, description: fr.site.description, images: ["/partage.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // la barre du navigateur ne lit pas les variables CSS : mêmes valeurs que --bg dans globals.css
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e151c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${archivo.variable} ${atkinson.variable} ${plexMono.variable}`}>
      <body>
        <a href="#contenu" className="skip">
          {fr.nav.skip}
        </a>
        <SiteHeader />
        <PreviewBanner />
        <main id="contenu">{children}</main>
        <SiteFooter />
        <ServiceWorker />
      </body>
    </html>
  );
}
