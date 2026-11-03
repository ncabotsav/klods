import SiteChrome from "@/components/SiteChrome";
import { LocaleProvider } from "@/i18n/LocaleProvider";

/** Pages communes aux deux langues (montage, impression, atelier…) : la langue choisie dans le navigateur. */
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SiteChrome>{children}</SiteChrome>
    </LocaleProvider>
  );
}
