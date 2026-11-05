import Link from "next/link";
import { REPO_URL, SITE_NAME, TOOLS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 text-sm sm:grid-cols-[1fr_2fr] lg:px-6">
        <div>
          <p className="font-semibold">{SITE_NAME}</p>
          <p className="mt-1 max-w-xs text-muted-foreground">Network tools that answer in one request, in the browser or from the terminal.</p>
          <p className="mt-3 text-muted-foreground">
            Open source on <a href={REPO_URL} className="text-foreground underline-offset-4 hover:underline">GitHub</a>. Network names come from public RIPE and RDAP data.
          </p>
        </div>
        <nav aria-label="All tools">
          <p className="font-semibold">Tools</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                <Link href={`/${tool.slug}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {tool.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/api" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                API reference
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
