import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IpLookupTool } from "@/components/tools/ip-lookup-tool";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const address = decodeURIComponent((await params).address);
  const title = `${address} IP lookup`;
  const description = `Location, network, owner and abuse contact for ${address}. Free IP lookup from registry and geolocation data.`;
  return {
    title,
    description,
    alternates: { canonical: `/ip/${address}` },
    openGraph: { title: `${title} – ${SITE_NAME}`, description, url: `${SITE_URL}/ip/${address}`, siteName: SITE_NAME, type: "website" },
    robots: { index: true, follow: true },
  };
}

async function Lookup({ params }: Props) {
  const address = decodeURIComponent((await params).address);
  return (
    <>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
        <span className="font-mono">{address}</span>
      </h1>
      <p className="mt-2 max-w-prose text-muted-foreground">Who runs this address, where it is and who to contact about abuse.</p>
      <div className="mt-8">
        <IpLookupTool address={address} heading={false} />
      </div>
    </>
  );
}

export default function AddressPage({ params }: Props) {
  return (
    <article>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/#tools" className="underline-offset-4 hover:underline">Tools</Link>
        <span className="mx-1.5" aria-hidden>/</span>
        <Link href="/ip" className="underline-offset-4 hover:underline">IP lookup</Link>
      </nav>
      <Suspense fallback={<div className="mt-2 h-9 w-64 animate-pulse rounded-md bg-muted" />}>
        <Lookup params={params} />
      </Suspense>
    </article>
  );
}
