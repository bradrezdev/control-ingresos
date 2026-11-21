export interface CategoryTint {
  bg: string;
  text: string;
  label: string;
}

const CATEGORY_TINT_TABLE = {
  default: { bg: "bg-surface-inset", text: "text-primary", label: "" },
  comida: { bg: "bg-warning-bg", text: "text-warning", label: "C" },
  transporte: { bg: "bg-cyan-bg", text: "text-cyan", label: "T" },
  tecnologia: { bg: "bg-violet-bg", text: "text-violet", label: "T" },
  hogar: { bg: "bg-accent-blue-bg", text: "text-accent-blue", label: "H" },
  salud: { bg: "bg-rose-bg", text: "text-rose", label: "S" },
  educacion: { bg: "bg-positive-bg", text: "text-positive", label: "E" },
  entretenimiento: { bg: "bg-violet-bg", text: "text-violet", label: "E" },
  suscripciones: { bg: "bg-warning-bg", text: "text-warning", label: "S" },
  familia: { bg: "bg-rose-bg", text: "text-rose", label: "F" },
  sueldo: { bg: "bg-positive-bg", text: "text-positive", label: "S" },
  trabajo: { bg: "bg-positive-bg", text: "text-positive", label: "T" },
  otros: { bg: "bg-neutral-bg", text: "text-text-secondary", label: "O" },
} as const satisfies Record<string, CategoryTint>;

export type CategoryTintKey = keyof typeof CATEGORY_TINT_TABLE;

export const CATEGORY_TINT: Record<CategoryTintKey, CategoryTint> = CATEGORY_TINT_TABLE;

export function tintForCategory(category: string | undefined): CategoryTint {
  const key = (category ?? "").toLowerCase().trim();
  if (key in CATEGORY_TINT) return CATEGORY_TINT[key as CategoryTintKey];
  return CATEGORY_TINT.default;
}

export function initialForCategory(category: string | undefined): string {
  if (!category) return "";
  return category.trim().charAt(0).toLocaleUpperCase("es-MX");
}
