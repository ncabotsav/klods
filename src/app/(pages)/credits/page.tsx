import CreditsView, { creditsMetadata } from "@/views/CreditsView";

export const metadata = creditsMetadata("fr");

export default function Page() {
  return <CreditsView locale="fr" />;
}
