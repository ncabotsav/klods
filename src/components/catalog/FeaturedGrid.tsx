"use client";

import { useEffect, useState } from "react";
import { SetGrid } from "./SetCard";
import type { SearchEntry } from "@/lib/search";
import type { Locale } from "@/i18n";
import { pickRandom } from "@/lib/random";

/**
 * Sets d'un thème sur l'accueil : la page construite montre les premiers de la réserve (moteurs de
 * recherche, premier affichage), puis le navigateur en tire d'autres au hasard, à chaque visite.
 * Les cartes ont la même taille : le changement ne fait pas bouger la page.
 */
export default function FeaturedGrid({ locale, pool, count = 4, label }: { locale: Locale; pool: SearchEntry[]; count?: number; label: string }) {
  const [shown, setShown] = useState(() => pool.slice(0, count));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tirage au hasard, seulement dans le navigateur
    setShown(pickRandom(pool, count));
  }, [pool, count]);
  return <SetGrid locale={locale} entries={shown} label={label} />;
}
