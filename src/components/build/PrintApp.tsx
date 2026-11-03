"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Print.module.css";
import { stepCallouts, stepText, type Callout } from "@/components/player/callouts";
import { useModel } from "@/components/player/useModel";
import { defaultModel, playableModels, type SetEntry } from "@/lib/catalog";
import { useLocale } from "@/i18n/LocaleProvider";
import { hasWebGL } from "@/lib/webgl";

type Page = { index: number; image: string; callouts: Callout[]; text: string; assembly: string | null; repeat: number };

/** Vue impression : chaque étape dessinée une fois, avec ses pièces et sa consigne, en blocs A4. */
export default function PrintApp({ set }: { set: SetEntry }) {
  const { t: fr, locale } = useLocale();
  const params = useSearchParams();
  const model = playableModels(set).find((m) => m.slug === params.get("modele")) ?? defaultModel(set);
  const state = useModel(model.file, model.bytes);
  const hostRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state.status !== "ready" || !hostRef.current) return;
    const loaded = state.loaded;
    // sans WebGL, la notice s'imprime quand même : consignes et pièces, sans les vues 3D
    const stage = hasWebGL() ? new loaded.engine.Stage(hostRef.current, { preserveDrawingBuffer: true }) : null;
    stage?.setModel(loaded.model, loaded.plan);
    let cancelled = false;
    (async () => {
      const out: Page[] = [];
      const n = loaded.plan.steps.length;
      for (let i = 0; i < n && !cancelled; i++) {
        stage?.showStep(i, false);
        const step = loaded.plan.steps[i];
        out.push({ index: i, image: stage?.snapshot() ?? "", callouts: stepCallouts(loaded, i, locale, fr), text: stepText(loaded, i, locale), assembly: step.assembly, repeat: step.repeat });
        // une image à la fois, en laissant la page respirer
        if (i % 4 === 3) {
          setPages([...out]);
          await new Promise((r) => requestAnimationFrame(r));
        }
      }
      if (!cancelled) {
        setPages(out);
        setDone(true);
      }
      stage?.dispose();
    })();
    return () => {
      cancelled = true;
    };
  }, [state, locale, fr]);

  const total = state.status === "ready" ? state.loaded.plan.steps.length : model.steps;

  return (
    <div className={`wrap ${styles.print}`}>
      <div className={`${styles.head} noPrint`}>
        <div>
          <p className="eyebrow">
            {set.number} · {set.name}
          </p>
          <h1 className={styles.title}>{fr.build.print.title}</h1>
          <p className={styles.muted}>{done ? fr.build.print.lead : fr.build.print.preparing(pages.length, total)}</p>
        </div>
        <div className={styles.actions}>
          <a className="btn" href={`../monter/${params.get("modele") ? `?modele=${encodeURIComponent(model.slug)}` : ""}`}>
            {fr.build.print.back}
          </a>
          <button type="button" className="btn btn-primary" disabled={!done} onClick={() => window.print()}>
            {fr.build.print.print}
          </button>
        </div>
      </div>

      <p className={styles.printTitle}>
        {set.name} ({set.number}), {model.main ? fr.build.cover.mainModel : model.name}
      </p>

      <ol className={styles.pages}>
        {pages.map((p) => (
          <li key={p.index} className={styles.page}>
            <div className={styles.pageHead}>
              <span className={styles.no}>{p.index + 1}</span>
              {p.assembly && (
                <span className={styles.assembly}>
                  {fr.player.assembly} {p.assembly}
                  {p.repeat > 1 && ` · ${fr.player.buildTimes(p.repeat)}`}
                </span>
              )}
            </div>
            {p.callouts.length > 0 && (
              <ul className={styles.callout}>
                {p.callouts.map((c) => (
                  <li key={c.key}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- image générée dans le navigateur */}
                    <img src={c.url} alt="" width={44} height={44} />
                    <b>{c.count}×</b>
                  </li>
                ))}
              </ul>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- image générée dans le navigateur */}
            {p.image ? <img className={styles.shot} src={p.image} alt="" /> : null}
            <p className={styles.text}>{p.text}</p>
          </li>
        ))}
      </ol>

      <p className={styles.credit}>{fr.build.cover.author(model.author)}</p>

      {/* scène de dessin hors écran */}
      <div ref={hostRef} className={styles.host} aria-hidden="true" />
    </div>
  );
}
