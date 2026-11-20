import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionDetail } from "./TransactionDetail";
import type { TransactionListItem } from "./types";
import type { Card, MsiExpense } from "@/db/schemas";

const card: Card = {
  id: "card-1",
  bank: "Stori",
  holderName: "Usuario",
  cardType: "credit",
  cutDay: 15,
  daysToPayAfterCut: 5,
  creditLimit: 100_000,
  priority: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const msiItem: TransactionListItem = {
  id: "tx-1#3",
  tx: {
    id: "tx-1",
    type: "expense_msi",
    amount: 240_00,
    currency: "MXN",
    description: "Televisión",
    date: "2026-11-01",
    category: "Hogar",
    paymentMethod: "credit",
    cardId: "card-1",
    msiMonths: 12,
    msiStartDate: "2026-11-01",
  },
  displayDate: "2026-11-01",
  displayAmount: -20_00,
  installmentIndex: 3,
  installmentTotal: 12,
};

describe("TransactionDetail", () => {
  it("does not render when item is null", () => {
    const { container } = render(
      <TransactionDetail item={null} currency="MXN" onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders transaction details", () => {
    render(
      <TransactionDetail item={msiItem} card={card} currency="MXN" onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("Televisión")).toBeInTheDocument();
    expect(screen.getByText("Stori")).toBeInTheDocument();
    expect(screen.getByText("Hogar")).toBeInTheDocument();
    expect(screen.getByText("Compra a meses")).toBeInTheDocument();
  });

  it("renders MSI installment info and progress bar", () => {
    render(
      <TransactionDetail item={msiItem} card={card} currency="MXN" onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("Cuota mensual")).toBeInTheDocument();
    expect(screen.getByText("Cuota 3 de 12")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("12 meses")).toBeInTheDocument();
  });

  it("shows the installment date as the movement date and the purchase date separately", () => {
    const installmentTx: MsiExpense = {
      ...(msiItem.tx as MsiExpense),
      date: "2026-09-15",
      msiStartDate: "2026-09-15",
    };
    const installmentItem: TransactionListItem = {
      ...msiItem,
      tx: installmentTx,
      displayDate: "2026-11-01",
      installmentIndex: 3,
    };
    render(
      <TransactionDetail
        item={installmentItem}
        card={card}
        currency="MXN"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Fecha del movimiento")).toBeInTheDocument();
    expect(screen.getByText("1 de noviembre de 2026")).toBeInTheDocument();
    expect(screen.getByText("Fecha de compra")).toBeInTheDocument();
    expect(screen.getByText("15 de septiembre de 2026")).toBeInTheDocument();
  });

  it("calls edit and delete actions", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TransactionDetail item={msiItem} card={card} currency="MXN" onEdit={onEdit} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(onEdit).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onDelete).toHaveBeenCalled();
  });
});
