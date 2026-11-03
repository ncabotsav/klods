"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./FeedbackForm.module.css";
import { FEEDBACK_KINDS, MESSAGE_MAX, feedbackContext, parseFeedback, type FeedbackError, type FeedbackKind } from "@/lib/feedback";
import { asset, buildPageHref, CONTACT_EMAIL } from "@/lib/site";
import { useT } from "@/i18n/LocaleProvider";

type Ctx = ReturnType<typeof feedbackContext>;
type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; error: FeedbackError | "limit" | "network" };

/** Lien de retour vers la page d'où l'on vient. */
function backHref(ctx: Ctx): string | null {
  if (ctx.set) {
    const q = new URLSearchParams();
    if (ctx.model) q.set("modele", ctx.model);
    if (ctx.step) q.set("etape", String(ctx.step));
    return buildPageHref(`/set/${ctx.set}/monter/${q.size ? `?${q}` : ""}`);
  }
  return ctx.page ? asset(ctx.page) : null;
}

/**
 * Formulaire de retour : type, message, adresse facultative. Le contexte (set, modèle, étape, page)
 * vient de l'adresse et part avec le message. Envoi à /api/retours (Worker Cloudflare).
 */
export default function FeedbackForm() {
  const t = useT().feedback;
  const [ctx, setCtx] = useState<Ctx>({});
  const [kind, setKind] = useState<FeedbackKind | "">("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // le contexte n'est connu qu'au navigateur (page statique)
  useEffect(() => {
    const c = feedbackContext(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique de l'adresse au montage
    setCtx(c);
    if (c.kind) setKind(c.kind);
  }, []);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
    if (state.kind === "sent") doneRef.current?.focus();
  }, [state]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      kind,
      message: String(form.get("message") ?? ""),
      email: String(form.get("email") ?? ""),
      website: String(form.get("website") ?? ""),
      ...ctx,
    };
    const check = parseFeedback(body);
    if (!check.ok) {
      setState({ kind: "error", error: check.error });
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch(asset("/api/retours"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 201) setState({ kind: "sent" });
      else if (res.status === 429) setState({ kind: "error", error: "limit" });
      else {
        const data = (await res.json().catch(() => ({}))) as { error?: FeedbackError };
        setState({ kind: "error", error: data.error && data.error in t.errors ? data.error : "network" });
      }
    } catch {
      setState({ kind: "error", error: "network" });
    }
  };

  const back = backHref(ctx);
  const about = [ctx.set && t.aboutSet(ctx.set), ctx.model && ctx.model !== "principal" && t.aboutModel(ctx.model), ctx.step && t.aboutStep(ctx.step), !ctx.set && ctx.page && t.aboutPage(ctx.page)].filter(Boolean);

  if (state.kind === "sent") {
    return (
      <div className={styles.done}>
        <h2 ref={doneRef} tabIndex={-1} className={styles.doneTitle}>
          {t.sentTitle}
        </h2>
        <p>{t.sentBody}</p>
        <div className={styles.actions}>
          {back && (
            <a className="btn btn-primary" href={back}>
              {t.back}
            </a>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              setState({ kind: "idle" });
              setKind("");
            }}
          >
            {t.another}
          </button>
        </div>
      </div>
    );
  }

  const error = state.kind === "error" ? state.error : null;
  const errorText = error === "network" ? t.errors.network(CONTACT_EMAIL) : error ? t.errors[error] : "";
  const invalid = (field: FeedbackError) => (error === field ? { "aria-invalid": true as const, "aria-errormessage": "retour-erreur" } : {});

  return (
    <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
      {about.length > 0 && (
        <p className={styles.about}>
          {t.about} <strong>{about.join(", ")}</strong>
        </p>
      )}

      <fieldset className={styles.kinds} {...(error === "kind" ? { "aria-describedby": "retour-erreur" } : {})}>
        <legend className={styles.label}>{t.kindLegend}</legend>
        {FEEDBACK_KINDS.map((k) => (
          <label key={k} className={styles.kind}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} required />
            <span>{t.kinds[k]}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="retour-message" className={styles.label}>
          {t.message}
        </label>
        <p id="retour-message-aide" className={styles.hint}>
          {t.messageHint}
        </p>
        <textarea id="retour-message" name="message" rows={6} maxLength={MESSAGE_MAX} required aria-describedby="retour-message-aide" {...invalid("message")} />
      </div>

      <div className={styles.field}>
        <label htmlFor="retour-email" className={styles.label}>
          {t.email}
        </label>
        <p id="retour-email-aide" className={styles.hint}>
          {t.emailHint}
        </p>
        <input id="retour-email" name="email" type="email" autoComplete="email" aria-describedby="retour-email-aide" {...invalid("email")} />
      </div>

      {/* piège à robots : invisible et hors du parcours clavier, les humains le laissent vide */}
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor="retour-site">{t.trap}</label>
        <input id="retour-site" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p id="retour-erreur" ref={errorRef} tabIndex={-1} className={styles.error} role="alert" hidden={!error}>
        {errorText}
      </p>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? t.sending : t.send}
        </button>
        {back && (
          <a className="btn" href={back}>
            {t.back}
          </a>
        )}
      </div>

      <p className={styles.small}>
        {t.kept} <Link href="/confidentialite/">{t.privacy}</Link>
      </p>
    </form>
  );
}
