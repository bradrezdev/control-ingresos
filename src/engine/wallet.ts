/**
 * Motor de la cartera — control-ingresos
 *
 * Funciones puras para la pantalla Tarjetas: ciclo de la tarjeta, crédito
 * usado, disponible, pago previsto y calendarios de MSI.
 *
 * Convenciones (ver `odd/tasks/tarjetas-mis-finanzas.md`, contrato C1-C4):
 *
 *   - **Importes**: centavos enteros. El formateo ocurre sólo en el
 *     borde de la interfaz (`formatCurrency`).
 *   - **Fechas**: UTC a medianoche, como el resto de `src/engine`.
 *     `referenceDate()` convierte el "hoy" del reloj a la medianoche UTC
 *     de su día calendario local, para que el día sea el del usuario y
 *     no el del UTC.
 *   - **Ciclo**: `due = cut + daysToPayAfterCut`. El día siguiente al
 *     corte es el día 1 del plazo de pago; el día del corte pertenece al
 *     ciclo anterior. Es la misma convención que usa
 *     `src/engine/cycle.ts` (y por tanto Inicio).
 *   - **Redondeo MSI**: la regla viaja con la transacción
 *     (`msiPlanRule`). `last` = el residuo va a la última cuota (regla
 *     histórica de la app), `first` = a la primera (respaldos
 *     importados), `spread` = un centavo a cada una de las primeras
 *     cuotas hasta agotar el residuo (planes nuevos). En las tres, la
 *     suma de las cuotas recupera el importe original.
 *
 * Sin React, sin Dexie, sin DOM.
 */
import type { Card, FixedPayment, Transaction } from '@/db/schemas';
import { isFixedPaymentDueThisMonth } from './fixedPayments';

// ---------------------------------------------------------------------------
// Calendario (UTC a medianoche)
// ---------------------------------------------------------------------------

/** Medianoche UTC del día de calendario local de `now`. */
export function referenceDate(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** ISO calendar day (YYYY-MM-DD) de una fecha UTC a medianoche. */
export function isoOf(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Mes (YYYY-MM) de una fecha UTC a medianoche. */
export function monthOf(date: Date): string {
  return isoOf(date).slice(0, 7);
}

/** Medianoche UTC a partir de un ISO day (YYYY-MM-DD). */
export function parseIsoDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return utcDate(year ?? 1970, month ?? 1, day ?? 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Ajusta un día (1-31) al último día del mes dado. */
function clampDay(day: number, year: number, month: number): number {
  return Math.min(day, daysInMonth(year, month));
}

/** Suma N meses a (año, mes 1-12). */
function shiftMonth(
  year: number,
  month: number,
  months: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + months;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Días completos entre dos fechas UTC a medianoche. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Ciclo y vencimiento
// ---------------------------------------------------------------------------

export interface WalletCycle {
  /** Primer día del periodo acumulado (día siguiente al corte previo). */
  start: Date;
  /** Corte del ciclo en curso. */
  cut: Date;
  /** Vencimiento del ciclo en curso. */
  due: Date;
}

export interface WalletDeadline {
  /** Corte que abre el periodo del próximo pago. */
  cut: Date;
  /** Fecha de vencimiento. */
  due: Date;
  /** Días completos que faltan para el vencimiento. */
  daysLeft: number;
}

function requireCredit(card: Card): void {
  if (card.cardType !== 'credit') {
    throw new Error(
      'Las funciones de ciclo no aplican a tarjetas de débito (no tienen corte ni plazo de pago)',
    );
  }
}

/**
 * Corte del mes de `date`: el del propio mes, o el del mes siguiente
 * si la fecha ya pasó el corte. Un corte del día 31 en un mes de 30 cae
 * el último día del mes.
 */
export function cutDateOf(card: Card, date: Date): Date {
  requireCredit(card);
  const cutDay = card.cutDay as number;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const cut = utcDate(year, month, clampDay(cutDay, year, month));
  if (date.getTime() <= cut.getTime()) return cut;
  const next = shiftMonth(year, month, 1);
  return utcDate(
    next.year,
    next.month,
    clampDay(cutDay, next.year, next.month),
  );
}

/**
 * Ciclo en curso de la tarjeta: corte vigente, primer día del periodo
 * acumulado y vencimiento de ese ciclo.
 */
export function computeWalletCycle(card: Card, ref: Date): WalletCycle {
  requireCredit(card);
  const cut = cutDateOf(card, ref);
  const days = card.daysToPayAfterCut as number;
  const cutDay = card.cutDay as number;
  const previous = shiftMonth(cut.getUTCFullYear(), cut.getUTCMonth() + 1, -1);
  const previousCut = utcDate(
    previous.year,
    previous.month,
    clampDay(cutDay, previous.year, previous.month),
  );
  return {
    start: addDays(previousCut, 1),
    cut,
    due: addDays(cut, days),
  };
}

/**
 * Próximo vencimiento: el primero que aún no pasa. El periodo se
 * localiza por el mes al que pertenece el pago (`ref − plazo`) y, si ese
 * vencimiento ya pasó, se avanza un mes.
 */
export function computeNextDeadline(card: Card, ref: Date): WalletDeadline {
  requireCredit(card);
  const days = card.daysToPayAfterCut as number;
  const cutDay = card.cutDay as number;

  const anchor = addDays(ref, -days);
  let year = anchor.getUTCFullYear();
  let month = anchor.getUTCMonth() + 1;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const cut = utcDate(year, month, clampDay(cutDay, year, month));
    const due = addDays(cut, days);
    if (due.getTime() >= ref.getTime()) {
      return { cut, due, daysLeft: daysBetween(ref, due) };
    }
    const next = shiftMonth(year, month, 1);
    year = next.year;
    month = next.month;
  }

  const cut = utcDate(year, month, clampDay(cutDay, year, month));
  const due = addDays(cut, days);
  return { cut, due, daysLeft: daysBetween(ref, due) };
}

// ---------------------------------------------------------------------------
// MSI
// ---------------------------------------------------------------------------

export type MsiPlanRule = 'last' | 'first' | 'spread';

export interface WalletInstallment {
  /** 1-based: 1 = primera cuota del plan. */
  n: number;
  /** Fecha de la cuota (UTC a medianoche). */
  date: Date;
  /** Importe de la cuota en centavos. */
  cents: number;
}

/**
 * Calendario de cuotas de un plan MSI.
 *
 * El día de la primera cuota (`msiStartDate`) se repite cada mes,
 * ajustado al último día del mes. El residuo de centavos se reparte según
 * la regla del plan; en las tres reglas la suma de las cuotas recupera
 * el importe original.
 */
export function computeMsiInstallments(
  tx: Transaction,
  rule?: MsiPlanRule,
): WalletInstallment[] {
  if (tx.type !== 'expense_msi') return [];
  const effectiveRule: MsiPlanRule = rule ?? tx.msiPlanRule ?? 'last';
  const months = tx.msiMonths as number;
  const amount = tx.amount;
  if (months <= 0 || amount <= 0) return [];

  const first = parseIsoDay(tx.msiStartDate);
  const firstDay = first.getUTCDate();
  const firstYear = first.getUTCFullYear();
  const firstMonth = first.getUTCMonth() + 1;

  const base = Math.floor(amount / months);
  const residue = amount % months;

  const installments: WalletInstallment[] = [];
  for (let index = 1; index <= months; index += 1) {
    const target = shiftMonth(firstYear, firstMonth, index - 1);
    const day = Math.min(firstDay, daysInMonth(target.year, target.month));
    let cents = base;
    if (effectiveRule === 'first' && index === 1) cents += residue;
    else if (effectiveRule === 'spread' && index <= residue) cents += 1;
    else if (effectiveRule === 'last' && index === months) cents += residue;
    installments.push({
      n: index,
      date: utcDate(target.year, target.month, day),
      cents,
    });
  }
  return installments;
}

export interface WalletMsiPlan {
  id: string;
  cardId: string;
  description: string;
  monthsTotal: number;
  /** Todas las cuotas del plan. */
  installments: WalletInstallment[];
  /** Cuotas pendientes desde el mes de referencia (inclusive). */
  pending: WalletInstallment[];
  /** Saldo pendiente en centavos. */
  remainingCents: number;
  /** Cuotas por cubrir. */
  installmentsLeft: number;
  /** Número (1-based) de la primera cuota pendiente. */
  currentInstallment: number | null;
  /** Importe de la cuota del mes de referencia. */
  monthlyCents: number;
}

/**
 * Planes MSI de una tarjeta con cuotas pendientes desde el mes de
 * referencia. Los meses anteriores se consideran cubiertos: un plan sin
 * cuotas pendientes se descarta.
 */
export function computeMsiPlans(
  transactions: Transaction[],
  cardId: string,
  ref: Date,
): WalletMsiPlan[] {
  const referenceMonth = monthOf(ref);
  const plans: WalletMsiPlan[] = [];

  for (const tx of transactions) {
    if (tx.type !== 'expense_msi') continue;
    if (tx.cardId !== cardId) continue;
    const installments = computeMsiInstallments(tx);
    const pending = installments.filter(
      (installment) => monthOf(installment.date) >= referenceMonth,
    );
    if (pending.length === 0) continue;
    const first = pending[0];
    plans.push({
      id: tx.id,
      cardId: tx.cardId,
      description: tx.description,
      monthsTotal: tx.msiMonths as number,
      installments,
      pending,
      remainingCents: pending.reduce((sum, i) => sum + i.cents, 0),
      installmentsLeft: pending.length,
      currentInstallment: first?.n ?? null,
      monthlyCents:
        installments.find((i) => monthOf(i.date) === referenceMonth)?.cents ?? 0,
    });
  }

  return plans.sort((a, b) => b.remainingCents - a.remainingCents);
}

// ---------------------------------------------------------------------------
// Crédito usado y disponible
// ---------------------------------------------------------------------------

export interface WalletCardUsage {
  card: Card;
  /** Límite registrado en centavos (0 si no hay). */
  limitCents: number;
  /** Crédito usado: MSI pendiente + compras de un solo pago. */
  usedCents: number;
  /** Disponible estimado: `max(0, límite − usado)`. */
  availableCents: number;
  /** Porcentaje de uso (0 si no hay límite). */
  percent: number;
  /** Planes MSI con cuotas pendientes. */
  plans: WalletMsiPlan[];
  /** Compras de un solo pago que todavía consumen crédito. */
  singlePurchases: Transaction[];
}

/**
 * Vencimiento de una compra de un solo pago: el corte que la agrupa
 * (el del mes de la compra, o el del mes siguiente si la compra es
 * posterior al corte) más el plazo de pago.
 */
export function purchaseDueDate(card: Card, purchase: Date): Date {
  requireCredit(card);
  const days = card.daysToPayAfterCut as number;
  return addDays(cutDateOf(card, purchase), days);
}

/**
 * Crédito usado por tarjeta.
 *
 * - MSI: cuotas pendientes desde el mes de referencia.
 * - Compras de un solo pago ya realizadas cuyo vencimiento (calculado
 *   con el ciclo de la tarjeta) llega a la referencia o la supera.
 *
 * Los pagos fijos no consumen crédito: sólo afectan cuando se registran
 * como compra.
 */
export function computeCardUsage(
  card: Card,
  transactions: Transaction[],
  ref: Date,
): WalletCardUsage {
  const limitCents = card.creditLimit ?? 0;
  if (card.cardType !== 'credit') {
    return {
      card,
      limitCents: 0,
      usedCents: 0,
      availableCents: 0,
      percent: 0,
      plans: [],
      singlePurchases: [],
    };
  }

  const plans = computeMsiPlans(transactions, card.id, ref);
  const usedByPlans = plans.reduce((sum, plan) => sum + plan.remainingCents, 0);

  const refIso = isoOf(ref);
  const singlePurchases = transactions.filter((tx) => {
    if (tx.type !== 'expense') return false;
    if (tx.cardId !== card.id) return false;
    if (tx.date > refIso) return false;
    return purchaseDueDate(card, parseIsoDay(tx.date)).getTime() >= ref.getTime();
  });
  const usedBySingles = singlePurchases.reduce((sum, tx) => sum + tx.amount, 0);

  const usedCents = usedByPlans + usedBySingles;
  return {
    card,
    limitCents,
    usedCents,
    availableCents: Math.max(0, limitCents - usedCents),
    percent: limitCents > 0 ? Math.round((usedCents / limitCents) * 100) : 0,
    plans,
    singlePurchases,
  };
}

export interface WalletPortfolio {
  /** Suma de los límites de las tarjetas activas. */
  limitCents: number;
  /** Suma del crédito usado. */
  usedCents: number;
  /** Suma de los disponibles individuales (cada uno acotado en 0). */
  availableCents: number;
  /** Porcentaje conjunto de uso. */
  percent: number;
  /** Número de tarjetas activas. */
  cardCount: number;
}

/** Totales de la cartera a partir del uso por tarjeta. */
export function computePortfolio(usages: WalletCardUsage[]): WalletPortfolio {
  const limitCents = usages.reduce((sum, u) => sum + u.limitCents, 0);
  const usedCents = usages.reduce((sum, u) => sum + u.usedCents, 0);
  const availableCents = usages.reduce((sum, u) => sum + u.availableCents, 0);
  return {
    limitCents,
    usedCents,
    availableCents,
    percent:
      limitCents > 0 ? Math.round((100 * usedCents) / limitCents) : 0,
    cardCount: usages.length,
  };
}

// ---------------------------------------------------------------------------
// Pago previsto
// ---------------------------------------------------------------------------

export interface WalletPaymentCharge {
  /** Identificador estable del cargo (plan o pago fijo). */
  id: string;
  /** Descripción mostrable. */
  description: string;
  /** Fecha del cargo. */
  date: Date;
  /** Importe en centavos. */
  cents: number;
  /** Número de cuota y total del plan (sólo MSI). */
  installment?: { n: number; of: number };
}

export interface WalletPayment {
  card: Card;
  cut: Date;
  due: Date;
  daysLeft: number;
  /** Cuotas MSI del mes del vencimiento. */
  installments: WalletPaymentCharge[];
  /** Compras de un solo pago del estado de cuenta. */
  purchases: WalletPaymentCharge[];
  /** Pagos fijos previstos para el ciclo. */
  fixed: WalletPaymentCharge[];
  /** Suma de los tres grupos. */
  totalCents: number;
}

/** Normaliza una descripción para comparar cargos (sin tildes, minúsculas). */
export function normalizeDescription(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Fecha de un pago fijo dentro de un mes (día de cobro acotado al
 * último día del mes).
 */
function fixedDateInMonth(fp: FixedPayment, month: string): Date {
  const [year, m] = month.split('-').map(Number);
  return utcDate(year ?? 1970, m ?? 1, clampDay(fp.paymentDay, year ?? 1970, m ?? 1));
}

/**
 * Pago previsto de una tarjeta para su próximo vencimiento.
 *
 * El estado de cuenta va del día siguiente al corte anterior hasta el
 * corte. Se agrupan las cuotas MSI del mes del vencimiento, las compras
 * de un solo pago del periodo y los pagos fijos previstos para el ciclo.
 * Un cargo fijo que ya está registrado como compra (misma tarjeta,
 * fecha, importe y descripción normalizada) se cuenta una sola vez.
 */
export function computeExpectedPayment(
  card: Card,
  transactions: Transaction[],
  fixedPayments: FixedPayment[],
  ref: Date,
): WalletPayment {
  const deadline = computeNextDeadline(card, ref);
  const dueMonth = monthOf(deadline.due);
  const days = card.daysToPayAfterCut as number;
  const cutDay = card.cutDay as number;

  const cutYear = deadline.cut.getUTCFullYear();
  const cutMonth = deadline.cut.getUTCMonth() + 1;
  const previous = shiftMonth(cutYear, cutMonth, -1);
  const windowStart = addDays(
    utcDate(
      previous.year,
      previous.month,
      clampDay(cutDay, previous.year, previous.month),
    ),
    1,
  );

  const installments: WalletPaymentCharge[] = [];
  for (const tx of transactions) {
    if (tx.type !== 'expense_msi' || tx.cardId !== card.id) continue;
    const schedule = computeMsiInstallments(tx);
    for (const installment of schedule) {
      if (monthOf(installment.date) !== dueMonth) continue;
      installments.push({
        id: `${tx.id}:${installment.n}`,
        description: tx.description,
        date: installment.date,
        cents: installment.cents,
        installment: { n: installment.n, of: tx.msiMonths as number },
      });
    }
  }

  const windowStartIso = isoOf(windowStart);
  const cutIso = isoOf(deadline.cut);
  const purchases: WalletPaymentCharge[] = transactions
    .filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.cardId === card.id &&
        tx.date >= windowStartIso &&
        tx.date <= cutIso,
    )
    .map((tx) => ({
      id: tx.id,
      description: tx.description,
      date: parseIsoDay(tx.date),
      cents: tx.amount,
    }));

  const fixed: WalletPaymentCharge[] = [];
  for (const fp of fixedPayments) {
    if (fp.cardId !== card.id) continue;
    const months = [
      monthOf(windowStart),
      monthOf(deadline.cut),
    ].filter((month, index, all) => all.indexOf(month) === index);
    for (const month of months) {
      const date = fixedDateInMonth(fp, month);
      const iso = isoOf(date);
      if (iso < windowStartIso || iso > cutIso) continue;
      if (!isFixedPaymentDueThisMonth(fp, parseIsoDay(`${month}-01`))) continue;
      // Ya registrado como compra: no se cuenta dos veces.
      const duplicated = purchases.some(
        (purchase) =>
          isoOf(purchase.date) === iso &&
          purchase.cents === fp.amount &&
          normalizeDescription(purchase.description) ===
            normalizeDescription(fp.description),
      );
      if (duplicated) continue;
      fixed.push({
        id: `${fp.id}:${iso}`,
        description: fp.description,
        date,
        cents: fp.amount,
      });
    }
  }

  const totalCents =
    installments.reduce((sum, charge) => sum + charge.cents, 0) +
    purchases.reduce((sum, charge) => sum + charge.cents, 0) +
    fixed.reduce((sum, charge) => sum + charge.cents, 0);

  void days;

  return {
    card,
    cut: deadline.cut,
    due: deadline.due,
    daysLeft: deadline.daysLeft,
    installments,
    purchases,
    fixed,
    totalCents,
  };
}

/** Pagos previstos de varias tarjetas, del más próximo al más lejano. */
export function computeUpcomingPayments(
  cards: Card[],
  transactions: Transaction[],
  fixedPayments: FixedPayment[],
  ref: Date,
): WalletPayment[] {
  const payments = cards
    .filter((card) => card.cardType === 'credit')
    .map((card) =>
      computeExpectedPayment(card, transactions, fixedPayments, ref),
    )
    .filter((payment) => payment.totalCents > 0)
    .sort((a, b) => a.due.getTime() - b.due.getTime());
  return payments;
}

// ---------------------------------------------------------------------------
// Compras a meses
// ---------------------------------------------------------------------------

export interface WalletMsiPurchase {
  id: string;
  cardId: string;
  /** Nombre de la tarjeta dueña del plan. */
  cardName: string;
  description: string;
  /** Plazo total del plan en meses. */
  term: number;
  /** Cuotas por cubrir. */
  installmentsLeft: number;
  /** Saldo pendiente en centavos. */
  remainingCents: number;
  /** Importe de la cuota del mes de referencia. */
  monthlyCents: number;
}

/**
 * Compras a meses activas de toda la cartera, de mayor a menor saldo
 * pendiente. `limit` acota cuántas se devuelven (la pantalla muestra las
 * tres primeras y el resto en "Ver las N").
 */
export function computeMsiPurchases(
  cards: Card[],
  transactions: Transaction[],
  ref: Date,
  limit?: number,
): WalletMsiPurchase[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const purchases: WalletMsiPurchase[] = [];
  for (const card of cards) {
    if (card.cardType !== 'credit') continue;
    for (const plan of computeMsiPlans(transactions, card.id, ref)) {
      purchases.push({
        id: plan.id,
        cardId: card.id,
        cardName: card.bank,
        description: plan.description,
        term: plan.monthsTotal,
        installmentsLeft: plan.installmentsLeft,
        remainingCents: plan.remainingCents,
        monthlyCents: plan.monthlyCents,
      });
    }
  }
  const sorted = purchases.sort(
    (a, b) =>
      b.remainingCents - a.remainingCents || a.description.localeCompare(b.description),
  );
  void byId;
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

/** Plazos disponibles (meses) de las compras a meses activas, de mayor a menor. */
export function computeMsiTerms(purchases: WalletMsiPurchase[]): number[] {
  return [...new Set(purchases.map((purchase) => purchase.term))].sort(
    (a, b) => b - a,
  );
}
