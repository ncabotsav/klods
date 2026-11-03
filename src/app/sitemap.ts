import type { MetadataRoute } from "next";
import { allSets, allThemes } from "@/lib/catalog-server";
import { SITE_URL } from "@/lib/site";

/** Plan du site pour les moteurs de recherche : les pages fixes, les thèmes et chaque fiche de set. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (p: string) => `${SITE_URL}${p}`;
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/catalogue/"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/a-propos/"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/credits/"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/confidentialite/"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/conditions/"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/mentions-legales/"), changeFrequency: "yearly", priority: 0.2 },
    ...allThemes().map((t) => ({ url: url(`/catalogue/${t.slug}/`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...allSets().map((s) => ({ url: url(`/set/${s.number}/`), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
