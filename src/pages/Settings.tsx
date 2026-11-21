/**
 * Settings — control-ingresos (redesign-ui-2026, T8)
 *
 * Redesigned settings screen (REDESIGN §Fase 4 "Ajustes"): a back button
 * in the header, sections in PaperCards (Apariencia, Presupuesto y moneda,
 * Respaldo) and the save CTA that is gray/disabled with secondary text
 * while there are no pending changes, primary when the form is dirty, and
 * confirms with "Cambios guardados" after saving.
 *
 * Uses react-hook-form + zodResolver. The store is the write-through
 * proxy to Dexie; on submit we update the singleton via
 * `setMonthlyLimit` and `setCurrency` (each triggers a Dexie persist
 * and refreshes the store value).
 *
 * Form values are derived from `useLiveSettings` (Dexie reactive). On
 * mount, if the live query is still loading, we show a skeleton. After
 * data arrives, the form is `reset()` so the user sees the current
 * persisted values.
 */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaperCard, ScreenHeader, SectionHeading } from "@/components/ui/design";
import { Select } from "@/components/ui/Select";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { fadeIn } from "@/components/motion/variants";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useSettingsStore } from "@/stores/settingsStore";
import { centsToDisplay } from "@/lib/money/format";
import { cn } from "@/lib/cn";
import { BackupSection } from "@/features/backup";

const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "COP", label: "COP — Peso colombiano" },
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "CLP", label: "CLP — Peso chileno" },
  { value: "PEN", label: "PEN — Sol peruano" },
];

const settingsSchema = z.object({
  monthlyLimit: z
    .number({ error: "Ingresa un monto válido" })
    .nonnegative("El límite no puede ser negativo")
    .finite("El límite debe ser un número válido"),
  currency: z.string().length(3, "Código de moneda inválido"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function Settings(): React.JSX.Element {
  const live = useLiveSettings();
  const setMonthlyLimit = useSettingsStore((s) => s.setMonthlyLimit);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { monthlyLimit: 0, currency: "MXN" },
  });

  // Re-seed the form whenever the persisted settings change.
  useEffect(() => {
    if (!live) return;
    reset({
      monthlyLimit: centsToDisplay(live.monthlyLimit),
      currency: live.currency,
    });
  }, [live, reset]);

  const watchedCurrency = watch("currency");
  const watchedMonthlyLimit = watch("monthlyLimit");

  async function onSubmit(values: SettingsFormValues): Promise<void> {
    if (!isDirty || submitting) return;
    setSubmitting(true);
    try {
      // The form works in display units; the store keeps integer cents.
      const cents = Math.round(values.monthlyLimit * 100);
      await setMonthlyLimit(cents);
      await setCurrency(values.currency);
      setSavedAt(Date.now());
      // Re-seed the form so isDirty flips back to false and the
      // displayed value matches what was persisted.
      reset({
        monthlyLimit: values.monthlyLimit,
        currency: values.currency,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state — full skeleton so we never flash a 0/default form.
  if (!live) {
    return (
      <PageContainer bare>
        <div className="flex flex-col gap-3.5">
          <ScreenHeader
            title="Ajustes"
            back={{ to: "/", label: "Volver" }}
          />
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" rounded="sm" />
            <Skeleton className="h-12 w-full" rounded="md" />
            <Skeleton className="h-4 w-32" rounded="sm" />
            <Skeleton className="h-12 w-full" rounded="md" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // Gray with secondary text only while there is nothing to save; primary
  // as soon as the form is dirty (REDESIGN §Fase 4 "Ajustes").
  const saveDisabled = !isDirty || submitting;

  return (
    <PageContainer bare>
      <div className="flex flex-col gap-3.5">
        <ScreenHeader
          title="Ajustes"
          back={{ to: "/", label: "Volver" }}
        />

        <PaperCard className="p-5">
          <SectionHeading title="Apariencia" />
          <p className="mt-1 text-aux text-muted">
            Elige el tema visual de la aplicación.
          </p>
          <div className="mt-3">
            <ThemeToggle size="md" />
          </div>
        </PaperCard>

        <PaperCard className="p-5">
          <SectionHeading title="Presupuesto y moneda" />
          <p className="mt-1 text-aux text-muted">
            Define tu límite mensual y la moneda de los montos.
          </p>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-4 space-y-5"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="monthlyLimit"
                className="text-sm font-medium text-[var(--color-text-body)]"
              >
                Límite mensual
              </label>
              <CurrencyInput
                id="monthlyLimit"
                value={Math.round((watchedMonthlyLimit ?? 0) * 100)}
                currency={watchedCurrency || live.currency}
                onChangeCents={(cents) =>
                  setValue("monthlyLimit", cents / 100, { shouldDirty: true })
                }
                invalid={!!errors.monthlyLimit}
              />
              {errors.monthlyLimit ? (
                <p
                  role="alert"
                  className="text-xs text-[var(--color-danger)] mt-1"
                >
                  {errors.monthlyLimit.message}
                </p>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Te avisaremos cuando te acerques a este número.
                </p>
              )}
              {/* Hidden field for react-hook-form registration; the
                  CurrencyInput is the visible controlled surface. */}
              <input type="hidden" {...register("monthlyLimit")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="currency"
                className="text-sm font-medium text-[var(--color-text-body)]"
              >
                Moneda
              </label>
              <Select
                id="currency"
                options={CURRENCY_OPTIONS}
                value={watchedCurrency}
                onChange={(e) =>
                  setValue("currency", e.target.value, { shouldDirty: true })
                }
                invalid={!!errors.currency}
              />
              {errors.currency ? (
                <p
                  role="alert"
                  className="text-xs text-[var(--color-danger)] mt-1"
                >
                  {errors.currency.message}
                </p>
              ) : null}
              <input type="hidden" {...register("currency")} />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={saveDisabled}
                className={cn(
                  "h-[52px] w-full rounded-full text-base font-bold transition-colors duration-fast ease-out-soft",
                  saveDisabled
                    ? "cursor-default bg-segment text-text-secondary"
                    : "bg-button text-hero-text hover:bg-primary-hover active:scale-[0.98]",
                )}
              >
                Guardar cambios
              </button>

              {savedAt && !isDirty ? (
                <motion.span
                  key={savedAt}
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                  role="status"
                  className="inline-flex items-center justify-center gap-1.5 text-aux font-semibold text-positive"
                >
                  <Check className="size-4" aria-hidden />
                  Cambios guardados
                </motion.span>
              ) : null}
            </div>
          </form>
        </PaperCard>

        <BackupSection />
      </div>
    </PageContainer>
  );
}
