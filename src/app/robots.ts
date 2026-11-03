import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Consignes aux robots, servies à la racine de klods.app : tout est permis sauf la page de travail du moteur. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = new URL(SITE_URL).pathname.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: [`${base}/essai/`] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
