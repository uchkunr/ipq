"use client";

import { useState } from "react";
import { HistoryView } from "@/components/history-view";
import { TraceView } from "@/components/trace-view";
import { TrafficView } from "@/components/traffic-view";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VIEWS = [
  { id: "trace", label: "Check a site" },
  { id: "traffic", label: "This computer" },
  { id: "history", label: "History" },
] as const;

type View = (typeof VIEWS)[number]["id"];

export function Shell() {
  const [view, setView] = useState<View>("trace");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4">
        <h1 className="text-xl font-bold tracking-tight">Undertow</h1>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="h-10 gap-1 rounded-md bg-secondary p-1">
            {VIEWS.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="rounded-sm px-3 text-[0.95rem]">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>
      <main className="flex-1 pb-10">
        {view === "trace" && <TraceView />}
        {view === "traffic" && <TrafficView />}
        {view === "history" && <HistoryView />}
      </main>
    </div>
  );
}
