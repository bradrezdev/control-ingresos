/**
 * MsiPurchases — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Página `/cards/msi`. Lee el mes y el plazo de la URL, carga las
 * compras a meses desde Dexie y permite filtrar por plazo. Cada fila
 * navega a la ficha de la compra.
 */
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { CardsError } from "@/features/cards";
import { MsiPurchasesScreen } from "@/features/cards/msi/MsiPurchasesScreen";
import {
  computeMsiPurchases,
  computeMsiTerms,
  referenceDate,
} from "@/engine/wallet";
import { dateToMonthIso, monthIsoToDate } from "@/lib/date/format";

function MsiPurchasesSkeleton(): React.JSX.Element {
  return (
    <div className="flex animate-pulse flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <span className="size-11 rounded-full bg-surface" />
        <span className="h-8 w-40 rounded-lg bg-surface" />
      </div>
      <div className="h-40 rounded-hero bg-hero" />
      <div className="h-12 rounded-lg bg-surface" />
      <div className="h-64 rounded-lg bg-surface" />
    </div>
  );
}

export function MsiPurchases(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cards = useLiveCards();
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();

  const monthParam = searchParams.get("month");
  const termParam = searchParams.get("term");

  const month = monthParam ?? dateToMonthIso(referenceDate());
  const selectedTerm =
    termParam !== null && termParam !== "" ? Number(termParam) : null;

  const reference = useMemo(() => {
    try {
      return monthIsoToDate(month);
    } catch {
      return referenceDate();
    }
  }, [month]);

  const { purchases, terms, error } = useMemo(() => {
    if (cards === undefined || transactions === undefined) {
      return { purchases: [], terms: [], error: null };
    }
    try {
      const active = cards.filter((card) => card.archived !== true);
      const all = computeMsiPurchases(active, transactions, reference);
      const available = computeMsiTerms(all);
      const filtered =
        selectedTerm !== null
          ? all.filter((purchase) => purchase.term === selectedTerm)
          : all;
      return { purchases: filtered, terms: available, error: null };
    } catch (cause) {
      return {
        purchases: [],
        terms: [],
        error:
          cause instanceof Error
            ? cause
            : new Error("No se pudo leer la cartera guardada.", { cause }),
      };
    }
  }, [cards, transactions, reference, selectedTerm]);

  if (cards === undefined || transactions === undefined || settings === undefined) {
    return <MsiPurchasesSkeleton />;
  }

  if (error !== null) {
    return (
      <CardsError
        message="No se pudo leer la cartera guardada."
        onRetry={() => {
          // El estado de error se recalcula en el siguiente render si los
          // datos cambian; forzar una nueva lectura no requiere acción.
          void setSearchParams(searchParams);
        }}
      />
    );
  }

  return (
    <MsiPurchasesScreen
      month={month}
      purchases={purchases}
      terms={terms}
      selectedTerm={selectedTerm}
      currency={settings.currency}
      cards={cards}
      onSelectTerm={(term) => {
        if (term === null) {
          setSearchParams({ month }, { replace: false });
        } else {
          setSearchParams({ month, term: String(term) }, { replace: false });
        }
      }}
      onOpenPurchase={(purchaseId, purchaseMonth) =>
        navigate(`/cards?sheet=plan&id=${purchaseId}&month=${purchaseMonth}`)
      }
    />
  );
}
