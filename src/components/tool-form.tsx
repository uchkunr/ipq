"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ToolState } from "@/lib/use-tool";
import { cn } from "@/lib/utils";

type Field = { name: string; label: string; placeholder: string; width?: string; inputMode?: "url" | "text" | "numeric"; optional?: boolean };

export function ToolForm({
  fields,
  action,
  initial,
  loading,
  onSubmit,
  children,
  examples,
}: {
  fields: Field[];
  action: string;
  initial: Record<string, string> | null;
  loading: boolean;
  onSubmit: (values: Record<string, string>) => void;
  children?: ReactNode;
  examples?: { label: string; values: Record<string, string> }[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState<Record<string, string> | null>(null);
  if (initial && initial !== seeded) {
    // Values from the URL fill the form once, without overwriting anything already typed.
    setSeeded(initial);
    setValues((v) => ({ ...initial, ...v }));
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };
  const go = (next: Record<string, string>) => {
    setValues(next);
    onSubmit(next);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {fields.map((field, i) => (
          <div key={field.name} className={cn("min-w-0", field.width ?? (i === 0 ? "flex-1" : "sm:w-40"))}>
            <label htmlFor={`field-${field.name}`} className="sr-only">{field.label}</label>
            <Input
              id={`field-${field.name}`}
              value={values[field.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              placeholder={field.placeholder}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode={field.inputMode ?? "url"}
              autoFocus={i === 0}
              required={!field.optional}
              className="h-11 bg-card px-3 text-base md:text-base"
            />
          </div>
        ))}
        {children}
        <Button type="submit" disabled={loading} className="h-11 px-5">
          {loading && <LoaderCircle className="animate-spin" aria-hidden />}
          {action}
        </Button>
      </div>
      {examples && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Try</span>
          {examples.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => go(example.values)}
              className="rounded-full border bg-card px-3 py-1 font-medium transition-colors hover:border-foreground/40 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {example.label}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

/** Loading, error and empty states shared by every tool, so they all behave the same. */
export function ToolResult<T>({ state, skeleton = 3, children }: { state: ToolState<T>; skeleton?: number; children: (data: T) => ReactNode }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        {Array.from({ length: skeleton }, (_, i) => (
          <Skeleton key={i} className={cn("h-14 rounded-xl", i === 0 && "h-20")} />
        ))}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-xl bg-bad-soft px-4 py-3 text-bad">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="font-medium">{state.error}</p>
      </div>
    );
  }
  return <div className="flex flex-col gap-4">{children(state.data as T)}</div>;
}
