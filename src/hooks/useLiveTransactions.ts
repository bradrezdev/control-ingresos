import { useLiveQuery } from 'dexie-react-hooks';
import { transactionsRepo } from '@/db/repositories';
import type { Transaction } from '@/db/schemas/transaction';

export function useLiveTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => transactionsRepo.list(), []);
}
