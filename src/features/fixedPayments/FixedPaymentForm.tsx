/**
 * FixedPaymentForm — control-ingresos
 *
 * Create/edit form for a fixed payment record. Used inside a Drawer.
 * Uses react-hook-form + zodResolver. The local zod schema mirrors the
 * repository's `FixedPaymentSchema` shape but with `id` / `createdAt` /
 * `updatedAt` omitted (the repo handles those). The repo's Zod
 * parse-before-persist is the final guardrail.
 *
 * Conditional fields via `watch`:
 *   - `paymentMethod === "debit"`  → `CardSelect cardType="debit"`
 *   - `paymentMethod === "credit"` → `CardSelect cardType="credit"` + meses MSI 1-48
 */
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { CardSelect } from "@/components/form/CardSelect";
import { useFixedPaymentsStore } from "@/stores/fixedPaymentsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getMsiMonthlyAmount } from "@/engine/msi";
import { formatCurrency } from "@/lib/money/format";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

const PERIOD_LABELS: Record<FixedPayment["period"], string> = {
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
};

const METHOD_LABELS: Record<FixedPayment["paymentMethod"], string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};

const fixedPaymentFormSchema = z
  .object({
    amount: z
      .number({ error: "Ingresá un monto válido" })
      .positive("El monto debe ser positivo"),
    description: z
      .string()
      .min(1, "Ingresá una descripción")
      .max(120, "Máximo 120 caracteres"),
    paymentDay: z
      .number({ error: "Ingresá un día entre 1 y 31" })
      .int("Debe ser entero")
      .min(1, "Mínimo 1")
      .max(31, "Máximo 31"),
    period: z.enum(["monthly", "bimonthly", "quarterly"]),
    category: z.string().max(60).optional(),
    paymentMethod: z.enum(["cash", "debit", "credit", "transfer"]),
    cardId: z.string().optional(),
    msiMonths: z.number().int().min(1).max(48).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.paymentMethod === "debit" || data.paymentMethod === "credit") &&
      (!data.cardId || data.cardId.length === 0)
    ) {
      ctx.addIssue({
        path: ["cardId"],
        code: "custom",
        message: "Seleccioná una tarjeta",
      });
    }
    if (data.paymentMethod !== "credit" && data.msiMonths !== undefined) {
      ctx.addIssue({
        path: ["msiMonths"],
        code: "custom",
        message: "Solo crédito puede tener MSI",
      });
    }
  });

type FixedPaymentFormValues = z.infer<typeof fixedPaymentFormSchema>;

const PERIOD_OPTIONS = (
  Object.keys(PERIOD_LABELS) as FixedPayment["period"][]
).map((p) => ({ value: p, label: PERIOD_LABELS[p] }));

const METHOD_OPTIONS = (
  Object.keys(METHOD_LABELS) as FixedPayment["paymentMethod"][]
).map((m) => ({ value: m, label: METHOD_LABELS[m] }));

const MSI_OPTIONS = Array.from({ length: 48 }, (_, i) => i + 1).map((n) => ({
  value: String(n),
  label: `${n} ${n === 1 ? "mes" : "meses"}`,
}));

export interface FixedPaymentFormProps {
  fixedPayment?: FixedPayment;
  onSaved: () => void;
  onCancel: () => void;
}

export function FixedPaymentForm({
  fixedPayment,
  onSaved,
  onCancel,
}: FixedPaymentFormProps): React.JSX.Element {
  const isEdit = !!fixedPayment;
  const create = useFixedPaymentsStore((s) => s.create);
  const update = useFixedPaymentsStore((s) => s.update);
  const currency = useSettingsStore((s) => s.settings?.currency ?? "MXN");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FixedPaymentFormValues>({
    resolver: zodResolver(fixedPaymentFormSchema),
    defaultValues: fixedPaymentToFormValues(fixedPayment),
  });

  useEffect(() => {
    reset(fixedPaymentToFormValues(fixedPayment));
  }, [fixedPayment, reset]);

  const watchedMethod = watch("paymentMethod");
  const watchedAmount = watch("amount");
  const watchedMsiMonths = watch("msiMonths");
  const watchedCardId = watch("cardId");

  const amountCents = useMemo(() => {
    if (typeof watchedAmount === "number" && Number.isFinite(watchedAmount)) {
      return Math.round(watchedAmount);
    }
    return 0;
  }, [watchedAmount]);

  const monthlyPreview = useMemo(() => {
    if (watchedMethod !== "credit" || !watchedMsiMonths) return null;
    return getMsiMonthlyAmount(amountCents, watchedMsiMonths);
  }, [watchedMethod, watchedMsiMonths, amountCents]);

  async function onSubmit(values: FixedPaymentFormValues): Promise<void> {
    if (!isDirty && isEdit) {
      onSaved();
      return;
    }
    const cardId =
      values.paymentMethod === "debit" || values.paymentMethod === "credit"
        ? values.cardId
        : undefined;
    const msiMonths =
      values.paymentMethod === "credit" ? values.msiMonths : undefined;
    const input = {
      amount: values.amount,
      description: values.description.trim(),
      paymentDay: values.paymentDay,
      period: values.period,
      paymentMethod: values.paymentMethod,
      ...(values.category && values.category.trim()
        ? { category: values.category.trim() }
        : {}),
      ...(cardId ? { cardId } : {}),
      ...(msiMonths ? { msiMonths } : {}),
    };
    if (fixedPayment) {
      await update(fixedPayment.id, input);
    } else {
      await create(input);
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fp-amount"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Monto
        </label>
        <CurrencyInput
          id="fp-amount"
          currency={currency}
          value={amountCents}
          onChangeCents={(cents) =>
            setValue("amount", cents, { shouldDirty: true })
          }
          invalid={!!errors.amount}
        />
        {errors.amount ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.amount.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fp-description"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Descripción
        </label>
        <Input
          id="fp-description"
          placeholder="Renta, Netflix, luz…"
          invalid={!!errors.description}
          autoComplete="off"
          {...register("description")}
        />
        {errors.description ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.description.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fp-payment-day"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Día del mes
          </label>
          <Input
            id="fp-payment-day"
            type="number"
            min={1}
            max={31}
            invalid={!!errors.paymentDay}
            {...register("paymentDay", { valueAsNumber: true })}
          />
          {errors.paymentDay ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.paymentDay.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fp-period"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Período
          </label>
          <Select
            id="fp-period"
            options={PERIOD_OPTIONS}
            value={watch("period")}
            onChange={(e) =>
              setValue(
                "period",
                e.target.value as FixedPaymentFormValues["period"],
                { shouldDirty: true },
              )
            }
          />
          <input type="hidden" {...register("period")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fp-category"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Categoría{" "}
          <span className="text-[var(--color-text-muted)] font-normal">
            (opcional)
          </span>
        </label>
        <Input
          id="fp-category"
          placeholder="Hogar, entretenimiento…"
          invalid={!!errors.category}
          autoComplete="off"
          {...register("category")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fp-method"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Método de pago
        </label>
        <Select
          id="fp-method"
          options={METHOD_OPTIONS}
          value={watchedMethod}
          onChange={(e) =>
            setValue(
              "paymentMethod",
              e.target.value as FixedPaymentFormValues["paymentMethod"],
              { shouldDirty: true },
            )
          }
        />
        {errors.paymentMethod ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.paymentMethod.message}
          </p>
        ) : null}
        <input type="hidden" {...register("paymentMethod")} />
      </div>

      {watchedMethod === "debit" ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fp-card"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Tarjeta de débito
          </label>
          <CardSelect
            id="fp-card"
            cardType="debit"
            value={watchedCardId ?? ""}
            onChange={(cardId) =>
              setValue("cardId", cardId, { shouldDirty: true })
            }
            invalid={!!errors.cardId}
          />
          {errors.cardId ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.cardId.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {watchedMethod === "credit" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fp-card"
              className="text-sm font-medium text-[var(--color-text-body)]"
            >
              Tarjeta de crédito
            </label>
            <CardSelect
              id="fp-card"
              cardType="credit"
              value={watchedCardId ?? ""}
              onChange={(cardId) =>
                setValue("cardId", cardId, { shouldDirty: true })
              }
              invalid={!!errors.cardId}
            />
            {errors.cardId ? (
              <p role="alert" className="text-xs text-[var(--color-danger)]">
                {errors.cardId.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fp-msi"
              className="text-sm font-medium text-[var(--color-text-body)]"
            >
              Meses sin intereses{" "}
              <span className="text-[var(--color-text-muted)] font-normal">
                (opcional)
              </span>
            </label>
            <Select
              id="fp-msi"
              options={MSI_OPTIONS}
              value={watchedMsiMonths ? String(watchedMsiMonths) : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setValue("msiMonths", undefined, { shouldDirty: true });
                } else {
                  setValue("msiMonths", Number(v), { shouldDirty: true });
                }
              }}
            />
            {errors.msiMonths ? (
              <p role="alert" className="text-xs text-[var(--color-danger)]">
                {errors.msiMonths.message}
              </p>
            ) : null}
            {monthlyPreview !== null && watchedMsiMonths ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                Cuota mensual:{" "}
                <strong className="text-[var(--color-text-body)]">
                  {formatCurrency(monthlyPreview, currency)}
                </strong>{" "}
                durante {watchedMsiMonths} meses.
              </p>
            ) : null}
            <input type="hidden" {...register("msiMonths")} />
          </div>
        </>
      ) : null}

      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEdit ? "Guardar cambios" : "Crear pago fijo"}
        </Button>
      </div>
    </form>
  );
}

function fixedPaymentToFormValues(
  fp: FixedPayment | undefined,
): FixedPaymentFormValues {
  if (!fp) {
    return {
      amount: 0,
      description: "",
      paymentDay: 1,
      period: "monthly",
      category: "",
      paymentMethod: "cash",
      cardId: "",
      msiMonths: undefined,
    };
  }
  return {
    amount: fp.amount,
    description: fp.description,
    paymentDay: fp.paymentDay,
    period: fp.period,
    category: fp.category ?? "",
    paymentMethod: fp.paymentMethod,
    cardId: fp.cardId ?? "",
    msiMonths: fp.msiMonths,
  };
}
