import TextView, { textMetadata } from "@/views/TextView";

export const metadata = textMetadata("privacy", "en");

export default function Page() {
  return <TextView page="privacy" locale="en" />;
}
