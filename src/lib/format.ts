export function formatMs(value: number | null | undefined) {
  if (value === null || value === undefined) return "No reply";
  if (value < 1) return "<1 ms";
  return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ms`;
}

export function formatPercent(lost: number, sent: number) {
  if (!sent) return "0%";
  const value = (lost / sent) * 100;
  return `${value >= 10 || value === 0 ? Math.round(value) : value.toFixed(1)}%`;
}
