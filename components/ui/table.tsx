import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b border-line bg-base/60", className)}
      {...props}
    />
  );
}

function TBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-line transition-colors last:border-0 hover:bg-base/50",
        className,
      )}
      {...props}
    />
  );
}

function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-fg",
        className,
      )}
      {...props}
    />
  );
}

function TD({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td className={cn("whitespace-nowrap px-4 py-3 text-ink", className)} {...props} />
  );
}

export { Table, THead, TBody, TR, TH, TD };
