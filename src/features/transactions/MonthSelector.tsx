import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "@/lib/date/format";
import { dateToMonthIso, monthIsoToDate } from "@/lib/date/format";
import { IconButton } from "@/components/ui/design/IconButton";

export interface MonthSelectorProps {
  monthIso: string;
  onChange: (monthIso: string) => void;
}

export function MonthSelector({ monthIso, onChange }: MonthSelectorProps): React.JSX.Element {
  function shift(delta: number): void {
    const date = monthIsoToDate(monthIso);
    date.setMonth(date.getMonth() + delta);
    onChange(dateToMonthIso(date));
  }

  return (
    <div
      className="flex items-center justify-between h-[52px] px-1 rounded-hero bg-surface"
      aria-label="Periodo del historial"
    >
      <IconButton
        icon={<ChevronLeft className="size-5" strokeWidth={2} aria-hidden />}
        aria-label="Mes anterior"
        onClick={() => shift(-1)}
      />
      <span className="text-title font-bold text-primary">{formatMonth(monthIso)}</span>
      <IconButton
        icon={<ChevronRight className="size-5" strokeWidth={2} aria-hidden />}
        aria-label="Mes siguiente"
        onClick={() => shift(1)}
      />
    </div>
  );
}
