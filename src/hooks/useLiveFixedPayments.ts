import { useLiveQuery } from 'dexie-react-hooks';
import { fixedPaymentsRepo } from '@/db/repositories';
import type { FixedPayment } from '@/db/schemas/fixedPayment';

export function useLiveFixedPayments(): FixedPayment[] | undefined {
  return useLiveQuery(() => fixedPaymentsRepo.list(), []);
}
