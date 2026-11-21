import { Receipt } from "lucide-react";
import { cn } from "@/lib/cn";
import { initialForCategory, tintForCategory } from "@/features/transactions/categoryTint";

export interface CategoryAvatarProps {
  category?: string | undefined;
  className?: string;
}

export function CategoryAvatar({ category, className }: CategoryAvatarProps): React.JSX.Element {
  const tint = tintForCategory(category);
  const initial = initialForCategory(category);

  return (
    <div
      data-testid="category-avatar"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        "text-body font-bold",
        tint.bg,
        tint.text,
        className,
      )}
      aria-hidden
    >
      {initial ? <span>{initial}</span> : <Receipt className="size-5" strokeWidth={2} />}
    </div>
  );
}
