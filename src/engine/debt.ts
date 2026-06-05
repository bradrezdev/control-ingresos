import type { Transaction } from '@/db/schemas/transaction';
import { MSI_TERM, type MsiTerm } from '@/db/schemas/transaction';

export interface MsiTenureSummary {
  activeCount: number;
  totalDebt: number;
}

/**
 * Agrupa las MSI activas por plazo (3/6/9/12/18/24) y devuelve, para cada
 * plazo, cuántas MSI están activas este mes y cuánto deben en total (cuota
 * restante × meses que faltan).
 *
 * `totalDebt` = suma sobre cada MSI activa de
 *   (mesesRestantes × montoMensual)
 */
export function summarizeMsiByTenure(
  transactions: Transaction[],
  today: Date,
): Record<MsiTerm, MsiTenureSummary> {
  const result = {} as Record<MsiTerm, MsiTenureSummary>;
  for (const t of MSI_TERM) {
    result[t] = { activeCount: 0, totalDebt: 0 };
  }

  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  for (const tx of transactions) {
    if (tx.type !== 'expense_msi') continue;
    const term = tx.msiMonths as MsiTerm;
    const start = new Date(tx.msiStartDate);
    const monthsSinceStart =
      (year - start.getUTCFullYear()) * 12 + (month - (start.getUTCMonth() + 1));
    if (monthsSinceStart < 1 || monthsSinceStart > tx.msiMonths) continue;

    const remaining = tx.msiMonths - monthsSinceStart + 1; // incluye el mes actual
    const monthly = Math.ceil((tx.amount / tx.msiMonths) * 100) / 100;
    result[term].activeCount += 1;
    result[term].totalDebt += remaining * monthly;
  }

  return result;
}
