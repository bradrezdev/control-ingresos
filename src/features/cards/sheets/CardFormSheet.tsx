/**
 * CardFormSheet — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Alta y edición de tarjeta de crédito. Valida nombre único, límite,
 * día de corte, plazo de pago y acabado. Devuelve un `CardInput` al
 * padre para que éste persista.
 */
import { useState } from "react";
import { useForm, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet } from "@/components/ui/design";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { MiniCard } from "../MiniCard";
import { CARD_SKINS, CARD_SKIN_LABELS } from "@/lib/cards/skin";
import type { Card, CardInput } from "@/db/schemas";

export interface CardFormSheetProps {
  /** undefined = tarjeta nueva. */
  card?: Card;
  /** Nombres ya usados por otras tarjetas (para validar unicidad). */
  existingNames: string[];
  onClose: () => void;
  onSubmit: (input: CardInput) => void | Promise<void>;
}

const MIN_LIMIT_CENTS = 1;
const MAX_LIMIT_CENTS = 99_999_999_999;

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const cardFormSchema = z.object({
  bank: z
    .string()
    .min(1, "Ingresa el nombre de la tarjeta")
    .max(60, "Máximo 60 caracteres"),
  holderName: z
    .string()
    .min(1, "Ingresa el titular")
    .max(80, "Máximo 80 caracteres"),
  creditLimit: z
    .number({ message: "Ingresa el límite de crédito" })
    .int("El límite debe ser un número entero de centavos")
    .min(MIN_LIMIT_CENTS, "El límite mínimo es $0.01")
    .max(MAX_LIMIT_CENTS, "El límite máximo es $999,999,999.99"),
  cutDay: z
    .number({ message: "Ingresa el día de corte" })
    .int("Debe ser entero")
    .min(1, "El día de corte mínimo es 1")
    .max(31, "El día de corte máximo es 31"),
  daysToPayAfterCut: z
    .number({ message: "Ingresa el plazo de pago" })
    .int("Debe ser entero")
    .min(1, "El plazo mínimo es 1 día")
    .max(90, "El plazo máximo es 90 días"),
  skin: z.enum(CARD_SKINS),
});

type CardFormValues = z.infer<typeof cardFormSchema>;

function cardToFormValues(card: Card | undefined): CardFormValues {
  if (!card) {
    return {
      bank: "",
      holderName: "",
      creditLimit: 0,
      cutDay: 1,
      daysToPayAfterCut: 15,
      skin: "ink",
    };
  }
  return {
    bank: card.bank,
    holderName: card.holderName,
    creditLimit: card.creditLimit ?? 0,
    cutDay: card.cutDay ?? 1,
    daysToPayAfterCut: card.daysToPayAfterCut ?? 15,
    skin: card.skin ?? "ink",
  };
}

export function CardFormSheet({
  card,
  existingNames,
  onClose,
  onSubmit,
}: CardFormSheetProps): React.JSX.Element {
  const isEdit = !!card;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: cardToFormValues(card),
  });

  const limitController = useController({
    name: "creditLimit",
    control,
  });

  const skinController = useController({
    name: "skin",
    control,
  });

  function isDuplicateName(name: string): boolean {
    const editingName = card ? normalizeName(card.bank) : "";
    const normalized = normalizeName(name);
    return existingNames.some((existing) => {
      if (normalizeName(existing) === editingName) return false;
      return normalizeName(existing) === normalized;
    });
  }

  async function handleFormSubmit(values: CardFormValues): Promise<void> {
    if (submitting) return;
    if (isDuplicateName(values.bank)) {
      setError("bank", { message: "Ya existe una tarjeta con este nombre" });
      return;
    }
    setSubmitting(true);
    try {
      const input: CardInput = {
        cardType: "credit",
        bank: values.bank.trim(),
        holderName: values.holderName.trim(),
        creditLimit: values.creditLimit,
        cutDay: values.cutDay,
        daysToPayAfterCut: values.daysToPayAfterCut,
        skin: values.skin,
        priority: card?.priority ?? 0,
        archived: card?.archived ?? false,
      };
      await onSubmit(input);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={isEdit ? "Editar tarjeta" : "Nueva tarjeta"}
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="card-name"
            className="text-sm font-semibold text-ink"
          >
            Nombre de la tarjeta
          </label>
          <Input
            id="card-name"
            autoComplete="off"
            invalid={!!errors.bank}
            aria-invalid={!!errors.bank}
            {...register("bank")}
          />
          {errors.bank ? (
            <p role="alert" className="text-xs text-danger">
              {errors.bank.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="card-holder"
            className="text-sm font-semibold text-ink"
          >
            Titular
          </label>
          <Input
            id="card-holder"
            autoComplete="off"
            invalid={!!errors.holderName}
            aria-invalid={!!errors.holderName}
            {...register("holderName")}
          />
          {errors.holderName ? (
            <p role="alert" className="text-xs text-danger">
              {errors.holderName.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="card-limit"
            className="text-sm font-semibold text-ink"
          >
            Límite de crédito en MXN
          </label>
          <CurrencyInput
            id="card-limit"
            value={limitController.field.value}
            onChangeCents={(cents) => limitController.field.onChange(cents)}
            invalid={!!errors.creditLimit}
            aria-invalid={!!errors.creditLimit}
            currency="MXN"
          />
          {errors.creditLimit ? (
            <p role="alert" className="text-xs text-danger">
              {errors.creditLimit.message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="card-cut"
              className="text-sm font-semibold text-ink"
            >
              Día de corte
            </label>
            <Input
              id="card-cut"
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              invalid={!!errors.cutDay}
              aria-invalid={!!errors.cutDay}
              {...register("cutDay", { valueAsNumber: true })}
            />
            {errors.cutDay ? (
              <p role="alert" className="text-xs text-danger">
                {errors.cutDay.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="card-days"
              className="text-sm font-semibold text-ink"
            >
              Plazo de pago en días
            </label>
            <Input
              id="card-days"
              type="number"
              min={1}
              max={90}
              inputMode="numeric"
              invalid={!!errors.daysToPayAfterCut}
              aria-invalid={!!errors.daysToPayAfterCut}
              {...register("daysToPayAfterCut", { valueAsNumber: true })}
            />
            {errors.daysToPayAfterCut ? (
              <p role="alert" className="text-xs text-danger">
                {errors.daysToPayAfterCut.message}
              </p>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted">El plazo incluye el día de corte.</p>

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="text-sm font-semibold text-ink">
            Color de la tarjeta
          </legend>
          <div className="flex flex-wrap gap-2">
            {CARD_SKINS.map((skin) => {
              const selected = skinController.field.value === skin;
              return (
                <label
                  key={skin}
                  htmlFor={`skin-${skin}`}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors duration-fast ${
                    selected
                      ? "border-primary bg-selected text-primary"
                      : "border-border-subtle bg-surface text-ink hover:bg-day"
                  }`}
                >
                  <input
                    id={`skin-${skin}`}
                    type="radio"
                    name="skin"
                    value={skin}
                    checked={selected}
                    onChange={() => skinController.field.onChange(skin)}
                    className="sr-only"
                  />
                  <MiniCard
                    card={{
                      id: "preview",
                      bank: "",
                      holderName: "",
                      cardType: "credit",
                      skin,
                      priority: 0,
                      archived: false,
                      createdAt: "",
                      updatedAt: "",
                    }}
                  />
                  <span className="text-sm font-semibold">
                    {CARD_SKIN_LABELS[skin]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={submitting}
            disabled={submitting}
          >
            {isEdit ? "Guardar cambios" : "Agregar tarjeta"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
