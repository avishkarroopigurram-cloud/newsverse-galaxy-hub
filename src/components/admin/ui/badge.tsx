import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-ink-700 text-paper-300",
        brass: "bg-brass-500/15 text-brass-400 border border-brass-500/40",
        signal: "bg-signal-500/15 text-signal-400 border border-signal-500/40",
        good: "bg-good-500/15 text-good-500",
        warn: "bg-warn-500/15 text-warn-500",
        danger: "bg-danger-500/15 text-danger-500",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
