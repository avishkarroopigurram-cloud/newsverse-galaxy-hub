import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone =
    clamped >= 80
      ? "bg-good-500"
      : clamped >= 60
        ? "bg-brass-500"
        : "bg-danger-500";

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-600", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tone)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
