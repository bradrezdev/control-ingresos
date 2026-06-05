import type { Transaction } from '@/db/schemas/transaction';
import { MSI_TERM, type MsiTerm } from '@/db/schemas/transaction';
import { type MsiTenure, getMsiInstallmentAmount } from './msi';

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
 *
 * El monto mensual respeta el invariante del motor: la última cuota absorbe
 * el residuo (getMsiInstallmentAmount en vez del cálculo duplicado anterior).
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
    const monthly = getMsiInstallmentAmount(
      tx.amount,
      tx.msiMonths as MsiTenure,
      monthsSinceStart,
    );
    result[term].activeCount += 1;
    result[term].totalDebt += remaining * monthly;
  }

  return result;
}
