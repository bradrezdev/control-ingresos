import { cn } from "@/lib/cn";

export interface CategoryAvatarProps {
  initial: string;
  bgClass: string;
  textClass: string;
}

export function CategoryAvatar({
  initial,
  bgClass,
  textClass,
}: CategoryAvatarProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        "text-body font-bold",
        bgClass,
        textClass,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
