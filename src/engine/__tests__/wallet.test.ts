/**
 * Motor de la cartera — pruebas
 *
 * El fixture reproduce la semilla de la referencia ejecutable
 * (`Tarjetas-autonoma.html`) con la convención de la app: el plazo de
 * pago se guarda como "días después del corte", así que los 32 días
 * inclusivos de la referencia se guardan como 31.
 *
 * Las cifras esperadas son el contrato de aceptación del encargo.
 */
import { describe, expect, it } from 'vitest';
import type { Card, FixedPayment, Transaction } from '@/db/schemas';
import {
  computeCardUsage,
  computeExpectedPayment,
  computeMsiInstallments,
  computeMsiPlans,
  computeMsiPurchases,
  computeMsiTerms,
  computeNextDeadline,
  computePortfolio,
  computeUpcomingPayments,
  isoOf,
  referenceDate,
} from '../wallet';

const REF = new Date(Date.UTC(2026, 10, 20)); // 2026-11-20

const PLATA: Card = {
  id: 'card-plata',
  bank: 'PLATA',
  holderName: 'Bryan Nuñez',
  cardType: 'credit',
  cutDay: 22,
  daysToPayAfterCut: 31, // 32 días inclusivos en la referencia
  creditLimit: 2_550_000,
  priority: 0,
  skin: 'silver',
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};

const MERCADO: Card = {
  id: 'card-mercadopago',
  bank: 'Mercado Pago',
  holderName: 'Bryan Nuñez',
  cardType: 'credit',
  cutDay: 27,
  daysToPayAfterCut: 11, // 12 días inclusivos
  creditLimit: 5_380_000,
  priority: 1,
  skin: 'ocean',
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};

const STORI: Card = {
  id: 'card-stori',
  bank: 'Stori',
  holderName: 'Bryan Nuñez',
  cardType: 'credit',
  cutDay: 13,
  daysToPayAfterCut: 22, // 23 días inclusivos
  creditLimit: 1_200_000,
  priority: 2,
  skin: 'forest',
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};

const CARDS = [PLATA, MERCADO, STORI];

interface PlanSeed {
  id: string;
  cardId: string;
  description: string;
  amount: number;
  date: string;
  months: number;
  first: string;
}

const PLAN_SEEDS: PlanSeed[] = [
  { id: 'p1', cardId: MERCADO.id, description: 'Compras atrasadas', amount: 672_195, date: '2025-04-28', months: 15, first: '2025-05-27' },
  { id: 'p2', cardId: MERCADO.id, description: 'Compras Atrasadas', amount: 695_880, date: '2025-05-10', months: 15, first: '2025-05-27' },
  { id: 'p3', cardId: MERCADO.id, description: 'Compras Atrasadas', amount: 911_265, date: '2026-01-28', months: 15, first: '2026-02-27' },
  { id: 'p4', cardId: PLATA.id, description: 'Monitor Sansung', amount: 164_999, date: '2026-05-22', months: 12, first: '2026-06-22' },
  { id: 'p5', cardId: PLATA.id, description: 'Silla', amount: 384_924, date: '2026-05-23', months: 12, first: '2026-06-22' },
  { id: 'p6', cardId: MERCADO.id, description: 'Galaxy S26 Papá', amount: 1_781_193, date: '2026-05-28', months: 24, first: '2026-06-27' },
  { id: 'p7', cardId: MERCADO.id, description: 'Definidor de Rizos', amount: 198_130, date: '2026-05-28', months: 10, first: '2026-06-27' },
  { id: 'p8', cardId: MERCADO.id, description: 'Base de Silla', amount: 80_548, date: '2026-05-28', months: 4, first: '2026-06-27' },
  { id: 'p9', cardId: MERCADO.id, description: 'iPad 11 Pulgadas', amount: 739_368, date: '2026-06-29', months: 18, first: '2026-07-27' },
  { id: 'p10', cardId: MERCADO.id, description: 'iPad Air', amount: 1_372_224, date: '2026-07-05', months: 24, first: '2026-07-27' },
  { id: 'p11', cardId: MERCADO.id, description: 'Shampoo de mamá', amount: 39_300, date: '2026-08-05', months: 4, first: '2026-08-27' },
];

const PLANS: Transaction[] = PLAN_SEEDS.map((seed) => ({
  id: seed.id,
  type: 'expense_msi',
  amount: seed.amount,
  currency: 'MXN',
  description: seed.description,
  date: seed.date,
  category: 'Otros',
  paymentMethod: 'credit',
  cardId: seed.cardId,
  msiMonths: seed.months,
  msiStartDate: seed.first,
  msiPlanRule: 'first',
}));

/** Compras de un solo pago: todas vencen antes de la referencia. */
const PURCHASES: Transaction[] = [
  {
    id: 'e1',
    type: 'expense',
    amount: 67_000,
    currency: 'MXN',
    description: 'LeQuack',
    date: '2026-05-28',
    category: 'Comida',
    paymentMethod: 'credit',
    cardId: PLATA.id,
  },
  {
    id: 'e2',
    type: 'expense',
    amount: 23_300,
    currency: 'MXN',
    description: 'Cine: Resident Evil',
    date: '2026-09-29',
    category: 'Entretenimiento',
    paymentMethod: 'credit',
    cardId: STORI.id,
  },
];

const FIXED: FixedPayment[] = [
  { id: 'f1', amount: 200_000, description: 'Hybidge', paymentDay: 13, period: 'monthly', category: 'Escuela', paymentMethod: 'cash', cardId: STORI.id, createdAt: '2026-06-06T12:00:00.000Z', updatedAt: '2026-06-06T12:00:00.000Z' },
  { id: 'f2', amount: 23_900, description: 'Apple Music Familia', paymentDay: 1, period: 'monthly', category: 'Entretenimiento', paymentMethod: 'cash', cardId: STORI.id, createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z' },
  { id: 'f3', amount: 4_900, description: 'iCloud Storage', paymentDay: 1, period: 'monthly', category: 'Suscripción', paymentMethod: 'cash', cardId: STORI.id, createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z' },
  { id: 'f4', amount: 18_000, description: 'Minimax API', paymentDay: 1, period: 'monthly', category: 'AI', paymentMethod: 'cash', cardId: STORI.id, createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z' },
  { id: 'f5', amount: 30_000, description: 'Saldo OXXO', paymentDay: 1, period: 'monthly', category: 'Comunicación', paymentMethod: 'cash', cardId: STORI.id, createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z' },
  { id: 'f6', amount: 300_000, description: 'Gasolina', paymentDay: 1, period: 'monthly', category: 'Transporte', paymentMethod: 'cash', cardId: STORI.id, createdAt: '2026-09-22T12:00:00.000Z', updatedAt: '2026-09-22T12:00:00.000Z' },
  { id: 'f7', amount: 770_000, description: 'Renta', paymentDay: 1, period: 'monthly', category: 'Hogar', paymentMethod: 'transfer', cardId: MERCADO.id, createdAt: '2026-10-13T12:00:00.000Z', updatedAt: '2026-10-13T12:00:00.000Z' },
];

const ALL = [...PLANS, ...PURCHASES];

describe('wallet engine', () => {
  describe('próximo vencimiento', () => {
    it('elige el primer vencimiento que todavía no pasa', () => {
      expect(isoOf(computeNextDeadline(PLATA, REF).cut)).toBe('2026-10-22');
      expect(isoOf(computeNextDeadline(PLATA, REF).due)).toBe('2026-11-22');
      expect(computeNextDeadline(PLATA, REF).daysLeft).toBe(2);

      expect(isoOf(computeNextDeadline(STORI, REF).cut)).toBe('2026-11-13');
      expect(isoOf(computeNextDeadline(STORI, REF).due)).toBe('2026-12-05');
      expect(computeNextDeadline(STORI, REF).daysLeft).toBe(15);

      expect(isoOf(computeNextDeadline(MERCADO, REF).cut)).toBe('2026-11-27');
      expect(isoOf(computeNextDeadline(MERCADO, REF).due)).toBe('2026-12-08');
      expect(computeNextDeadline(MERCADO, REF).daysLeft).toBe(18);
    });
  });

  describe('crédito usado y disponible', () => {
    it('suma las cuotas MSI pendientes y las compras que siguen vigentes', () => {
      const plata = computeCardUsage(PLATA, ALL, REF);
      expect(plata.usedCents).toBe(320_782);
      expect(plata.availableCents).toBe(2_229_218);
      expect(plata.percent).toBe(13);

      const mercado = computeCardUsage(MERCADO, ALL, REF);
      expect(mercado.usedCents).toBe(3_602_084);
      expect(mercado.availableCents).toBe(1_777_916);
      expect(mercado.percent).toBe(67);

      const stori = computeCardUsage(STORI, ALL, REF);
      expect(stori.usedCents).toBe(0);
      expect(stori.availableCents).toBe(1_200_000);
      expect(stori.percent).toBe(0);
    });

    it('el disponible conjunto es la suma de los disponibles individuales', () => {
      const portfolio = computePortfolio(
        CARDS.map((card) => computeCardUsage(card, ALL, REF)),
      );
      expect(portfolio.limitCents).toBe(9_130_000);
      expect(portfolio.usedCents).toBe(3_922_866);
      expect(portfolio.availableCents).toBe(5_207_134);
      expect(portfolio.percent).toBe(43);
      expect(portfolio.cardCount).toBe(3);
    });

    it('una tarjeta de débito no tiene crédito', () => {
      const debit: Card = { ...PLATA, cardType: 'debit', cutDay: undefined, daysToPayAfterCut: undefined, creditLimit: undefined };
      const usage = computeCardUsage(debit, ALL, REF);
      expect(usage.usedCents).toBe(0);
      expect(usage.availableCents).toBe(0);
      expect(usage.percent).toBe(0);
    });
  });

  describe('pago previsto', () => {
    it('PLATA: sólo cuotas MSI del mes del vencimiento', () => {
      const payment = computeExpectedPayment(PLATA, ALL, FIXED, REF);
      expect(payment.totalCents).toBe(45_826);
      expect(payment.installments).toHaveLength(2);
      expect(payment.purchases).toHaveLength(0);
      expect(payment.fixed).toHaveLength(0);
    });

    it('Stori: sólo pagos fijos del ciclo', () => {
      const payment = computeExpectedPayment(STORI, ALL, FIXED, REF);
      expect(payment.totalCents).toBe(576_800);
      expect(payment.fixed).toHaveLength(6);
      expect(payment.installments).toHaveLength(0);
    });

    it('Mercado Pago: cuotas MSI más la renta del ciclo', () => {
      const payment = computeExpectedPayment(MERCADO, ALL, FIXED, REF);
      expect(payment.totalCents).toBe(1_023_032);
      expect(payment.installments).toHaveLength(5);
      expect(payment.fixed.map((charge) => charge.description)).toEqual(['Renta']);
    });

    it('ordena los próximos pagos del más próximo al más lejano', () => {
      const upcoming = computeUpcomingPayments(CARDS, ALL, FIXED, REF);
      expect(upcoming.map((payment) => payment.card.bank)).toEqual([
        'PLATA',
        'Stori',
        'Mercado Pago',
      ]);
      expect(upcoming.map((payment) => payment.totalCents)).toEqual([
        45_826, 576_800, 1_023_032,
      ]);
    });
  });

  describe('compras a meses', () => {
    it('deja ocho planes activos y ordena por saldo pendiente', () => {
      const purchases = computeMsiPurchases(CARDS, ALL, REF);
      expect(purchases).toHaveLength(8);
      expect(purchases[0]!.description).toBe('Galaxy S26 Papá');
      expect(purchases[0]!.remainingCents).toBe(1_410_104);
      expect(purchases[0]!.installmentsLeft).toBe(19);
      expect(purchases[0]!.term).toBe(24);
    });

    it('expone los plazos disponibles de mayor a menor', () => {
      const purchases = computeMsiPurchases(CARDS, ALL, REF);
      expect(computeMsiTerms(purchases)).toEqual([24, 18, 15, 12, 10, 4]);
    });

    it('el filtro de 12 meses deja dos compras', () => {
      const purchases = computeMsiPurchases(CARDS, ALL, REF);
      const filtered = purchases.filter((purchase) => purchase.term === 12);
      expect(filtered).toHaveLength(2);
      expect(
        filtered.reduce((sum, purchase) => sum + purchase.remainingCents, 0),
      ).toBe(320_782);
    });
  });

  describe('redondeo de cuotas', () => {
    it('la regla "first" deja el residuo en la primera cuota', () => {
      const plan = PLANS.find((tx) => tx.id === 'p4') as Transaction;
      const installments = computeMsiInstallments(plan, 'first');
      expect(installments[0]!.cents).toBe(13_760);
      expect(installments[1]!.cents).toBe(13_749);
      expect(installments.reduce((sum, i) => sum + i.cents, 0)).toBe(plan.amount);
    });

    it('la regla "spread" reparte un centavo entre las primeras cuotas', () => {
      const plan = PLANS.find((tx) => tx.id === 'p4') as Transaction;
      const installments = computeMsiInstallments(plan, 'spread');
      // 164999 = 12 × 13749 + 11 → las 11 primeras cuotas llevan +1.
      expect(installments[0]!.cents).toBe(13_750);
      expect(installments[10]!.cents).toBe(13_750);
      expect(installments[11]!.cents).toBe(13_749);
      expect(installments.reduce((sum, i) => sum + i.cents, 0)).toBe(plan.amount);
    });

    it('la regla "last" deja el residuo en la última cuota', () => {
      const plan = PLANS.find((tx) => tx.id === 'p4') as Transaction;
      const installments = computeMsiInstallments(plan, 'last');
      expect(installments[10]!.cents).toBe(13_749);
      expect(installments[11]!.cents).toBe(13_760);
      expect(installments.reduce((sum, i) => sum + i.cents, 0)).toBe(plan.amount);
    });

    it('repite el día de la primera cuota y lo ajusta al fin de mes', () => {
      const plan: Transaction = {
        id: 'p-day',
        type: 'expense_msi',
        amount: 90_000,
        currency: 'MXN',
        description: 'Plan de prueba',
        date: '2026-01-31',
        category: 'Otros',
        paymentMethod: 'credit',
        cardId: MERCADO.id,
        msiMonths: 3,
        msiStartDate: '2026-01-31',
        msiPlanRule: 'last',
      };
      const installments = computeMsiInstallments(plan, 'last');
      expect(installments.map((i) => isoOf(i.date))).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
      ]);
    });
  });

  describe('referencia', () => {
    it('usa el día calendario local del reloj', () => {
      const local = new Date(2026, 10, 20, 23, 30);
      expect(isoOf(referenceDate(local))).toBe('2026-11-20');
    });
  });

  describe('planes MSI', () => {
    it('descarta los planes sin cuotas pendientes', () => {
      const plans = computeMsiPlans(ALL, MERCADO.id, REF);
      expect(plans.map((plan) => plan.description)).not.toContain('Base de Silla');
      expect(plans).toHaveLength(6);
    });
  });
});
