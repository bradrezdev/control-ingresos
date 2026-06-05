import { useLiveQuery } from 'dexie-react-hooks';
import { cardsRepo } from '@/db/repositories';
import type { Card } from '@/db/schemas/card';

export function useLiveCards(): Card[] | undefined {
  return useLiveQuery(() => cardsRepo.list(), []);
}
