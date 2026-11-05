import { headers } from "next/headers";
import { Kv, Panel } from "@/components/kv";
import { Skeleton } from "@/components/ui/skeleton";
import { visibleHeaders } from "@/lib/server/client-info";

/** Reads the request, so it must sit inside a Suspense boundary. */
export async function HeadersList() {
  const list = visibleHeaders(new Headers(await headers()));
  return (
    <Panel title="Headers your browser sent" aside={`${list.length}`}>
      <Kv rows={list.map(([name, value]) => [name, <span key={name} className="font-mono text-[0.8125rem]">{value}</span>])} />
    </Panel>
  );
}

export function HeadersListFallback() {
  return <Skeleton className="h-64 w-full rounded-xl" aria-busy />;
}
