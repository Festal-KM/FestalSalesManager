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
  return <thead className={cn("bg-gray-50", className)} {...props} />;
}

function TBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr className={cn("border-b border-gray-100 last:border-0", className)} {...props} />
  );
}

function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-gray-600",
        className,
      )}
      {...props}
    />
  );
}

function TD({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td className={cn("whitespace-nowrap px-3 py-2.5 text-gray-800", className)} {...props} />
  );
}

export { Table, THead, TBody, TR, TH, TD };
