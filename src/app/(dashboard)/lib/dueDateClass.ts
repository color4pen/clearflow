export function dueDateClass(date: Date | string | null, now?: Date): string {
  if (!date) return "";
  const target = typeof date === "string" ? new Date(date) : date;
  const base = now ?? new Date();
  const targetStr = target.toDateString();
  const baseStr = base.toDateString();
  if (targetStr === baseStr) return "text-warning font-semibold";
  if (target < base && targetStr !== baseStr) return "text-danger font-semibold";
  return "";
}
