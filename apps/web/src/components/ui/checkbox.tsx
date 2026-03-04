"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(
      Boolean(checked),
    );

    React.useEffect(() => {
      setInternalChecked(Boolean(checked));
    }, [checked]);

    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer relative size-4 shrink-0 rounded-[4px] border border-input bg-background cursor-pointer accent-primary transition-colors outline-none group-has-disabled/field:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 checked:border-primary checked:bg-primary dark:checked:bg-primary",
          className,
        )}
        checked={internalChecked}
        onChange={(e) => {
          const nextChecked = e.currentTarget.checked;
          setInternalChecked(nextChecked);
          onCheckedChange?.(nextChecked);
        }}
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
