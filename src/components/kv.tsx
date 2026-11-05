import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Label and value rows. Values wrap anywhere, so long tokens such as hashes never overflow. */
export function Kv({ rows, className }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm", className)}>
      {rows.map(([label, value], i) => (
        <div key={`${label}-${i}`} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Panel({ title, aside, children, className }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      {title && (
        <header className="flex items-baseline justify-between gap-4 border-b px-4 py-2.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {aside && <span className="text-xs text-muted-foreground tabular-nums">{aside}</span>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const TONE = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  muted: "bg-secondary text-muted-foreground",
};

export function Tag({ tone = "muted", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap", TONE[tone])}>{children}</span>;
}

export function Verdict({ tone, children }: { tone: "good" | "warn" | "bad"; children: ReactNode }) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-bad";
  return (
    <p className={cn("flex items-start gap-2 text-sm", color)}>
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad")} aria-hidden />
      <span>{children}</span>
    </p>
  );
}
