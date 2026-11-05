import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

const sans = Google_Sans({ variable: "--font-sans-ui", subsets: ["latin", "cyrillic"] });
const mono = Google_Sans_Code({ variable: "--font-mono-ui", subsets: ["latin"] });

const description = "Free network tools for developers and everyone else: what is my IP, DNS lookup, WHOIS, HTTP and SSL checks, port check, email DNS check and a subnet calculator. Works from the browser and from curl.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s – ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  keywords: ["network tools", "what is my ip", "dns lookup", "whois", "ssl checker", "port checker", "http headers", "subnet calculator", "devops tools"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, url: SITE_URL, title: `${SITE_NAME}: ${SITE_TAGLINE}`, description },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${SITE_TAGLINE}`, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 lg:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
