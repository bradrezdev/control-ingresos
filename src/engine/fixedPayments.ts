import type { FixedPayment } from '@/db/schemas/fixedPayment';

/**
 * Devuelve true si el pago fijo aplica este mes.
 *
 * - `monthly`: siempre true.
 * - `bimonthly`: aplica en meses pares desde la creación (monthsDiff % 2 === 0).
 * - `quarterly`: aplica cada 3 meses (monthsDiff % 3 === 0).
 *
 * El conteo `monthsDiff` se hace en UTC para evitar drift por zona horaria.
 * Si createdAt es el mismo mes que today → monthsDiff=0 → siempre aplica
 * independientemente del período.
 */
export function isFixedPaymentDueThisMonth(
  fp: FixedPayment,
  today: Date,
): boolean {
  if (fp.period === 'monthly') return true;

  const currentMonth = today.getUTCMonth() + 1;
  const currentYear = today.getUTCFullYear();
  const createdDate = new Date(fp.createdAt);
  const createdMonth = createdDate.getUTCMonth() + 1;
  const createdYear = createdDate.getUTCFullYear();
  const monthsDiff =
    (currentYear - createdYear) * 12 + (currentMonth - createdMonth);

  if (fp.period === 'bimonthly') return monthsDiff % 2 === 0;
  if (fp.period === 'quarterly') return monthsDiff % 3 === 0;
  return false;
}
