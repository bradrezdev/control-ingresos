/**
 * Settings — control-ingresos
 *
 * F5.1 — Form for monthly spending limit and currency.
 *
 * Uses react-hook-form + zodResolver. The store is the write-through
 * proxy to Dexie; on submit we update the singleton via
 * `setMonthlyLimit` and `setCurrency` (each triggers a Dexie persist
 * and refreshes the store value).
 *
 * Form values are derived from `useLiveSettings` (Dexie reactive). On
 * mount, if the live query is still loading, we show a skeleton. After
 * data arrives, the form is `reset()` so the user sees the current
 * persisted values. Submit is disabled until the form is dirty.
 */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "motion/react";
import { fadeIn } from "@/components/motion/variants";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useSettingsStore } from "@/stores/settingsStore";
import { centsToDisplay } from "@/lib/money/format";

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
    .number({ error: "Ingresá un monto válido" })
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
      <PageContainer title="Ajustes" description="Preferencias y presupuesto mensual">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" rounded="sm" />
          <Skeleton className="h-12 w-full" rounded="md" />
          <Skeleton className="h-4 w-32" rounded="sm" />
          <Skeleton className="h-12 w-full" rounded="md" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Ajustes"
      description="Preferencias y presupuesto mensual"
    >
      <GlassCard className="p-6 md:p-8 max-w-2xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
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

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={!isDirty || submitting}
            >
              Guardar
            </Button>

            {savedAt && !isDirty ? (
              <motion.span
                key={savedAt}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-success)]"
                role="status"
              >
                <Check className="size-4" aria-hidden />
                Guardado
              </motion.span>
            ) : null}
          </div>
        </form>
      </GlassCard>
    </PageContainer>
  );
}
