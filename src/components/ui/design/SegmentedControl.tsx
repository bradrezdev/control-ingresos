import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps
  extends Omit<ButtonHTMLAttributes<HTMLDivElement>, "onChange" | "children"> {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Horizontal segmented switch.
 *
 * Equivalent to the prototype's `.sg` primitive: segment background, pill
 * radius, active option on a paper surface with primary text.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedControlProps): React.JSX.Element {
  return (
    <div
      role="group"
      className={cn("flex rounded-pill bg-segment p-1", className)}
      {...props}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 min-h-11 rounded-pill px-3 text-sm font-semibold transition-colors duration-fast ease-out-soft",
              active
                ? "bg-surface text-primary shadow-sm"
                : "bg-transparent text-text-secondary hover:text-primary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
