import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionList } from "./TransactionList";
import type { DayGroup } from "./groupTransactionsByDay";

const originalIntersectionObserver = globalThis.IntersectionObserver;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockIntersectionObserver = vi.fn(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
  takeRecords: () => [],
  root: null,
  rootMargin: "",
  thresholds: [],
}));

describe("TransactionList", () => {
  beforeAll(() => {
    globalThis.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterAll(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });
  const groups: DayGroup[] = [
    {
      date: "2026-11-05",
      label: "5 de noviembre",
      total: -100_00,
      items: [
        {
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
        },
      ],
    },
  ];

  it("renders day groups", () => {
    render(
      <TransactionList
        groups={groups}
        cardById={new Map()}
        currency="MXN"
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("5 de noviembre")).toBeInTheDocument();
    expect(screen.getByText("Cena")).toBeInTheDocument();
  });

  it("shows a load more button when there are more rows", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(
      <TransactionList
        groups={groups}
        cardById={new Map()}
        currency="MXN"
        hasMore
        onLoadMore={onLoadMore}
        onSelect={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Cargar más movimientos" });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onLoadMore).toHaveBeenCalled();
  });

  it("hides the load more button when there are no more rows", () => {
    render(
      <TransactionList
        groups={groups}
        cardById={new Map()}
        currency="MXN"
        hasMore={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Cargar más movimientos" })).not.toBeInTheDocument();
  });
});
