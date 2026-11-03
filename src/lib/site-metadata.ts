import type { Metadata } from "next";
import { dictFor, type Locale } from "@/i18n";
import { SITE_URL } from "@/lib/site";

/** Métadonnées communes d'une langue (titre par défaut, description, carte de partage). */
export function siteMetadata(locale: Locale): Metadata {
  const t = dictFor(locale);
  const title = t.site.title;
  return {
    metadataBase: new URL(`${SITE_URL}/`),
    title: { default: title, template: `%s · ${t.site.name}` },
    description: t.site.description,
    applicationName: t.site.name,
    openGraph: {
      type: "website",
      siteName: t.site.name,
      title,
      description: t.site.description,
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      alternateLocale: locale === "fr" ? ["en_GB"] : ["fr_FR"],
      images: [{ url: "/partage.png", width: 1200, height: 630, alt: t.site.name }],
    },
    twitter: { card: "summary_large_image", title, description: t.site.description, images: ["/partage.png"] },
  };
}
