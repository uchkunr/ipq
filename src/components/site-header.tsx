import Image from "next/image";
import Link from "next/link";
import { REPO_URL, SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2.5 px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <Image src="/icon.svg" alt="" width={26} height={26} className="rounded-[7px]" unoptimized />
          <span className="text-lg font-semibold tracking-tight">{SITE_NAME}</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/#tools" className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            Tools
          </Link>
          <Link href="/api" className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            API
          </Link>
          <a href={REPO_URL} className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
