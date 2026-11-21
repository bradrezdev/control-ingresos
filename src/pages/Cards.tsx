/**
 * Cards — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Página de la cartera. Los datos vienen del modelo vivo
 * (`useWalletView`) y cada acción navega a su estado profundo: las
 * hojas se abren por URL, así que un enlace recargado devuelve el mismo
 * contexto (tarjeta, plazo o mes).
 */
import { useNavigate } from "react-router";
import { CardsError, CardsSkeleton, CardsScreen } from "@/features/cards";
import { useWalletView } from "@/features/cards/wallet";
import { dateToMonthIso } from "@/lib/date/format";

export function Cards(): React.JSX.Element {
  const navigate = useNavigate();
  const { view, isLoading, error, retry, selectCard } = useWalletView();

  if (isLoading) {
    return <CardsSkeleton />;
  }

  if (error !== null || view === null) {
    return (
      <CardsError
        message="No se pudo leer la cartera guardada."
        onRetry={retry}
      />
    );
  }

  const month = dateToMonthIso(view.referenceDate);

  return (
    <CardsScreen
      view={view}
      onCreate={() => navigate("/cards?sheet=new")}
      onSelectCard={selectCard}
      onOpenInfo={() => navigate("/cards?sheet=credit")}
      onOpenPayment={(payment) =>
        navigate(`/cards?sheet=payment&id=${payment.card.id}`)
      }
      onOpenCard={(cardId) => navigate(`/cards?sheet=card&id=${cardId}`)}
      onOpenMenu={(cardId) => navigate(`/cards?sheet=menu&id=${cardId}`)}
      onOpenReorder={() => navigate("/cards?sheet=reorder")}
      onOpenArchived={() => navigate("/cards?sheet=archived")}
      onOpenAllPurchases={() => navigate(`/cards/msi?month=${month}`)}
    />
  );
}
