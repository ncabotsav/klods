import TextView, { textMetadata } from "@/views/TextView";

export const metadata = textMetadata("terms", "en");

export default function Page() {
  return <TextView page="terms" locale="en" />;
}
