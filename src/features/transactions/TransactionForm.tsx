/**
 * TransactionForm — control-ingresos (redesign, T7)
 *
 * Single create/edit entry form for any transaction (Gasto / Ingreso /
 * A meses), equivalent to the prototype's `#entry-screen`. Used by the
 * full-screen "Nueva transacción" page AND by the Movimientos edit
 * sheet — there is exactly one form and one submit path
 * (`useTransactionSubmit`).
 *
 * Layout per prototype `.ref-entry`:
 *   - SegmentedControl for the type (Gasto · Ingreso · A meses)
 *   - Big amount input (44/800, `$` prefix) with the MSI quota notice
 *   - PaperCard with descripción, plazo (quick grid + "Otro"), categoría
 *     chips (live data + free input), tarjeta/cuenta chips, fecha row
 *     and the "Primera cuota" disclosure (MSI)
 *   - Fixed save block: gray+disabled with an explanatory hint until the
 *     zod schema validates, primary when valid, error + "Reintentar" on
 *     a failed save
 *
 * Validation is the same zod schema as before (S9: conserva las
 * validaciones) with es-MX tuteo messages; the hint surfaces the first
 * issue by field priority, exactly like the prototype's `issue()`.
 */
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { parseISO } from "date-fns";
import { Chip, PaperCard, SegmentedControl } from "@/components/ui/design";
import { AmountInput } from "@/components/form/AmountInput";
import { getMsiMonthlyAmount, MSI_TERMS } from "@/engine/msi";
import { formatDayAndMonth, toIsoDateString } from "@/lib/date/format";
import { formatCurrency } from "@/lib/money/format";
import { cn } from "@/lib/cn";
import type { Card } from "@/db/schemas/card";
import type { MsiTerm, Transaction } from "@/db/schemas/transaction";

/** Domain term range (engine `MSI_TERMS`: 1–48). The quick grid is only presentation (L8). */
const MIN_TERM = MSI_TERMS[0] ?? 1;
const MAX_TERM = MSI_TERMS[MSI_TERMS.length - 1] ?? 48;
const TERM_RANGE_MESSAGE = `Elige un plazo de ${MIN_TERM} a ${MAX_TERM} meses`;

/** Quick-pick terms shown in the 4-column grid (REDESIGN §Fase 2.9 + L8). */
const QUICK_TERMS: readonly number[] = [4, 10, 12, 15, 18, 24];

const baseFields = z.object({
  type: z.enum(["income", "expense", "expense_msi"]),
  amount: z
    .number({ error: "Ingresa un monto válido" })
    .positive("Falta el monto"),
  description: z
    .string()
    .min(1, "Falta la descripción")
    .max(120, "Máximo 120 caracteres"),
  date: z.string().min(10, "Elige una fecha válida"),
  category: z.string().max(60).optional(),
  paymentMethod: z.enum(["cash", "debit", "credit", "transfer"]),
  cardId: z.string().optional(),
  msiMonths: z
    .number()
    .int()
    .min(MIN_TERM, TERM_RANGE_MESSAGE)
    .max(MAX_TERM, TERM_RANGE_MESSAGE)
    .optional(),
  msiStartDate: z.string().optional(),
});

const transactionFormSchema = baseFields
  .refine(
    (data) => data.paymentMethod !== "credit" || (data.cardId && data.cardId.length > 0),
    {
      path: ["cardId"],
      message: "Elige una tarjeta",
    },
  )
  .refine(
    (data) => data.type !== "expense_msi" || data.paymentMethod === "credit",
    {
      path: ["paymentMethod"],
      message: "MSI requiere tarjeta de crédito",
    },
  )
  .refine(
    (data) => data.type !== "expense_msi" || (data.msiMonths !== undefined),
    {
      path: ["msiMonths"],
      message: "Elige un plazo",
    },
  )
  .refine(
    (data) => data.type !== "expense_msi" || (data.msiStartDate && data.msiStartDate.length >= 10),
    {
      path: ["msiStartDate"],
      message: "Revisa la fecha de la primera cuota",
    },
  );

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const TYPE_OPTIONS = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
  { value: "expense_msi", label: "A meses" },
] as const;

/**
 * First blocking issue for the save area, mirroring the prototype's
 * `issue()` (reference-ui.js): synchronous, derived from the watched
 * values, in the same priority the prototype uses. The zod schema above
 * remains the submit gate; this only drives the hint + disabled button
 * so the initial state is correct on the very first render (no async
 * validation flash).
 */
function getEntryIssue(values: TransactionFormValues): string | null {
  if (typeof values.amount !== "number" || !Number.isFinite(values.amount)) {
    return "Ingresa un monto válido";
  }
  if (values.amount <= 0) return "Falta el monto";
  if (!values.description.trim()) return "Falta la descripción";
  if (values.type === "expense_msi") {
    if (values.msiMonths === undefined) return "Elige un plazo";
    if (
      !Number.isInteger(values.msiMonths) ||
      values.msiMonths < MIN_TERM ||
      values.msiMonths > MAX_TERM
    ) {
      return TERM_RANGE_MESSAGE;
    }
  }
  if (values.paymentMethod === "credit" && !(values.cardId && values.cardId.length > 0)) {
    return "Elige una tarjeta";
  }
  if (values.type === "expense_msi" && values.paymentMethod !== "credit") {
    return "MSI requiere tarjeta de crédito";
  }
  if (!values.date || values.date.length < 10) return "Elige una fecha válida";
  if (
    values.type === "expense_msi" &&
    (!values.msiStartDate || values.msiStartDate.length < 10)
  ) {
    return "Revisa la fecha de la primera cuota";
  }
  return null;
}

interface AccountOption {
  key: string;
  label: string;
  method: TransactionFormValues["paymentMethod"];
  card?: Card;
}

function accountOptionsFor(
  type: TransactionFormValues["type"],
  cards: readonly Card[],
): AccountOption[] {
  if (type === "expense_msi") {
    return cards
      .filter((card) => card.cardType === "credit")
      .map((card) => ({
        key: `card-${card.id}`,
        label: card.bank,
        method: "credit" as const,
        card,
      }));
  }
  const cardOptions: AccountOption[] =
    type === "income"
      ? []
      : cards.map((card) => ({
          key: `card-${card.id}`,
          label: card.bank,
          method: card.cardType === "credit" ? ("credit" as const) : ("debit" as const),
          card,
        }));
  return [
    ...cardOptions,
    { key: "cash", label: "Efectivo", method: "cash" as const },
    { key: "transfer", label: "Transferencia", method: "transfer" as const },
  ];
}

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
  /** Live cards for the payment chips (useLiveCards). */
  cards?: readonly Card[];
  /** Categories already in use, derived from live transactions. */
  suggestedCategories?: readonly string[];
  onSubmit: (values: TransactionFormValues_Output) => Promise<void> | void;
  onCancel?: () => void;
}

const fieldInputClass =
  "h-12 w-full rounded-md border-[1.5px] border-border-strong bg-surface px-3.5 text-body font-medium placeholder:text-muted";
const legendClass = "mb-2 text-aux font-semibold text-muted";

export function TransactionForm({
  transaction,
  currency,
  cards = [],
  suggestedCategories = [],
  onSubmit,
  onCancel,
}: TransactionFormProps): React.JSX.Element {
  const isEdit = !!transaction;

  const uid = useId();
  const amountInputId = `tx-amount-${uid}`;
  const descriptionId = `tx-desc-${uid}`;
  const otherTermId = `tx-term-${uid}`;
  const categoryId = `tx-category-${uid}`;
  const firstDateId = `tx-first-${uid}`;

  const [saveError, setSaveError] = useState<string | null>(null);
  const [otherTerm, setOtherTerm] = useState<boolean>(() =>
    transaction?.type === "expense_msi"
      ? !QUICK_TERMS.includes(transaction.msiMonths)
      : false,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultsFor(transaction),
  });

  // Remount/reset with the (possibly new) transaction. Validation for the
  // hint is synchronous (`getEntryIssue` over watched values), so the
  // disabled button + hint are correct from the first render.
  useEffect(() => {
    reset(defaultsFor(transaction));
    setOtherTerm(
      transaction?.type === "expense_msi"
        ? !QUICK_TERMS.includes(transaction.msiMonths)
        : false,
    );
    setSaveError(null);
  }, [transaction, reset]);

  const watchedType = watch("type");
  const watchedMethod = watch("paymentMethod");
  const watchedCardId = watch("cardId");
  const watchedAmount = watch("amount");
  const watchedMsiMonths = watch("msiMonths");
  const watchedDate = watch("date");
  const watchedMsiStartDate = watch("msiStartDate");
  const watchedCategory = watch("category");
  const watchedDescription = watch("description");

  const isMsi = watchedType === "expense_msi";
  const accountOptions = accountOptionsFor(watchedType, cards);

  // El schema Zod ya restringe los métodos válidos por tipo (IncomeSchema:
  // cash/transfer; MsiExpenseSchema: credit) — los chips reflejan esa
  // restricción. Si el tipo cambia y el método guardado deja de ser válido,
  // se restablece a la primera opción válida (mismo efecto que el Select
  // original).
  useEffect(() => {
    if (accountOptions.length === 0) return;
    const valid = new Set(accountOptions.map((option) => option.method));
    if (!valid.has(watchedMethod)) {
      const fallback = accountOptions[0] ?? null;
      setValue("paymentMethod", fallback?.method ?? "cash", {
        shouldDirty: true,
      });
      if (!fallback?.card) {
        setValue("cardId", "", { shouldDirty: true });
      }
    }
  }, [watchedType, watchedMethod, accountOptions, setValue]);

  // El campo `amount` del form contiene centavos enteros (mismo contrato que
  // la storage layer — ADR-03). AmountInput emite cents directamente.
  const amountCents =
    typeof watchedAmount === "number" && Number.isFinite(watchedAmount)
      ? Math.round(watchedAmount)
      : 0;

  const monthlyQuotaCents =
    isMsi &&
    amountCents > 0 &&
    typeof watchedMsiMonths === "number" &&
    Number.isInteger(watchedMsiMonths) &&
    watchedMsiMonths >= MIN_TERM &&
    watchedMsiMonths <= MAX_TERM
      ? getMsiMonthlyAmount(amountCents, watchedMsiMonths)
      : null;

  const issue = getEntryIssue({
    type: watchedType,
    amount: watchedAmount,
    description: watchedDescription ?? "",
    date: watchedDate ?? "",
    category: watchedCategory,
    paymentMethod: watchedMethod,
    cardId: watchedCardId,
    msiMonths: watchedMsiMonths,
    msiStartDate: watchedMsiStartDate,
  });
  const formInvalid = issue !== null;

  function selectType(next: string): void {
    setValue("type", next as TransactionFormValues["type"], {
      shouldDirty: true,
    });
  }

  function selectAccountOption(option: AccountOption): void {
    setValue("paymentMethod", option.method, {
      shouldDirty: true,
    });
    setValue("cardId", option.card ? option.card.id : "", {
      shouldDirty: true,
    });
  }

  function selectQuickTerm(term: number): void {
    setOtherTerm(false);
    setValue("msiMonths", term, { shouldDirty: true });
  }

  function selectOtherTerm(): void {
    setOtherTerm(true);
    setValue("msiMonths", undefined, { shouldDirty: true });
  }

  function onOtherTermChange(raw: string): void {
    const parsed = raw === "" ? undefined : Number(raw);
    setValue(
      "msiMonths",
      parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      { shouldDirty: true },
    );
  }

  async function handleFormSubmit(values: TransactionFormValues): Promise<void> {
    setSaveError(null);
    if (!isDirty && isEdit) {
      onCancel?.();
      return;
    }
    // R-4 (bug 4): pasamos el string YYYY-MM-DD directo, sin round-trip
    // por Date/toISOString (que producía el drift de +1 día en UTC-).
    try {
      await onSubmit({
        type: values.type,
        amount: values.amount,
        description: values.description.trim(),
        date: values.date,
        category: values.category?.trim() || undefined,
        paymentMethod: values.paymentMethod,
        cardId: values.cardId && values.cardId.length > 0 ? values.cardId : undefined,
        msiMonths: values.msiMonths,
        msiStartDate:
          values.msiStartDate && values.msiStartDate.length >= 10
            ? values.msiStartDate
            : undefined,
      });
    } catch {
      setSaveError("No se pudo guardar el movimiento. Revisa tu conexión e intenta de nuevo.");
    }
  }

  function retrySubmit(): void {
    void handleSubmit(handleFormSubmit)();
  }

  const dayCaption = dateCaption(watchedDate);
  const firstCaption = dateCaption(watchedMsiStartDate);

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex min-h-full w-full flex-col gap-3.5"
    >
      <SegmentedControl
        options={TYPE_OPTIONS.map((option) => ({ ...option }))}
        value={watchedType}
        onChange={selectType}
        aria-label="Tipo de movimiento"
      />

      <section className="flex flex-col">
        <label htmlFor={amountInputId} className={legendClass}>
          Monto
        </label>
        <AmountInput
          id={amountInputId}
          currency={currency}
          value={amountCents}
          onChangeCents={(cents) =>
            setValue("amount", cents, { shouldDirty: true })
          }
        />
        {isMsi ? (
          <p aria-live="polite" className="mt-2 text-aux text-muted">
            {monthlyQuotaCents !== null
              ? `Cuota mensual: ${formatCurrency(monthlyQuotaCents, currency)}`
              : "Cuota mensual: se calcula con el monto y el plazo"}
          </p>
        ) : null}
      </section>

      <PaperCard className="flex flex-col gap-[18px] p-5">
        <div className="flex flex-col">
          <label htmlFor={descriptionId} className={legendClass}>
            Descripción
          </label>
          <input
            id={descriptionId}
            type="text"
            placeholder="¿En qué fue?"
            maxLength={120}
            autoComplete="off"
            className={fieldInputClass}
            {...register("description")}
          />
        </div>

        {isMsi ? (
          <fieldset className="flex flex-col">
            <legend className={legendClass}>Plazo en meses</legend>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_TERMS.map((term) => (
                <Chip
                  key={term}
                  variant="inset"
                  active={!otherTerm && watchedMsiMonths === term}
                  onClick={() => selectQuickTerm(term)}
                >
                  {term}
                </Chip>
              ))}
              <Chip variant="inset" active={otherTerm} onClick={selectOtherTerm}>
                Otro
              </Chip>
            </div>
            {otherTerm ? (
              <div className="mt-3 flex flex-col">
                <label htmlFor={otherTermId} className={legendClass}>
                  Número de meses
                </label>
                <input
                  id={otherTermId}
                  type="number"
                  inputMode="numeric"
                  min={MIN_TERM}
                  max={MAX_TERM}
                  step={1}
                  value={
                    typeof watchedMsiMonths === "number" ? watchedMsiMonths : ""
                  }
                  onChange={(e) => onOtherTermChange(e.target.value)}
                  className={fieldInputClass}
                />
              </div>
            ) : null}
          </fieldset>
        ) : null}

        <fieldset className="flex flex-col">
          <legend className={legendClass}>Categoría</legend>
          {suggestedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestedCategories.map((category) => (
                <Chip
                  key={category}
                  variant="inset"
                  active={watchedCategory === category}
                  onClick={() =>
                    setValue("category", category, {
                      shouldDirty: true,
                    })
                  }
                >
                  {category}
                </Chip>
              ))}
            </div>
          ) : null}
          <label htmlFor={categoryId} className={cn(legendClass, "mt-3")}>
            Nueva categoría
          </label>
          <input
            id={categoryId}
            type="text"
            placeholder="Escribe una categoría"
            maxLength={60}
            autoComplete="off"
            className={fieldInputClass}
            value={watchedCategory ?? ""}
            onChange={(e) =>
              setValue("category", e.target.value, {
                shouldDirty: true,
              })
            }
          />
        </fieldset>

        <fieldset className="flex flex-col">
          <legend className={legendClass}>{isMsi ? "Tarjeta" : "Tarjeta o cuenta"}</legend>
          {accountOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {accountOptions.map((option) => (
                <Chip
                  key={option.key}
                  variant="inset"
                  active={
                    option.method === watchedMethod &&
                    (option.card
                      ? option.card.id === watchedCardId
                      : !watchedCardId)
                  }
                  onClick={() => selectAccountOption(option)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          ) : (
            <Link
              to="/cards"
              className="flex min-h-11 items-center text-body font-semibold text-primary underline underline-offset-4"
            >
              Agregar una tarjeta de crédito en Tarjetas
            </Link>
          )}
        </fieldset>

        <label className="relative flex min-h-14 cursor-pointer items-center justify-between gap-2 border-t border-border-subtle pt-1">
          <span className="text-aux font-semibold text-muted">Fecha</span>
          <b className="text-body font-semibold">{dayCaption}</b>
          <input
            type="date"
            aria-label="Fecha del movimiento"
            value={watchedDate ?? ""}
            onChange={(e) =>
              setValue("date", e.target.value, {
                shouldDirty: true,
              })
            }
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        {isMsi ? (
          <details className="border-t border-border-subtle text-muted">
            <summary className="flex min-h-11 cursor-pointer items-center gap-1 text-aux font-semibold">
              Primera cuota
              <b className="ps-1 text-primary">{firstCaption}</b>
            </summary>
            <div className="flex flex-col pb-1 pt-2">
              <label htmlFor={firstDateId} className={legendClass}>
                Fecha de la primera cuota
              </label>
              <input
                id={firstDateId}
                type="date"
                value={watchedMsiStartDate ?? ""}
                onChange={(e) =>
                  setValue("msiStartDate", e.target.value, {
                    shouldDirty: true,
                  })
                }
                className={fieldInputClass}
              />
            </div>
          </details>
        ) : null}
      </PaperCard>

      <div className="mt-auto flex flex-col gap-2 pt-2 text-center">
        {saveError !== null ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-2 rounded-md bg-danger-bg px-4 py-3 text-danger"
          >
            <p className="text-aux font-semibold">{saveError}</p>
            <button
              type="button"
              onClick={retrySubmit}
              className="h-11 rounded-pill bg-button px-5 text-sm font-bold text-hero-text transition-colors duration-fast ease-out-soft hover:bg-primary-hover"
            >
              Reintentar
            </button>
          </div>
        ) : null}
        {issue !== null ? (
          <p aria-live="polite" className="text-aux text-muted">
            {issue}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={formInvalid || isSubmitting}
          className={cn(
            "h-[52px] w-full rounded-full text-base font-bold transition-colors duration-fast ease-out-soft",
            formInvalid || isSubmitting
              ? "cursor-default bg-segment text-text-secondary"
              : "bg-button text-hero-text hover:bg-primary-hover active:scale-[0.98]",
          )}
        >
          {isEdit ? "Guardar cambios" : "Guardar movimiento"}
        </button>
      </div>
    </form>
  );
}

/** Visible day caption for the date rows: "Hoy, 20 de noviembre" / "20 de noviembre". */
function dateCaption(iso: string | undefined): string {
  if (!iso || iso.length < 10) return "Elegir fecha";
  try {
    const day = formatDayAndMonth(parseISO(iso));
    return iso === toIsoDateString(new Date()) ? `Hoy, ${day}` : day;
  } catch {
    return "Elegir fecha";
  }
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
    amount: tx.amount,
    description: tx.description,
    // R-4: `tx.date` ya es "YYYY-MM-DD" (date-only). Pasamos directo.
    date: tx.date,
    category: tx.category ?? "",
    paymentMethod: tx.paymentMethod,
    cardId: "cardId" in tx ? tx.cardId ?? "" : "",
    msiMonths: tx.type === "expense_msi" ? tx.msiMonths : undefined,
    msiStartDate:
      tx.type === "expense_msi"
        ? tx.msiStartDate
        : toIsoDateString(new Date()),
  };
}
