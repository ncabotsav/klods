import { ANALYTICS_TOKEN } from "@/lib/site";

/**
 * Mesure d'audience Cloudflare Web Analytics : sans cookie ni identifiant. Posée seulement si le jeton
 * est fourni au build (NEXT_PUBLIC_CF_ANALYTICS_TOKEN, sur Cloudflare) ; la CSP autorise son domaine.
 */
export default function Analytics() {
  if (!ANALYTICS_TOKEN) return null;
  return <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: ANALYTICS_TOKEN, spa: false })} />;
}
