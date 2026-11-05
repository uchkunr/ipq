import { Suspense } from "react";
import { ToolPage } from "@/components/tool-page";
import { HeadersList, HeadersListFallback } from "@/components/tools/headers-list";
import { toolMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/site";

export const metadata = toolMetadata("headers", "HTTP request headers echo");

export default function HeadersPage() {
  return (
    <ToolPage
      tool={toolBySlug("headers")!}
      about={
        <>
          <p>Every request carries headers that describe the client: which browser, which languages, which compression it accepts, which page linked here. Proxies and CDNs add their own on the way. This page shows the set exactly as the server received it, with the internal routing headers of the hosting platform removed.</p>
          <h3>Typical uses</h3>
          <ul>
            <li>Confirm a script or CLI sends the User-Agent or Authorization header you think it does.</li>
            <li>See which X-Forwarded headers a proxy or load balancer adds.</li>
            <li>Check what Accept-Language a browser advertises when a site picks the wrong language.</li>
          </ul>
          <p>From the terminal the same path returns one header per line. Add custom headers to the request and they appear in the output.</p>
        </>
      }
    >
      <Suspense fallback={<HeadersListFallback />}>
        <HeadersList />
      </Suspense>
    </ToolPage>
  );
}
