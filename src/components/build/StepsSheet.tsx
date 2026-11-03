"use client";

import { useEffect, useRef } from "react";
import styles from "./BuildApp.module.css";
import { stepText } from "@/components/player/callouts";
import type { LoadedModel } from "@/components/player/useModel";
import { useLocale } from "@/i18n/LocaleProvider";

/** Planche de toutes les étapes : numéro, sous-ensemble et consigne ; on choisit une étape pour y aller. */
export default function StepsSheet({ loaded, current, onPick, onClose }: { loaded: LoadedModel; current: number; onPick: (i: number) => void; onClose: () => void }) {
  const { t: fr, locale } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    currentRef.current?.scrollIntoView({ block: "center" });
    currentRef.current?.focus();
  }, []);

  return (
    <dialog ref={dialogRef} className={`${styles.dialog} ${styles.sheet}`} onClose={onClose} aria-labelledby="sheet-title">
      <div className={styles.sheetHead}>
        <div>
          <h2 id="sheet-title" className={styles.subTitle}>
            {fr.build.steps.all}
          </h2>
          <p className={styles.muted}>{fr.build.steps.allLead}</p>
        </div>
        <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
          {fr.build.steps.close}
        </button>
      </div>
      <ol className={styles.stepList}>
        {loaded.plan.steps.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              ref={i === current ? currentRef : undefined}
              aria-current={i === current ? "step" : undefined}
              onClick={() => onPick(i)}
            >
              <span className={styles.stepNo}>{i + 1}</span>
              <span>
                {s.assembly && (
                  <span className={styles.stepAssembly}>
                    {fr.player.assembly} {s.assembly}
                  </span>
                )}
                {stepText(loaded, i, locale)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </dialog>
  );
}
