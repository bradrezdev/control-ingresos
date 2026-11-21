/**
 * Cards — control-ingresos (redesign, T5)
 *
 * Thin page that mounts the redesigned Tarjetas screen and owns its
 * sheets: the create/edit form, the per-card options menu, the card
 * detail sheet, and the delete confirmation (which reports how many
 * transactions of the card will be affected).
 *
 * Every handler passed to `Drawer`/`Modal` is a stable `useCallback`
 * reference — those components re-run their focus effect when the
 * `onClose` identity changes, which steals focus from inputs on each
 * keystroke (defect already seen in T4).
 */
import { useCallback, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { CardsScreen } from "@/features/cards/CardsScreen";
import { CardDetail } from "@/features/cards/CardDetail";
import { CardForm } from "@/features/cards/CardForm";
import { DeleteCardConfirm } from "@/features/cards/DeleteCardConfirm";
import type { CardAccount } from "@/features/cards/types";
import type { Card } from "@/db/schemas/card";

type DrawerMode = "closed" | "create" | "edit";

export function Cards(): React.JSX.Element {
  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editing, setEditing] = useState<Card | null>(null);
  const [menuAccount, setMenuAccount] = useState<CardAccount | null>(null);
  const [detailAccount, setDetailAccount] = useState<CardAccount | null>(null);
  const [deleting, setDeleting] = useState<CardAccount | null>(null);
  // Pinned once per mount so the open detail sheet is deterministic.
  const [today] = useState(() => new Date());

  const transactions = useLiveTransactions();
  const settings = useLiveSettings();
  const currency = settings?.currency ?? "MXN";

  const openCreate = useCallback(() => {
    setEditing(null);
    setDrawer("create");
  }, []);

  const openEdit = useCallback((account: CardAccount) => {
    setMenuAccount(null);
    setEditing(account.card);
    setDrawer("edit");
  }, []);

  const openDelete = useCallback((account: CardAccount) => {
    setMenuAccount(null);
    setDeleting(account);
  }, []);

  const openMenu = useCallback((account: CardAccount) => {
    setMenuAccount(account);
  }, []);

  const openDetail = useCallback((account: CardAccount) => {
    setDetailAccount(account);
  }, []);

  // Stable closers — see the module doc.
  const closeDrawer = useCallback(() => {
    setDrawer("closed");
    setEditing(null);
  }, []);
  const closeMenu = useCallback(() => setMenuAccount(null), []);
  const closeDetail = useCallback(() => setDetailAccount(null), []);
  const closeDeleting = useCallback(() => setDeleting(null), []);

  // Transactions of the card being deleted — live, so the confirm copy
  // stays honest even if a transaction was just added.
  const affectedCount = useMemo(() => {
    if (!deleting || transactions === undefined) return 0;
    return transactions.filter(
      (tx) => "cardId" in tx && tx.cardId === deleting.card.id,
    ).length;
  }, [deleting, transactions]);

  return (
    <>
      <CardsScreen
        onCreate={openCreate}
        onOpenMenu={openMenu}
        onOpenDetail={openDetail}
      />

      <Drawer
        open={drawer !== "closed"}
        onClose={closeDrawer}
        title={drawer === "edit" ? "Editar tarjeta" : "Nueva tarjeta"}
        description={
          drawer === "edit"
            ? "Edita los datos de la tarjeta."
            : "Registra una nueva tarjeta para usarla en tus compras."
        }
      >
        <CardForm
          card={editing ?? undefined}
          onSaved={closeDrawer}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Drawer
        open={menuAccount !== null}
        onClose={closeMenu}
        title={menuAccount?.card.bank ?? ""}
      >
        {menuAccount ? (
          <div className="flex flex-col">
            <MenuRow
              icon={<Pencil className="size-5" strokeWidth={2} aria-hidden />}
              label="Editar"
              onClick={() => openEdit(menuAccount)}
            />
            <MenuRow
              icon={<Trash2 className="size-5" strokeWidth={2} aria-hidden />}
              label="Eliminar"
              danger
              onClick={() => openDelete(menuAccount)}
            />
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={detailAccount !== null}
        onClose={closeDetail}
        title={detailAccount?.card.bank ?? ""}
      >
        {detailAccount ? (
          <CardDetail
            account={detailAccount}
            currency={currency}
            today={today}
          />
        ) : null}
      </Drawer>

      <DeleteCardConfirm
        card={deleting?.card ?? null}
        affectedCount={affectedCount}
        onClose={closeDeleting}
      />
    </>
  );
}

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

function MenuRow({ icon, label, danger, onClick }: MenuRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 border-t border-border-subtle py-3 text-left transition-colors duration-fast ease-out-soft hover:bg-day ${
        danger ? "text-danger" : "text-ink"
      }`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${
          danger ? "bg-danger-bg" : "bg-surface-inset text-primary"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 text-body font-semibold">{label}</span>
    </button>
  );
}
