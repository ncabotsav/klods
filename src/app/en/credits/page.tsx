import CreditsView, { creditsMetadata } from "@/views/CreditsView";

export const metadata = creditsMetadata("en");

export default function Page() {
  return <CreditsView locale="en" />;
}
