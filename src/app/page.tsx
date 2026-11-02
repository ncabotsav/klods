import styles from "./home.module.css";
import ResumeBuilds from "@/components/ResumeBuilds";
import { fr } from "@/i18n/fr";

export default function Home() {
  const t = fr.home;
  return (
    <div className={`wrap ${styles.page}`}>
      <section className={styles.hero}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <p className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          {t.status}
        </p>
      </section>

      <ResumeBuilds />

      <section className={styles.how} aria-labelledby="comment">
        <h2 id="comment" className={styles.howTitle}>
          {t.howTitle}
        </h2>
        <ol className={styles.steps}>
          {t.steps.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
