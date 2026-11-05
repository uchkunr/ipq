import { headers } from "next/headers";
import { Kv } from "@/components/kv";
import { Skeleton } from "@/components/ui/skeleton";
import { clientInfo } from "@/lib/server/client-info";

/** Reads the request, so it must sit inside a Suspense boundary. */
export async function IpCard({ compact = false }: { compact?: boolean }) {
  const info = await clientInfo(await headers());
  const location = [info.city, info.region, info.country].filter(Boolean).join(", ");
  return (
    <div className={compact ? "" : "rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"}>
      <p className="text-sm text-muted-foreground">{compact ? "Your IP address" : `Your public IPv${info.version ?? 4} address`}</p>
      <p className={compact ? "mt-0.5 font-mono text-2xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]" : "mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-4xl"}>
        {info.ip}
      </p>
      {info.local ? (
        <p className="mt-2 text-sm text-muted-foreground">You are visiting from the same computer, so this is a local address. On the hosted site this shows your public IP.</p>
      ) : (
        !compact && (
          <Kv
            className="mt-4"
            rows={[
              ["Location", location || null],
              ["Network", info.network ? `${info.network.asn ? `AS${info.network.asn}, ` : ""}${info.network.name}` : null],
              ["Reverse DNS", info.hostname],
              ["Time zone", info.timezone],
              ["Browser", info.userAgent ? <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{info.userAgent}</span> : null],
            ]}
          />
        )
      )}
    </div>
  );
}

export function IpCardFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"} aria-busy>
      <Skeleton className="h-4 w-32" />
      <Skeleton className={compact ? "mt-2 h-8 w-48" : "mt-2 h-10 w-64"} />
      {!compact && <Skeleton className="mt-5 h-24 w-full" />}
    </div>
  );
}
