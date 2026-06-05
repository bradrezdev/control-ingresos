/**
 * Select — control-ingresos
 *
 * Native `<select>` wrapped with the same visual language as Input. We
 * intentionally do NOT use a custom listbox to keep accessibility and
 * mobile UX predictable; styling a native select is good enough.
 */
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean | undefined;
  children?: ReactNode;
}

const sizeClasses: Record<NonNullable<SelectProps["size"]>, string> = {
  sm: "h-9 text-sm",
  md: "h-11 text-base",
  lg: "h-12 text-base",
};

export function Select({
  className,
  options,
  placeholder,
  size = "md",
  invalid,
  disabled,
  ...props
}: SelectProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "relative w-full",
        "bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)]",
        "rounded-[var(--radius-md)]",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-within:border-[var(--color-border-focus)] focus-within:bg-[var(--color-surface)]",
        invalid &&
          "border-[var(--color-danger)] focus-within:border-[var(--color-danger)]",
        disabled && "opacity-50 cursor-not-allowed",
        sizeClasses[size],
      )}
    >
      <select
        className={cn(
          "w-full h-full bg-transparent border-0 outline-none appearance-none",
          "px-4 pr-10 text-[var(--color-text-body)]",
          "disabled:cursor-not-allowed",
          className,
        )}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-muted)] pointer-events-none"
        aria-hidden
      />
    </div>
  );
}
