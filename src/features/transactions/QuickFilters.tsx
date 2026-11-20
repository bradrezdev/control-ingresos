import { Chip } from "@/components/ui/design/Chip";
import type { QuickFilter } from "./types";

export interface QuickFiltersProps {
  value: QuickFilter;
  onChange: (value: QuickFilter) => void;
}

const OPTIONS: Array<{ value: QuickFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "income", label: "Ingresos" },
  { value: "expense", label: "Gastos" },
  { value: "expense_msi", label: "MSI" },
];

export function QuickFilters({ value, onChange }: QuickFiltersProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label="Filtrar por tipo"
      className="flex gap-2 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: "none" }}
    >
      {OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Chip>
      ))}
    </div>
  );
}
