import Link from "next/link";
import type { ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";
import { SITE_NAME, SITE_URL, TOOLS, type Tool } from "@/lib/site";

/** The frame every tool page shares: heading, the tool, the terminal form, an explanation, and the other tools. */
export function ToolPage({ tool, children, about }: { tool: Tool; children: ReactNode; about: ReactNode }) {
  const others = TOOLS.filter((t) => t.slug !== tool.slug).slice(0, 6);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${tool.name} – ${SITE_NAME}`,
    url: `${SITE_URL}/${tool.slug}`,
    description: tool.short,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return (
    <article className="flex flex-col gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header>
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/#tools" className="underline-offset-4 hover:underline">Tools</Link>
          <span className="mx-1.5" aria-hidden>/</span>
          <span>{tool.name}</span>
        </nav>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tool.name}</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">{tool.long}</p>
      </header>

      <div className="flex flex-col gap-6">{children}</div>

      {tool.curl && (
        <section aria-labelledby="terminal">
          <h2 id="terminal" className="font-semibold">{tool.localOnly ? "Run it on your computer" : "From the terminal"}</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            {tool.localOnly ? "Requires Bun. The check opens at 127.0.0.1:3400." : tool.api ? "The same tool as JSON. No key, no sign-up." : ""}
          </p>
          <CodeBlock code={tool.curl} />
        </section>
      )}

      <section aria-labelledby="about" className="max-w-prose text-[0.95rem] leading-relaxed [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:font-semibold [&_p]:mt-2 [&_p]:text-muted-foreground [&_li]:mt-1 [&_li]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <h2 id="about">About this tool</h2>
        {about}
      </section>

      <nav aria-labelledby="more" className="border-t pt-6">
        <h2 id="more" className="font-semibold">More tools</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((other) => (
            <li key={other.slug}>
              <Link href={`/${other.slug}`} className="block rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:ring-foreground/30">
                <span className="block font-medium">{other.name}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{other.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
