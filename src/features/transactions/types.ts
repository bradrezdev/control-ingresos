import type { Transaction } from "@/db/schemas/transaction";

export type QuickFilter = "all" | "income" | "expense" | "expense_msi";
export type MsiView = "purchase" | "installment";

export interface AdvancedFilters {
  cardId: string;
  category: string;
  fromDate: string;
  toDate: string;
}

export interface FilterState {
  quick: QuickFilter;
  msiView: MsiView;
  search: string;
  advanced: AdvancedFilters;
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  cardId: "",
  category: "",
  fromDate: "",
  toDate: "",
};

export const EMPTY_FILTER_STATE: FilterState = {
  quick: "all",
  msiView: "installment",
  search: "",
  advanced: EMPTY_ADVANCED_FILTERS,
};

export interface TransactionListItem {
  id: string;
  tx: Transaction;
  displayDate: string;
  displayAmount: number;
  installmentIndex?: number | undefined;
  installmentTotal?: number | undefined;
}
