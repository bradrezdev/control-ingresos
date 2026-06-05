/**
 * DebtForm — control-ingresos
 *
 * Create/edit form for a debt record. Used inside a Drawer. Uses
 * react-hook-form + zodResolver.
 *
 * The `originalAmount` and `fixedMonthlyPayment` are stored as display
 * numbers in the data layer (the repo doesn't currently express
 * Money in cents — the debt schema uses `.number().positive()`).
 * `remainingBalance` defaults to `originalAmount` on create and is
 * preserved on edit (payment tracking drives it down via
 * `recordPayment`).
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { DateInput } from "@/components/form/DateInput";
import { useDebtsStore } from "@/stores/debtsStore";
import { toIsoDateString } from "@/lib/date/format";
import type { Debt, DebtInput } from "@/db/schemas/debt";

const debtFormSchema = z
  .object({
    creditor: z
      .string()
      .min(1, "Ingresá el acreedor")
      .max(80, "Máximo 80 caracteres"),
    description: z
      .string()
      .max(160, "Máximo 160 caracteres")
      .optional(),
    originalAmount: z
      .number({ error: "Ingresá un monto válido" })
      .positive("Debe ser positivo"),
    fixedMonthlyPayment: z
      .number({ error: "Ingresá un monto válido" })
      .positive("Debe ser positivo"),
    startDate: z
      .string()
      .min(10, "Fecha inválida")
      .refine((s) => !Number.isNaN(Date.parse(s)), "Fecha inválida"),
    endDate: z
      .string()
      .optional()
      .refine(
        (s) => !s || !Number.isNaN(Date.parse(s)),
        "Fecha inválida",
      ),
  })
  .refine(
    (data) => {
      // Payment can't exceed the original amount.
      return data.fixedMonthlyPayment <= data.originalAmount;
    },
    {
      path: ["fixedMonthlyPayment"],
      message: "La mensualidad no puede superar el monto original",
    },
  );

type DebtFormValues = z.infer<typeof debtFormSchema>;

export interface DebtFormProps {
  debt?: Debt | undefined;
  onSaved: () => void;
  onCancel: () => void;
}

export function DebtForm({ debt, onSaved, onCancel }: DebtFormProps): React.JSX.Element {
  const isEdit = !!debt;
  const create = useDebtsStore((s) => s.create);
  const update = useDebtsStore((s) => s.update);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: debtToFormValues(debt),
  });

  useEffect(() => {
    reset(debtToFormValues(debt));
  }, [debt, reset]);

  const watchedOriginal = watch("originalAmount");
  const watchedMonthly = watch("fixedMonthlyPayment");
  const watchedStart = watch("startDate");

  async function onSubmit(values: DebtFormValues): Promise<void> {
    if (!isDirty) {
      onSaved();
      return;
    }
    const startDateIso = new Date(values.startDate).toISOString();
    const baseInput: DebtInput = {
      creditor: values.creditor.trim(),
      originalAmount: values.originalAmount,
      remainingBalance: debt?.remainingBalance ?? values.originalAmount,
      fixedMonthlyPayment: values.fixedMonthlyPayment,
      startDate: startDateIso,
      ...(values.description && values.description.trim()
        ? { description: values.description.trim() }
        : {}),
      ...(values.endDate ? { endDate: new Date(values.endDate).toISOString() } : {}),
    };
    if (debt) {
      await update(debt.id, baseInput);
    } else {
      await create(baseInput);
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="debt-creditor"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Acreedor
        </label>
        <Input
          id="debt-creditor"
          placeholder="Banco, persona, financiera…"
          invalid={!!errors.creditor}
          autoComplete="off"
          {...register("creditor")}
        />
        {errors.creditor ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.creditor.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="debt-description"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Descripción{" "}
          <span className="text-[var(--color-text-muted)] font-normal">
            (opcional)
          </span>
        </label>
        <Textarea
          id="debt-description"
          rows={2}
          placeholder="Préstamo auto, tarjeta adicional, etc."
          invalid={!!errors.description}
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
            htmlFor="debt-original"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Monto original
          </label>
          <CurrencyInput
            id="debt-original"
            value={Math.round((watchedOriginal ?? 0) * 100)}
            onChangeCents={(cents) => {
              setValue("originalAmount", cents / 100, { shouldDirty: true });
            }}
            invalid={!!errors.originalAmount}
          />
          {errors.originalAmount ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.originalAmount.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="debt-monthly"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Mensualidad
          </label>
          <CurrencyInput
            id="debt-monthly"
            value={Math.round((watchedMonthly ?? 0) * 100)}
            onChangeCents={(cents) => {
              setValue("fixedMonthlyPayment", cents / 100, {
                shouldDirty: true,
              });
            }}
            invalid={!!errors.fixedMonthlyPayment}
          />
          {errors.fixedMonthlyPayment ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.fixedMonthlyPayment.message}
            </p>
          ) : null}
        </div>
      </div>

      <DateInput
        label="Fecha de inicio"
        value={watchedStart ?? ""}
        onValueChange={(iso) => setValue("startDate", iso, { shouldDirty: true })}
        invalid={!!errors.startDate}
        {...register("startDate")}
      />

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
          disabled={!isDirty || isSubmitting}
        >
          {isEdit ? "Guardar cambios" : "Crear deuda"}
        </Button>
      </div>
    </form>
  );
}

function debtToFormValues(debt: Debt | undefined): DebtFormValues {
  if (!debt) {
    return {
      creditor: "",
      description: "",
      originalAmount: 0,
      fixedMonthlyPayment: 0,
      startDate: toIsoDateString(new Date()),
      endDate: undefined,
    };
  }
  return {
    creditor: debt.creditor,
    description: debt.description ?? "",
    originalAmount: debt.originalAmount,
    fixedMonthlyPayment: debt.fixedMonthlyPayment,
    startDate: toIsoDateString(new Date(debt.startDate)),
    endDate: debt.endDate ? toIsoDateString(new Date(debt.endDate)) : undefined,
  };
}
