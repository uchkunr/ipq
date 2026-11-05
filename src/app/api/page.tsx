import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "API reference",
  description: "Free JSON API for DNS lookup, WHOIS, SSL and HTTP checks, port checks, email DNS checks and IP information. GET requests, no key.",
  alternates: { canonical: "/api" },
};

const ENDPOINTS: { path: string; params: string; text?: boolean; returns: string; example: string }[] = [
  { path: "/ip", params: "full (optional)", text: true, returns: "Plain text: your IP. With ?full, a short text table. With Accept: application/json, all fields as JSON.", example: `curl ${SITE_URL}/ip\ncurl "${SITE_URL}/ip?full"\ncurl -H "accept: application/json" ${SITE_URL}/ip` },
  { path: "/api/lookup", params: "ip (IPv4 or IPv6; defaults to your own address)", returns: "Location estimate, autonomous system with prefix count, owner and abuse contact from the registry, reverse DNS, Tor exit flag and name-based hosting, mobile and satellite hints. Fields that need commercial data are listed under unavailable instead of guessed.", example: `curl "${SITE_URL}/api/lookup?ip=1.1.1.1"` },
  { path: "/headers", params: "none", text: true, returns: "Plain text: one header per line. JSON with Accept: application/json.", example: `curl -H "x-demo: 1" ${SITE_URL}/headers` },
  { path: "/api/dns", params: "name, type (A, AAAA, CNAME, MX, NS, TXT, SOA, CAA, SRV, PTR; default A)", returns: "Answers from Cloudflare, Google and Quad9 with TTLs and timing, plus a consistency flag. Plain text in zone-file style with ?text.", example: `curl "${SITE_URL}/api/dns?name=example.com&type=MX"` },
  { path: "/api/whois", params: "q (domain, IP or AS number)", returns: "Registrar, events, nameservers, status, DNSSEC and network range from RDAP.", example: `curl "${SITE_URL}/api/whois?q=example.com"` },
  { path: "/api/http", params: "url", returns: "Every redirect hop with status and timing, final headers and a security header summary.", example: `curl "${SITE_URL}/api/http?url=http://example.com"` },
  { path: "/api/ssl", params: "host, port (default 443)", returns: "Trust verdict, days left, protocol, cipher, SANs and the certificate chain.", example: `curl "${SITE_URL}/api/ssl?host=example.com" | jq .daysLeft` },
  { path: "/api/ports", params: "host, ports (comma separated, up to 20; default common ports)", returns: "open, closed or filtered per port with connect time.", example: `curl "${SITE_URL}/api/ports?host=example.com&ports=22,80,443"` },
  { path: "/api/email", params: "domain, selector (optional DKIM selector)", returns: "MX, SPF, DMARC and DKIM records, each with a verdict.", example: `curl "${SITE_URL}/api/email?domain=example.com&selector=google"` },
];

export default function ApiPage() {
  return (
    <article className="flex flex-col gap-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">API reference</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Every tool on this site is a GET request. Responses are JSON with CORS enabled, so they work from scripts, CI jobs and browser code alike. There is no key and no sign-up. Errors come back as <code className="font-mono text-[0.85em]">{`{ "error": "..." }`}</code> with a 4xx or 5xx status.
        </p>
      </header>

      <section aria-labelledby="limits" className="max-w-prose text-sm text-muted-foreground">
        <h2 id="limits" className="font-semibold text-foreground">Limits</h2>
        <p className="mt-1">Per address and minute: 60 DNS lookups, 40 IP lookups, 30 WHOIS or email checks, 20 HTTP or SSL checks, 15 port checks. Private and local addresses are refused. Checks run from the server that hosts the site, so results describe reachability from there.</p>
      </section>

      <div className="flex flex-col gap-6">
        {ENDPOINTS.map((endpoint) => (
          <section key={endpoint.path} aria-labelledby={`ep-${endpoint.path}`} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-4 py-3">
              <h2 id={`ep-${endpoint.path}`} className="font-mono text-[0.95rem] font-semibold">GET {endpoint.path}</h2>
              {endpoint.text && <span className="text-xs text-muted-foreground">text for curl, JSON for browsers and Accept: application/json</span>}
            </header>
            <dl className="grid gap-x-6 gap-y-2 px-4 py-3 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Parameters</dt>
              <dd>{endpoint.params}</dd>
              <dt className="text-muted-foreground">Returns</dt>
              <dd>{endpoint.returns}</dd>
            </dl>
            <div className="px-4 pb-4">
              <CodeBlock code={endpoint.example} />
            </div>
          </section>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        The connection check has no hosted API because it runs on your own computer. See <Link href="/check" className="text-foreground underline-offset-4 hover:underline">how to run it</Link>.
      </p>
    </article>
  );
}
