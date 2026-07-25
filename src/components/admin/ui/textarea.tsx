import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none bg-transparent text-paper-100 placeholder:text-paper-700",
      "focus:outline-none",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
