import type { Metadata } from "next";
import { Suspense } from "react";
import Bench from "./Bench";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.bench.title, robots: { index: false, follow: false } };

/** Page de travail du moteur d'étapes : pas dans le menu, pas indexée. */
export default function BenchPage() {
  return (
    <div className="wrap" style={{ paddingBlock: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
      <div style={{ display: "grid", gap: "var(--space-2)" }}>
        <p className="eyebrow">{fr.bench.title}</p>
        <p style={{ color: "var(--muted)", maxWidth: "var(--measure)" }}>{fr.bench.lead}</p>
      </div>
      <Suspense fallback={null}>
        <Bench />
      </Suspense>
    </div>
  );
}
