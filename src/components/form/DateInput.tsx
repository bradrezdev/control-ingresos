/**
 * DateInput — control-ingresos
 *
 * Native `<input type="date">` wrapped with a label. Emits an ISO date
 * string (YYYY-MM-DD). The native picker is preferred for accessibility
 * and zero JS bundle cost.
 */
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";

export interface DateInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "size" | "value" | "onChange"
  > {
  value: string;
  onValueChange: (iso: string) => void;
  label?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean | undefined;
}

export function DateInput({
  value,
  onValueChange,
  label,
  id,
  size = "md",
  invalid,
  ...props
}: DateInputProps): React.JSX.Element {
  const inputId = id ?? `date-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          {label}
        </label>
      ) : null}
      <Input
        id={inputId}
        type="date"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        size={size}
        invalid={invalid}
        {...props}
      />
    </div>
  );
}
