"use client";

import { useT } from "@/i18n/LocaleProvider";

/** Premier lien de la page, visible au clavier : aller directement au contenu. */
export default function SkipLink() {
  const fr = useT();
  return (
    <a href="#contenu" className="skip">
      {fr.nav.skip}
    </a>
  );
}
