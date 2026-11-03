import TextView, { textMetadata } from "@/views/TextView";

export const metadata = textMetadata("terms", "fr");

export default function Page() {
  return <TextView page="terms" locale="fr" />;
}
