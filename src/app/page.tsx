import Link from "next/link";
import { Suspense } from "react";
import { CodeBlock } from "@/components/code-block";
import { IpCard, IpCardFallback } from "@/components/tools/ip-card";
import { SITE_URL, TOOLS } from "@/lib/site";

export default function Home() {
  const web = TOOLS.filter((tool) => !tool.localOnly);
  const local = TOOLS.find((tool) => tool.localOnly)!;
  return (
    <div className="flex flex-col gap-14">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Network tools that answer in one request.</h1>
          <p className="mt-4 max-w-prose text-lg text-muted-foreground">
            Look up DNS, check a certificate, see who owns an address, test a port or read your own IP. Every tool works in the browser and from the terminal, with no account and no key.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/dns" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85">
              DNS lookup
            </Link>
            <Link href="/ssl" className="rounded-lg border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary">
              SSL check
            </Link>
            <Link href="/http" className="rounded-lg border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary">
              HTTP check
            </Link>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <Suspense fallback={<IpCardFallback compact />}>
            <IpCard compact />
          </Suspense>
          <p className="mt-3 text-sm text-muted-foreground">
            <Link href="/ip" className="text-foreground underline-offset-4 hover:underline">Location, network and more</Link>, or from a shell:
          </p>
          <CodeBlock code={`curl ${SITE_URL.replace(/^https?:\/\//, "")}/ip`} className="mt-2" />
        </div>
      </section>

      <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-20">
        <h2 id="tools-heading" className="text-2xl font-semibold tracking-tight">Tools</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {web.map((tool) => (
            <li key={tool.slug}>
              <Link href={`/${tool.slug}`} className="group flex h-full flex-col rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-[box-shadow,transform] hover:ring-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="font-semibold group-hover:underline group-hover:underline-offset-4">{tool.name}</span>
                <span className="mt-1 flex-1 text-sm text-muted-foreground">{tool.short}</span>
                {tool.curl && <span className="mt-3 truncate font-mono text-xs text-muted-foreground">{tool.curl.split("\n")[0].replace(SITE_URL, "").replace(/^curl "?/, "").replace(/"$/, "")}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="local-heading" className="grid gap-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 id="local-heading" className="text-xl font-semibold tracking-tight">{local.name}: where does your packet loss start?</h2>
          <p className="mt-2 max-w-prose text-muted-foreground">{local.long}</p>
        </div>
        <Link href="/check" className="rounded-lg border bg-background px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-secondary">
          How to run it
        </Link>
      </section>

      <section aria-labelledby="terminal-heading">
        <h2 id="terminal-heading" className="text-2xl font-semibold tracking-tight">Built for the terminal too</h2>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Every tool is a GET request that returns JSON, and the two you reach for most return plain text when curl asks. See the <Link href="/api" className="text-foreground underline-offset-4 hover:underline">API reference</Link>.
        </p>
        <CodeBlock
          className="mt-4"
          code={[
            `curl ${SITE_URL}/ip`,
            `curl ${SITE_URL}/headers`,
            `curl "${SITE_URL}/api/dns?name=example.com&type=MX"`,
            `curl "${SITE_URL}/api/ssl?host=example.com" | jq .daysLeft`,
          ].join("\n")}
        />
      </section>
    </div>
  );
}
