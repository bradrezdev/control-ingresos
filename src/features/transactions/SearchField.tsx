import { Search, X } from "lucide-react";
import { IconButton } from "@/components/ui/design/IconButton";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function SearchField({ value, onChange, onClose }: SearchFieldProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 w-full bg-surface-inset border border-border-subtle rounded-md px-3 h-11 focus-within:border-border-focus focus-within:bg-surface">
        <Search className="size-4 text-muted shrink-0" strokeWidth={2} aria-hidden />
        <input
          type="search"
          role="searchbox"
          aria-label="Buscar por descripción, categoría o cuenta"
          placeholder="Buscar por descripción, categoría o cuenta"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-body text-ink placeholder:text-muted"
          autoFocus
        />
      </div>
      <IconButton
        icon={<X className="size-5" strokeWidth={2} aria-hidden />}
        aria-label="Cerrar búsqueda"
        onClick={onClose}
      />
    </div>
  );
}
