import type { Metadata } from "next";
import FeedbackPage from "@/components/FeedbackPage";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.feedback.title, description: fr.feedback.lead, robots: { index: false }, alternates: { canonical: "/retours/" } };

export default function Page() {
  return <FeedbackPage />;
}
