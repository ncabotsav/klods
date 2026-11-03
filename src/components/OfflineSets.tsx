"use client";

import { useEffect, useState } from "react";
import styles from "@/components/TextPage.module.css";
import type { SearchEntry } from "@/lib/search";
import { asset } from "@/lib/site";
import { useT } from "@/i18n/LocaleProvider";

type Item = { number: string; model: string; name: string };

/** Sets gardés par le service worker (cache « klods-modeles ») : ceux qu'on peut rouvrir sans réseau. */
async function offlineSets(): Promise<Item[]> {
  if (!("caches" in window)) return [];
  const cache = await caches.open("klods-modeles");
  const keys = await cache.keys();
  let names = new Map<string, string>();
  try {
    const index: SearchEntry[] = await (await fetch(asset("/recherche.json"))).json();
    names = new Map(index.map((e) => [e.n, e.t]));
  } catch {
    // sans l'index, on affiche les numéros
  }
  return keys.flatMap((req) => {
    const m = /\/data\/models\/([^/]+)\/([^/]+)\.mpd\.gz$/.exec(new URL(req.url).pathname);
    return m ? [{ number: m[1], model: m[2], name: names.get(m[1]) ?? m[1] }] : [];
  });
}

export default function OfflineSets() {
  const fr = useT();
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    let alive = true;
    offlineSets().then(
      (list) => alive && setItems(list),
      () => alive && setItems([]),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!items) return <p className={styles.small}>{fr.offline.loading}</p>;
  if (!items.length) return <p>{fr.offline.none}</p>;
  return (
    <ul className={styles.links}>
      {items.map((it) => (
        <li key={`${it.number}/${it.model}`}>
          {/* lien classique : la page entière vient du cache, sans passer par le réseau */}
          <a href={asset(`/set/${it.number}/monter/${it.model === "principal" ? "" : `?modele=${encodeURIComponent(it.model)}`}`)}>
            {fr.offline.item(it.number, it.name)}
          </a>
        </li>
      ))}
    </ul>
  );
}
