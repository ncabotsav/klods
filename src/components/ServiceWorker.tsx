"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/site";

/** Enregistre le service worker (public/sw.js) sur le site construit : pas en développement. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {
      // sans service worker, le site marche quand même, avec du réseau
    });
  }, []);
  return null;
}
