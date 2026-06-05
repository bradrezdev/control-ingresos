/**
 * TransactionForm — control-ingresos
 *
 * Create/edit form for any transaction (Income / Direct Expense / MSI).
 * Renders inside a Drawer. The form is fully controlled by react-hook-form
 * with zodResolver; dynamic fields are revealed via `watch()`:
 *   - `paymentMethod === "credit"` shows CardSelect
 *   - `type === "expense_msi"` shows MsiSelector + msiStartDate
 *
 * On submit the validated input is passed to `onSubmit`. The caller
 * (Transactions page) is responsible for persisting via transactionsRepo.
 */
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { DateInput } from "@/components/form/DateInput";
import { CardSelect } from "@/components/form/CardSelect";
import { MsiSelector } from "@/components/form/MsiSelector";
import { getMsiMonthlyAmount } from "@/engine/msi";
import { toIsoDateString } from "@/lib/date/format";
import { displayToCents, centsToDisplay, formatCurrency } from "@/lib/money/format";
import type { MsiTerm } from "@/db/schemas/transaction";
import type { Transaction } from "@/db/schemas/transaction";

const baseFields = z.object({
  type: z.enum(["income", "expense", "expense_msi"]),
  amount: z
    .number({ error: "Ingresá un monto válido" })
    .positive("El monto debe ser positivo"),
  description: z
    .string()
    .min(1, "Ingresá una descripción")
    .max(120, "Máximo 120 caracteres"),
  date: z.string().min(10, "Fecha inválida"),
  category: z.string().max(60).optional(),
  paymentMethod: z.enum(["cash", "debit", "credit", "transfer"]),
  cardId: z.string().optional(),
  msiMonths: z
    .union([z.literal(3), z.literal(6), z.literal(9), z.literal(12), z.literal(18), z.literal(24)])
    .optional(),
  msiStartDate: z.string().optional(),
});

const transactionFormSchema = baseFields
  .refine(
    (data) => data.paymentMethod !== "credit" || (data.cardId && data.cardId.length > 0),
    {
      path: ["cardId"],
      message: "Seleccioná una tarjeta",
    },
  )
  .refine(
    (data) => data.type !== "expense_msi" || data.paymentMethod === "credit",
    {
      path: ["paymentMethod"],
      message: "MSI requiere método de pago con tarjeta de crédito",
    },
  )
  .refine(
    (data) => data.type !== "expense_msi" || (data.msiMonths !== undefined),
    {
      path: ["msiMonths"],
      message: "Seleccioná un plazo",
    },
  )
  .refine(
    (data) => data.type !== "expense_msi" || (data.msiStartDate && data.msiStartDate.length >= 10),
    {
      path: ["msiStartDate"],
      message: "Fecha de inicio requerida",
    },
  );

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const TYPE_OPTIONS = [
  { value: "income", label: "Ingreso" },
  { value: "expense", label: "Gasto directo" },
  { value: "expense_msi", label: "Gasto a MSI" },
];

const METHOD_OPTIONS = [
  { value: "cash", label: "Efectivo" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "transfer", label: "Transferencia" },
];

export interface TransactionFormValues_Output {
  type: Transaction["type"];
  amount: number;
  description: string;
  date: string;
  category: string | undefined;
  paymentMethod: Transaction["paymentMethod"];
  cardId: string | undefined;
  msiMonths: MsiTerm | undefined;
  msiStartDate: string | undefined;
}

export interface TransactionFormProps {
  transaction?: Transaction | undefined;
  currency: string;
  onSubmit: (values: TransactionFormValues_Output) => Promise<void> | void;
  onCancel: () => void;
}

export function TransactionForm({
  transaction,
  currency,
  onSubmit,
  onCancel,
}: TransactionFormProps): React.JSX.Element {
  const isEdit = !!transaction;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultsFor(transaction),
  });

  useEffect(() => {
    reset(defaultsFor(transaction));
  }, [transaction, reset]);

  const watchedType = watch("type");
  const watchedMethod = watch("paymentMethod");
  const watchedAmount = watch("amount");
  const watchedMsiMonths = watch("msiMonths");
  const watchedDate = watch("date");

  const amountCents = useMemo(() => {
    if (typeof watchedAmount === "number" && Number.isFinite(watchedAmount)) {
      return Math.round(watchedAmount * 100);
    }
    return 0;
  }, [watchedAmount]);

  const isMsi = watchedType === "expense_msi";
  const showCardSelect = watchedMethod === "credit" || isMsi;

  const monthlyPreview = useMemo(() => {
    if (!isMsi || !watchedMsiMonths) return null;
    return getMsiMonthlyAmount(centsToDisplay(amountCents), watchedMsiMonths);
  }, [isMsi, watchedMsiMonths, amountCents]);

  async function handleFormSubmit(values: TransactionFormValues): Promise<void> {
    if (!isDirty && isEdit) {
      onCancel();
      return;
    }
    await onSubmit({
      type: values.type,
      amount: values.amount,
      description: values.description.trim(),
      date: new Date(values.date).toISOString(),
      category: values.category?.trim() || undefined,
      paymentMethod: values.paymentMethod,
      cardId: values.cardId && values.cardId.length > 0 ? values.cardId : undefined,
      msiMonths: values.msiMonths,
      msiStartDate:
        values.msiStartDate && values.msiStartDate.length >= 10
          ? new Date(values.msiStartDate).toISOString()
          : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="tx-type"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Tipo
        </label>
        <Select
          id="tx-type"
          options={TYPE_OPTIONS}
          value={watchedType}
          onChange={(e) =>
            setValue("type", e.target.value as TransactionFormValues["type"], {
              shouldDirty: true,
            })
          }
        />
        <input type="hidden" {...register("type")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="tx-amount"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Monto
        </label>
        <CurrencyInput
          id="tx-amount"
          currency={currency}
          value={amountCents}
          onChangeCents={(cents) =>
            setValue("amount", displayToCents(cents) / 100, {
              shouldDirty: true,
            })
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
          htmlFor="tx-desc"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Descripción
        </label>
        <Input
          id="tx-desc"
          placeholder="Salario, súper, vuelo a Madrid…"
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
        <DateInput
          label="Fecha"
          value={watchedDate ?? ""}
          onValueChange={(iso) => setValue("date", iso, { shouldDirty: true })}
          invalid={!!errors.date}
          {...register("date")}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tx-category"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Categoría <span className="text-[var(--color-text-muted)] font-normal">(opcional)</span>
          </label>
          <Input
            id="tx-category"
            placeholder="Comida, transporte…"
            invalid={!!errors.category}
            autoComplete="off"
            {...register("category")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="tx-method"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Método de pago
        </label>
        <Select
          id="tx-method"
          options={METHOD_OPTIONS}
          value={watchedMethod}
          onChange={(e) =>
            setValue("paymentMethod", e.target.value as TransactionFormValues["paymentMethod"], {
              shouldDirty: true,
            })
          }
        />
        {errors.paymentMethod ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.paymentMethod.message}
          </p>
        ) : null}
        <input type="hidden" {...register("paymentMethod")} />
      </div>

      {showCardSelect ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tx-card"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Tarjeta
          </label>
          <CardSelect
            id="tx-card"
            value={watch("cardId") ?? ""}
            onChange={(cardId) => setValue("cardId", cardId, { shouldDirty: true })}
            invalid={!!errors.cardId}
          />
          {errors.cardId ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.cardId.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {isMsi ? (
        <>
          <input type="hidden" {...register("cardId")} />
          <MsiSelector
            totalCents={amountCents}
            value={watchedMsiMonths ?? null}
            onChange={(term) =>
              setValue("msiMonths", term, { shouldDirty: true })
            }
            currency={currency}
          />
          {errors.msiMonths ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.msiMonths.message}
            </p>
          ) : null}
          {monthlyPreview !== null ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Cuota mensual: <strong className="text-[var(--color-text-body)]">
                {formatCurrency(monthlyPreview * 100, currency)}
              </strong>{" "}
              durante {watchedMsiMonths} meses.
            </p>
          ) : null}
          <DateInput
            label="Inicio del MSI"
            value={watch("msiStartDate") ?? ""}
            onValueChange={(iso) =>
              setValue("msiStartDate", iso, { shouldDirty: true })
            }
            invalid={!!errors.msiStartDate}
            {...register("msiStartDate")}
          />
          {errors.msiStartDate ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.msiStartDate.message}
            </p>
          ) : null}
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
          {isEdit ? "Guardar cambios" : "Crear transacción"}
        </Button>
      </div>
    </form>
  );
}

function defaultsFor(tx: Transaction | undefined): TransactionFormValues {
  if (!tx) {
    return {
      type: "expense",
      amount: 0,
      description: "",
      date: toIsoDateString(new Date()),
      category: "",
      paymentMethod: "cash",
      cardId: "",
      msiMonths: undefined,
      msiStartDate: toIsoDateString(new Date()),
    };
  }
  return {
    type: tx.type,
    amount: centsToDisplay(tx.amount),
    description: tx.description,
    date: toIsoDateString(new Date(tx.date)),
    category: tx.category ?? "",
    paymentMethod: tx.paymentMethod,
    cardId: "cardId" in tx ? tx.cardId ?? "" : "",
    msiMonths: tx.type === "expense_msi" ? tx.msiMonths : undefined,
    msiStartDate:
      tx.type === "expense_msi"
        ? toIsoDateString(new Date(tx.msiStartDate))
        : toIsoDateString(new Date()),
  };
}
