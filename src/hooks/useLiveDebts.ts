import { useLiveQuery } from 'dexie-react-hooks';
import { debtsRepo } from '@/db/repositories';
import type { Debt } from '@/db/schemas/debt';

export function useLiveDebts(): Debt[] | undefined {
  return useLiveQuery(() => debtsRepo.list(), []);
}
