import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted-fg/70 transition-shadow focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:bg-base disabled:text-muted-fg",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
