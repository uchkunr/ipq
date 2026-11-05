"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatRate } from "@/lib/format";
import type { ProcessTraffic, TrafficSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

function ProgramBox({ process, open, onToggle }: { process: ProcessTraffic; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn("rounded-md bg-card p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", open && "ring-2 ring-primary")}
    >
      <span className="block truncate font-semibold">{process.name}</span>
      <span className="text-sm text-muted-foreground">
        {process.connections} {process.connections === 1 ? "connection" : "connections"}
      </span>
    </button>
  );
}

export function TrafficView() {
  const [snapshot, setSnapshot] = useState<TrafficSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const events = new EventSource("/api/traffic");
    events.onmessage = (message) => {
      setSnapshot(JSON.parse(message.data) as TrafficSnapshot);
      setFailed(false);
    };
    events.onerror = () => setFailed(true);
    return () => events.close();
  }, []);

  const processes = snapshot?.processes ?? [];
  const selected = processes.find((p) => p.name === open);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <div className="rounded-lg bg-card p-4">
          <p className="text-muted-foreground">Download</p>
          <p className="text-2xl font-bold sm:text-3xl">{formatRate(snapshot?.rxBps ?? null)}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-muted-foreground">Upload</p>
          <p className="text-2xl font-bold sm:text-3xl">{formatRate(snapshot?.txBps ?? null)}</p>
        </div>
        <div className="col-span-2 rounded-lg bg-card p-4 lg:col-span-1">
          <p className="text-muted-foreground">Open connections</p>
          <p className="text-2xl font-bold sm:text-3xl">{snapshot?.connections ?? "..."}</p>
        </div>
      </div>

      {failed && !snapshot && (
        <p role="alert" className="text-bad">Live traffic is unavailable. Check that the Undertow server is still running.</p>
      )}

      <section aria-label="Programs using the internet">
        <h2 className="mb-2 font-semibold">Programs using the internet now</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {processes.map((process) => (
            <ProgramBox key={process.name} process={process} open={open === process.name} onToggle={() => setOpen(open === process.name ? null : process.name)} />
          ))}
        </div>
        {snapshot && processes.length === 0 && <p className="text-muted-foreground">No program has an open connection right now.</p>}
      </section>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="rounded-md bg-card p-3">
              <h3 className="font-semibold">Where {selected.name} is connected</h3>
              <ul className="mt-1">
                {selected.remotes.map((remote) => (
                  <li key={`${remote.ip}:${remote.port}`} className="flex flex-wrap justify-between gap-x-4 border-b py-1.5 text-sm last:border-0">
                    <span>{remote.owner ?? remote.ip}{remote.country ? `, ${remote.country}` : ""}</span>
                    <span className="text-muted-foreground">{remote.service}, {remote.ip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <p className="max-w-[70ch] text-sm text-muted-foreground">
        Shows live TCP connections and total speed. Speed per program and the contents of your traffic are not shown, because they need a packet capture driver that Undertow does not install.
      </p>
    </div>
  );
}
