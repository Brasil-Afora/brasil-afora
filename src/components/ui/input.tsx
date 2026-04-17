import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      className={cn(
        "h-8 w-full min-w-0 rounded border border-slate-900 bg-slate-950 px-2.5 py-1 text-base text-white outline-none transition-colors file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium file:text-sm file:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-900 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/40 md:text-sm",
        className
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
