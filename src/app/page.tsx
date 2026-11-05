import Image from "next/image";
import { TraceView } from "@/components/trace-view";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 lg:px-6">
          <Image src="/icon.svg" alt="" width={24} height={24} unoptimized />
          <h1 className="text-base font-semibold tracking-tight">Undertow</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-6">
        <TraceView />
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 pb-6 text-sm text-muted-foreground lg:px-6">
        Measured from this computer. Network names come from public RIPE data.
      </footer>
    </div>
  );
}
