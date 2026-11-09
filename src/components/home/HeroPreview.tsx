"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HeroPreview.module.css";
import ModelViewer from "@/components/player/ModelViewer";
import { useModel } from "@/components/player/useModel";
import type { HeroSet } from "@/lib/catalog-server";
import { pickRandom } from "@/lib/random";
import { asset, buildPageHref } from "@/lib/site";
import { useT } from "@/i18n/LocaleProvider";
import { useWebGL } from "@/lib/webgl";

/** Durée d'une étape dans l'aperçu, puis pause sur le modèle fini qui tourne, avant de recommencer. */
const STEP_MS = 1700;
const DONE_MS = 4500;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Le set qui se monte : étape après étape, puis le modèle fini qui tourne, en boucle. */
function Player({ set, onReady }: { set: HeroSet; onReady: () => void }) {
  const state = useModel(set.file, set.bytes);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [still] = useState(reducedMotion);
  const ready = state.status === "ready";
  const steps = ready ? state.loaded.plan.steps.length : 0;

  useEffect(() => {
    if (ready) onReady();
  }, [ready, onReady]);

  useEffect(() => {
    if (!ready || still) return;
    const timer = window.setTimeout(
      () => {
        if (done) {
          setDone(false);
          setIndex(0);
        } else if (index >= steps - 1) setDone(true);
        else setIndex(index + 1);
      },
      done ? DONE_MS : STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [ready, still, done, index, steps]);

  if (!ready) return null;
  // mouvement réduit : le modèle fini, immobile
  const mode = still || done ? { kind: "all" as const, autoRotate: !still } : { kind: "step" as const, index, animate: true };
  return <ModelViewer loaded={state.loaded} mode={mode} className={styles.viewer} buttons={false} />;
}

/**
 * Aperçu 3D de l'accueil, à côté de la recherche : un vrai set du catalogue qui se monte tout seul.
 * D'abord sa couverture (dessinée par notre moteur), puis la vue 3D, chargée seulement quand l'aperçu
 * est visible et la page prête : elle ne retarde pas l'affichage de la page.
 */
export default function HeroPreview({ sets }: { sets: HeroSet[] }) {
  const t = useT().home.preview;
  const webgl = useWebGL();
  const [set, setSet] = useState(sets[0]);
  const [load, setLoad] = useState(false);
  const [shown, setShown] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tirage au hasard, seulement dans le navigateur
    if (sets.length > 1) setSet(pickRandom(sets, 1)[0]);
  }, [sets]);

  useEffect(() => {
    if (!webgl || !box.current) return;
    let idle = 0;
    const start = () => {
      idle = window.setTimeout(() => setLoad(true), 600);
    };
    const seen = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      seen.disconnect();
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
    });
    seen.observe(box.current);
    return () => {
      seen.disconnect();
      window.clearTimeout(idle);
      window.removeEventListener("load", start);
    };
  }, [webgl]);

  if (!set) return null;
  return (
    <figure className={styles.preview}>
      <div className={styles.frame} ref={box}>
        {/* eslint-disable-next-line @next/next/no-img-element -- site statique, pas d'optimisation d'images */}
        <img src={asset(`/data/covers/${set.number}.webp`)} alt={t.label(set.name)} width={640} height={480} className={`${styles.cover} ${shown ? styles.hidden : ""}`} decoding="async" />
        {load && (
          <div className={`${styles.live} ${shown ? styles.visible : ""}`}>
            <Player key={set.number} set={set} onReady={() => setShown(true)} />
          </div>
        )}
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.name}>{t.caption(set.number, set.name)}</span>
        <a className="btn" href={buildPageHref(`/set/${set.number}/monter/`)} aria-label={t.ctaLabel(set.name)}>
          {t.cta} →
        </a>
      </figcaption>
    </figure>
  );
}
