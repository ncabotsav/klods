"use client";

import { useState } from "react";
import type { ShareInfo } from "@/lib/share-card";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeHref } from "@/i18n";

/**
 * Bouton « Partager » d'un set terminé : dessine la carte au clic (module chargé à la demande),
 * puis ouvre le menu de partage du système ou télécharge l'image. Le résultat est annoncé.
 */
export default function ShareButton({ info, label, ariaLabel, className = "btn" }: { info: ShareInfo; label?: string; ariaLabel?: string; className?: string }) {
  const { t: fr, locale } = useLocale();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    setStatus(fr.share.preparing);
    try {
      const { shareBuild } = await import("@/lib/share-card");
      // le lien partagé mène à la fiche du set, dans la langue de la page
      const result = await shareBuild(info, fr, localeHref(locale, `/set/${info.number}/`));
      setStatus(result === "shared" ? fr.share.shared : result === "downloaded" ? fr.share.downloaded : "");
    } catch {
      setStatus(fr.share.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={share} disabled={busy} aria-label={ariaLabel}>
        {label ?? fr.share.button}
      </button>
      <span role="status" className="share-status">
        {status}
      </span>
    </>
  );
}
