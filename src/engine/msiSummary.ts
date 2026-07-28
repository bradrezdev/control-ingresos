import type { Transaction } from '@/db/schemas/transaction';
import { MSI_TERM, type MsiTerm } from '@/db/schemas/transaction';
import {
  type MsiTenure,
  getCurrentMsiInstallment,
  getMsiInstallmentAmount,
} from './msi';

export interface MsiTenureSummary {
  activeCount: number;
  totalDebt: number;
}

/**
 * Agrupa las MSI activas por plazo y devuelve, para cada plazo, cuántas MSI
 * están activas este mes y cuánto deben en total (cuota restante × meses que
 * faltan).
 *
 * `totalDebt` = suma sobre cada MSI activa de
 *   (mesesRestantes × montoMensual)
 *
 * El monto mensual respeta el invariante del motor: la última cuota absorbe
 * el residuo (getMsiInstallmentAmount en vez del cálculo duplicado anterior).
 *
 * Notas:
 *  - El record se pre-rellena con TODOS los plazos de `MSI_TERM` (1..48), así
 *    cualquier acceso `result[t]` con `t ∈ MSI_TERM` está garantizado a
 *    devolver una entrada. Se usa non-null assertion en los accesos por dos
 *    razones: (1) `MsiTerm = number` hace que TS marque `Record<MsiTerm, X>`
 *    como posiblemente `undefined` por `noUncheckedIndexedAccess`; (2) reescribir
 *    a `Map` rompería la firma pública usada por `MsiSummary`.
 */
export function summarizeMsiByTenure(
  transactions: Transaction[],
  today: Date,
): Record<MsiTerm, MsiTenureSummary> {
  const result = {} as Record<MsiTerm, MsiTenureSummary>;
  for (const t of MSI_TERM) {
    result[t] = { activeCount: 0, totalDebt: 0 };
  }

  for (const tx of transactions) {
    if (tx.type !== 'expense_msi') continue;
    const term = tx.msiMonths as MsiTerm;
    // Convención counting (ver cabecera de src/engine/msi.ts): cuota 1 = mes
    // de msiStartDate. El helper decide si la MSI está activa este mes.
    const currentInstallment = getCurrentMsiInstallment(tx, today);
    if (currentInstallment === null) continue;

    const remaining = tx.msiMonths - (currentInstallment - 1); // incluye el mes actual
    const monthly = getMsiInstallmentAmount(
      tx.amount,
      tx.msiMonths as MsiTenure,
      currentInstallment,
    );
    // `term` viene de tx.msiMonths que Zod valida en 1..48; el record fue
    // pre-rellenado con todos esos plazos, así que el bucket existe.
    const bucket = result[term];
    if (!bucket) continue;
    bucket.activeCount += 1;
    bucket.totalDebt += remaining * monthly;
  }

  return result;
}
