"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CodeBlock({ code, className, label }: { code: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <div className={cn("group relative overflow-hidden rounded-xl bg-foreground text-background", className)}>
      {label && <p className="border-b border-background/15 px-4 py-2 text-xs text-background/70">{label}</p>}
      <pre className="overflow-x-auto px-4 py-3 pr-12 font-mono text-[0.8125rem] leading-relaxed whitespace-pre"><code>{code}</code></pre>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={() => navigator.clipboard.writeText(code).then(() => setCopied(true))}
        className="absolute top-2 right-2 rounded-md p-1.5 text-background/70 transition-colors hover:bg-background/15 hover:text-background focus-visible:outline-2 focus-visible:outline-background"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
