import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Consignes aux robots. Sur GitHub Pages, le site vit sous /klods : les robots lisent le robots.txt
 * de la racine du domaine, pas celui-ci. Il servira tel quel sur le domaine de Klods (sprint 7) ;
 * d'ici là, le sitemap se déclare dans la Search Console.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = new URL(SITE_URL).pathname.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: [`${base}/essai/`] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
