import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-[#d5e2dc] bg-white px-3 py-2 text-sm text-[#153628] shadow-xs outline-none transition placeholder:text-[#789084] focus-visible:ring-2 focus-visible:ring-[#63a386]/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
