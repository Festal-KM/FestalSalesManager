import * as React from "react";
import { cn } from "@/lib/utils";

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      className={cn(
        "mb-1 block text-sm font-medium text-gray-700",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-alert">*</span>}
    </label>
  );
}

export { Label };
