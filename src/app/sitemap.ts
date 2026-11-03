import type { MetadataRoute } from "next";
import { allSets, allThemes, themeIn } from "@/lib/catalog-server";
import { SITE_URL } from "@/lib/site";
import { TEXT_PAGES } from "@/lib/seo";

/**
 * Plan du site pour les moteurs de recherche : chaque page en français et en anglais, avec le lien
 * vers sa version dans l'autre langue (hreflang). Les outils (montage, atelier…) n'y sont pas.
 */
export const dynamic = "force-static";

type Entry = MetadataRoute.Sitemap[number];

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (p: string) => `${SITE_URL}${p}`;
  /** Une page dans les deux langues : deux entrées, chacune avec ses versions. */
  const pair = (fr: string, en: string, changeFrequency: Entry["changeFrequency"], priority: number): Entry[] => {
    const alternates = { languages: { fr: url(fr), en: url(`/en${en}`) } };
    return [
      { url: url(fr), changeFrequency, priority, alternates },
      { url: url(`/en${en}`), changeFrequency, priority, alternates },
    ];
  };
  return [
    ...pair("/", "/", "weekly", 1),
    ...pair("/catalogue/", "/catalogue/", "weekly", 0.9),
    ...pair(TEXT_PAGES.about.fr, TEXT_PAGES.about.en, "monthly", 0.3),
    ...pair(TEXT_PAGES.credits.fr, TEXT_PAGES.credits.en, "monthly", 0.3),
    ...pair(TEXT_PAGES.privacy.fr, TEXT_PAGES.privacy.en, "yearly", 0.2),
    ...pair(TEXT_PAGES.terms.fr, TEXT_PAGES.terms.en, "yearly", 0.2),
    ...pair(TEXT_PAGES.legal.fr, TEXT_PAGES.legal.en, "yearly", 0.2),
    ...allThemes("fr").flatMap((t) => pair(`/catalogue/${t.slug}/`, `/catalogue/${themeIn(t.slug, "fr", "en")?.slug ?? t.slug}/`, "weekly", 0.6)),
    ...allSets().flatMap((s) => pair(`/set/${s.number}/`, `/set/${s.number}/`, "monthly", 0.8)),
  ];
}
