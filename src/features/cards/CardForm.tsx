/**
 * CardForm — control-ingresos
 *
 * Create/edit form for a credit card. Used inside a Drawer. Uses
 * react-hook-form + zodResolver. On submit, dispatches to
 * `useCardsStore.create` or `.update` depending on whether `card` was
 * provided.
 *
 * The form's schema mirrors the repository's `CardSchema` shape but
 * with `id` / `createdAt` / `updatedAt` omitted (the repo handles
 * those). The repo's Zod parse-before-persist is the final guardrail.
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { useCardsStore } from "@/stores/cardsStore";
import { BANK_TINT } from "./bankTint";
import type { Card, CardInput } from "@/db/schemas/card";

const cardFormSchema = z.object({
  bank: z
    .string()
    .min(1, "Ingresá el banco")
    .max(60, "Máximo 60 caracteres"),
  holderName: z
    .string()
    .min(1, "Ingresá el nombre para la tarjeta")
    .max(80, "Máximo 80 caracteres"),
  cutDay: z
    .number({ error: "Ingresá un día entre 1 y 31" })
    .int("Debe ser entero")
    .min(1, "Mínimo 1")
    .max(31, "Máximo 31"),
  paymentDueDay: z
    .number({ error: "Ingresá un día entre 1 y 31" })
    .int("Debe ser entero")
    .min(1, "Mínimo 1")
    .max(31, "Máximo 31"),
  // Optional credit limit in display units. `undefined` = no limit.
  creditLimit: z
    .number()
    .positive("Debe ser positivo")
    .optional(),
});

type CardFormValues = z.infer<typeof cardFormSchema>;

const BANK_OPTIONS = Object.values(BANK_TINT).map((t) => ({
  value: t.label,
  label: t.label,
}));

export interface CardFormProps {
  card?: Card | undefined;
  onSaved: () => void;
  onCancel: () => void;
}

export function CardForm({
  card,
  onSaved,
  onCancel,
}: CardFormProps): React.JSX.Element {
  const isEdit = !!card;
  const create = useCardsStore((s) => s.create);
  const update = useCardsStore((s) => s.update);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: cardToFormValues(card),
  });

  // Re-seed the form when switching between cards (or from create → edit).
  useEffect(() => {
    reset(cardToFormValues(card));
  }, [card, reset]);

  const watchedLimit = watch("creditLimit");
  const watchedLimitCents =
    typeof watchedLimit === "number" && Number.isFinite(watchedLimit)
      ? Math.round(watchedLimit * 100)
      : 0;

  async function onSubmit(values: CardFormValues): Promise<void> {
    if (!isDirty) {
      onSaved();
      return;
    }
    const input: CardInput = {
      bank: values.bank.trim(),
      holderName: values.holderName.trim(),
      last4: card?.last4 ?? "",
      cutDay: values.cutDay,
      paymentDueDay: values.paymentDueDay,
      // New cards start at priority 0; on edit, preserve current.
      priority: card?.priority ?? 0,
      ...(typeof values.creditLimit === "number"
        ? { creditLimit: values.creditLimit }
        : {}),
    };
    if (card) {
      await update(card.id, input);
    } else {
      await create(input);
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="card-bank"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Banco
        </label>
        <Input
          id="card-bank"
          list="card-bank-suggestions"
          placeholder="BBVA, Santander, Banamex…"
          invalid={!!errors.bank}
          autoComplete="off"
          {...register("bank")}
        />
        <datalist id="card-bank-suggestions">
          {BANK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} />
          ))}
        </datalist>
        {errors.bank ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.bank.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="card-holder"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Nombre para la tarjeta
        </label>
        <Input
          id="card-holder"
          placeholder="Como aparece en la tarjeta"
          invalid={!!errors.holderName}
          autoComplete="off"
          {...register("holderName")}
        />
        {errors.holderName ? (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.holderName.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="card-cutday"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Día de corte
          </label>
          <Input
            id="card-cutday"
            type="number"
            min={1}
            max={31}
            invalid={!!errors.cutDay}
            {...register("cutDay", { valueAsNumber: true })}
          />
          {errors.cutDay ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.cutDay.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="card-dueday"
            className="text-sm font-medium text-[var(--color-text-body)]"
          >
            Día de pago
          </label>
          <Input
            id="card-dueday"
            type="number"
            min={1}
            max={31}
            invalid={!!errors.paymentDueDay}
            {...register("paymentDueDay", { valueAsNumber: true })}
          />
          {errors.paymentDueDay ? (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.paymentDueDay.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="card-limit"
          className="text-sm font-medium text-[var(--color-text-body)]"
        >
          Límite de crédito{" "}
          <span className="text-[var(--color-text-muted)] font-normal">
            (opcional)
          </span>
        </label>
        <CurrencyInput
          id="card-limit"
          value={watchedLimitCents}
          onChangeCents={(cents) => {
            setValue("creditLimit", cents / 100, { shouldDirty: true });
          }}
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          Dejalo vacío si no querés registrarlo.
        </p>
      </div>

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
          {isEdit ? "Guardar cambios" : "Crear tarjeta"}
        </Button>
      </div>
    </form>
  );
}

function cardToFormValues(card: Card | undefined): CardFormValues {
  if (!card) {
    return {
      bank: "",
      holderName: "",
      cutDay: 1,
      paymentDueDay: 15,
      creditLimit: undefined,
    };
  }
  return {
    bank: card.bank,
      holderName: card.holderName,
      cutDay: card.cutDay,
    paymentDueDay: card.paymentDueDay,
    creditLimit: card.creditLimit,
  };
}
