import type { Metadata } from "next";
import SiteChrome from "@/components/SiteChrome";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { siteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = siteMetadata("en");

/** Pages anglaises (/en) : mêmes pages que les françaises, indexées à part. */
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="en">
      <div lang="en">
        <SiteChrome>{children}</SiteChrome>
      </div>
    </LocaleProvider>
  );
}
