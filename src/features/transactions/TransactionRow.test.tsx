import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionRow } from "./TransactionRow";
import type { TransactionListItem } from "./types";
import type { Card } from "@/db/schemas";

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

const baseExpenseItem: TransactionListItem = {
  id: "tx-1",
  tx: {
    id: "tx-1",
    type: "expense",
    amount: 100_00,
    currency: "MXN",
    description: "Cena",
    date: "2026-11-05",
    category: "Comida",
    paymentMethod: "credit",
    cardId: "card-1",
  },
  displayDate: "2026-11-05",
  displayAmount: -100_00,
};

const incomeItem: TransactionListItem = {
  id: "tx-2",
  tx: {
    id: "tx-2",
    type: "income",
    amount: 50_00,
    currency: "MXN",
    description: "Reembolso",
    date: "2026-11-05",
    category: "Otros",
    paymentMethod: "transfer",
  },
  displayDate: "2026-11-05",
  displayAmount: 50_00,
};

const msiItem: TransactionListItem = {
  id: "tx-3#3",
  tx: {
    id: "tx-3",
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

describe("TransactionRow", () => {
  it("renders description, card, category and amount", () => {
    render(<TransactionRow item={baseExpenseItem} card={card} currency="MXN" onClick={vi.fn()} />);
    expect(screen.getByText("Cena")).toBeInTheDocument();
    expect(screen.getByText("Stori · Comida")).toBeInTheDocument();
    expect(screen.getByText("−$100.00")).toBeInTheDocument();
  });

  it("shows positive income with plus sign", () => {
    render(<TransactionRow item={incomeItem} currency="MXN" onClick={vi.fn()} />);
    expect(screen.getByText("+$50.00")).toBeInTheDocument();
  });

  it("shows the MSI installment badge when known", () => {
    render(<TransactionRow item={msiItem} card={card} currency="MXN" onClick={vi.fn()} />);
    expect(screen.getByText("3/12 meses")).toBeInTheDocument();
  });

  it("shows a generic MSI badge when the installment is unknown", () => {
    const unknownMsi = { ...msiItem, installmentIndex: undefined };
    render(<TransactionRow item={unknownMsi} card={card} currency="MXN" onClick={vi.fn()} />);
    expect(screen.getByText("MSI")).toBeInTheDocument();
  });

  it("calls onClick when pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TransactionRow item={baseExpenseItem} card={card} currency="MXN" onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
