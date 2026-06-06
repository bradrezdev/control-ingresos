# Design — hot-fixes-batch-2

> **RED Jazmin:** Backend/data architect speaking. This design fixes 7 bugs in the
> `control-ingresos` PWA across the money pipeline, card-cycle model, date
> storage, MSI plazo list, and budget engine. Modality is **fast-forward**:
> requirements are embedded in this header. Delivery is **stacked-to-main
> chained PRs** (4 work units, each independently shippable + revertable).

## Requirements summary (embedded spec)

For each of the 7 bugs: 1-paragraph requirement + acceptance criteria as
testable assertions. Spanish neutral, verbatim where it comes from the user.

### R-1 — Money ×100 on save
**Requirement:** Al guardar una transacción (income, expense o expense_msi) el
monto persistido en IndexedDB debe ser exactamente el monto en centavos
ingresado por el usuario. Hoy la app multiplica por 100 dos veces: una en
`TransactionForm.tsx:213` (`onChangeCents` mal conectado) y otra en
`pages/Transactions.tsx:81` (caller vuelve a multiplicar). Resultado: $200 se
guarda como 2000000 centavos → $20,000 MXN en la UI.

**Acceptance criteria:**
- `TransactionForm` form state `amount` siempre contiene **centavos enteros**.
- `getMsiMonthlyAmount` y `getMsiInstallmentAmount` operan en **centavos**.
- `formatCurrency` recibe **centavos** (no display numbers).
- Vitest: `TransactionForm.test.tsx` (nuevo) — escribir 200, submitir, leer de
  Dexie, assert `tx.amount === 20000`.
- Vitest: `MsiSelector.test.tsx` adicional — total=120000¢, plazo=12 →
  preview `$100.00/mes` (no `$10000.00/mes`).

### R-2 — `last4` residue en UI + backup
**Requirement:** El campo `last4` quedó oculto en el form pero sigue
referenciado en 10 lugares (CardListItem, CardSelect placeholder, SmartShopper
mask, TransactionsTable, DeleteCardConfirm, engine rationale, schema,
CardForm write-through, backup schema). El plan es **remover el campo
completamente** de schema, UI y backup, en la misma migración que R-3.

**Acceptance criteria:**
- `CardSchema` no incluye `last4`.
- `CardListItem`, `DeleteCardConfirm`, `TransactionsTable`, `CardSelect` ya no
  imprimen `**** {last4}` — solo el nombre del banco.
- `CardSelect` placeholder: `"Tarjeta S ****"` → `"Tarjeta S"`.
- `CardForm` ya no escribe `last4: card?.last4 ?? ""`.
- `BackupDataSchema` valida sin `last4` (v2).
- Vitest: `CardListItem.test.tsx` (nuevo) — assert no contiene `****`.
- Vitest: snapshot de `TransactionsTable.test.tsx` (nuevo o actualizado).

### R-3 — Card cycle model: `paymentDueDay` → `daysToPayAfterCut`
**Requirement:** El modelo `paymentDueDay: 1..31` no modela correctamente el
caso Tarjeta P (cut=22, paymentDueDay=22 → cycleLength=0 días). Migramos a
`daysToPayAfterCut: 1..62` (días entre el corte y el próximo pago). El motor
`computeCutCycle` calcula `paymentDate = previousCutDate + daysToPayAfterCut`.
Backfill automático en el upgrade hook de Dexie.

**Acceptance criteria:**
- `CardSchema` define `daysToPayAfterCut: z.number().int().min(1).max(62)`.
- Backfill (v1 → v2): `(paymentDueDay >= cutDay) ? (paymentDueDay - cutDay)
  : (30 - cutDay + paymentDueDay)`. Si resultado es 0 → 30 (Tarjeta P).
- Backfill esperado: S(13,3)→20, M(27,7)→10, P(22,22)→0→30.
- `computeCutCycle` recalculado: `cycleLengthDays === daysToPayAfterCut` (constante
  por tarjeta, no varía por `today`).
- Vitest: `cycle.test.ts` cubre cada tarjeta del usuario (S, M, P) y
  end-to-end: hoy=2026-06-04, cut=15, daysToPayAfterCut=20 → cutDate=2026-06-15,
  paymentDate=2026-07-05, cycleLengthDays=20.
- Migration test con `fake-indexeddb`: sembrar v1 con Tarjeta P, abrir v2,
  assert `daysToPayAfterCut === 30` y `paymentDueDay` removido.

### R-4 — Date-only storage (UTC offset bug)
**Requirement:** Las fechas se persisten como ISO datetime (`...T00:00:00.000Z`).
Cuando un usuario en zona horaria UTC-6 edita una transacción del 2026-06-04,
el `new Date("2026-06-04").toISOString()` produce `2026-06-04T06:00:00.000Z` y
en la UI vuelve a mostrarse como 2026-06-04 (OK). Pero en round-trips con
horas no-medianoche el offset local puede empujar la fecha al día previo. La
solución: schema `z.iso.date()` (YYYY-MM-DD) y helpers locales.

**Acceptance criteria:**
- `TransactionSchema.date`, `MsiExpenseSchema.msiStartDate`,
  `DebtSchema.startDate` y `DebtSchema.endDate` son `z.iso.date()`.
- `src/lib/date/local.ts` exporta:
  - `toLocalDateString(date: Date): string` — usa `getFullYear/getMonth/getDate`.
  - `fromLocalDateString(s: string): Date` — `new Date(year, month-1, day)`.
  - `todayLocalDateString(): string`.
- `TransactionForm.tsx` y `DebtForm.tsx` ya no llaman `.toISOString()` sobre
  fechas del form: pasan strings `YYYY-MM-DD` directo.
- Legacy normalizer: en el Dexie upgrade (v2 → v3) o en `useLiveTransactions`
  read-through, recortar `...T...` a `YYYY-MM-DD` con `slice(0, 10)`.
- Vitest: `local.test.ts` (nuevo) — toLocalDateString(new Date(2026, 5, 4))
  === `"2026-06-04"`; fromLocalDateString round-trip idempotente.
- Vitest: `TransactionForm.test.tsx` — submitir fecha `2026-06-04`, leer de
  Dexie, assert `tx.date === "2026-06-04"`.

### R-5 — MSI plazo 1 mes
**Requirement:** Agregar 1 mes a la lista de plazos MSI: `[1, 3, 6, 9, 12, 18, 24]`.
Con plazo 1, la "cuota regular" es el monto total y la "última cuota" no
existe (residue = 0).

**Acceptance criteria:**
- `MSI_TERM = [1, 3, 6, 9, 12, 18, 24] as const` en `transaction.ts`.
- `MsiMonths` Zod union incluye `z.literal(1)`.
- `TransactionForm.tsx:43-45` replica el union en el schema del form.
- `MsiSelector` grid: `grid-cols-3 sm:grid-cols-7` (o `auto-fit minmax`).
- `MsiSummary` color palette se vuelve función `getColorForTerm(term)` para
  que MSI_TERM futuro no desincronice.
- Vitest: `MsiSelector.test.tsx` — `radios.length === 7`, assert contains "1".
- Vitest: `msi.test.ts` adicional — `getMsiMonthlyAmount(1200, 1) === 1200`,
  `getMsiInstallmentAmount(1200, 1, 1) === 1200`,
  `computeMsiSchedule({...12 meses, 1200}, today)` tiene 1 sola entrada
  `{year, month, amount: 1200}`.
- Vitest: `MsiSummary.test.tsx` (nuevo o actualizar) — chart con 7 labels.

### R-6 — MSI installment preview muestra centavos como pesos
**Requirement:** `MsiSelector.tsx:84` y `TransactionForm.tsx:338` hacen
`formatCurrency(monthly * 100, currency)` cuando `monthly` ya viene del
engine en display number → resultado es 100× más grande. Junto con R-1 (la
entrada también está inflada), el preview llega a mostrar valores absurdos.

**Acceptance criteria:**
- `MsiSelector` preview: `formatCurrency(monthlyCents, currency)` donde
  `monthlyCents = Math.round(monthly * 100)` (engine returns display number,
  boundary convierte a cents).
- `TransactionForm` monthlyPreview: misma corrección.
- Vitest: cobertura agregada a los tests de R-1.

### R-7 — Budget widget incompleto
**Requirement (R-7-A — MSI first-month off-by-one):** El gate
`monthsSinceStart < 1 || monthsSinceStart > msiMonths` salta la primera cuota
MSI. En `computeMonthlySpending` y `computePaymentForCurrentMonth`, el gate
debería ser `monthsSinceStart < 0 || monthsSinceStart >= msiMonths` y pasar
`monthsSinceStart + 1` a `getMsiInstallmentAmount` (que es 1-based).

**Acceptance criteria (R-7-A):**
- `computeMonthlySpending`: si MSI empezó este mes (monthsSinceStart=0),
  incluir cuota 1 = `getMsiInstallmentAmount(amount, msiMonths, 1)`.
- `computePaymentForCurrentMonth`: misma corrección.
- Vitest: `budget.test.ts` — MSI `msiStartDate = today` (mes actual),
  assert que la cuota 1 se cuenta en el total.

**Requirement (R-7-B — cash expense moves widget):** El usuario reportó que
un gasto en efectivo no movía el widget. **No confirmado al nivel del engine.**
`budget.test.ts:31-49` ya prueba que cash `paymentMethod='cash'` SÍ se suma.
Probable causa: el bug R-1 infló los totales al 200%+, ocultando el efecto de
nuevas transacciones. La verificación manual ocurre en `sdd-apply` después de
mergear R-1.

**Acceptance criteria (R-7-B):**
- Verificación manual en `sdd-apply` post-WU-A.
- Si tras R-1 el widget sigue inmóvil con cash, escalar como batch 3 (no se
  cierra este design con bug abierto).

## Architecture decisions

### AD-1: Money pipeline contract

**Choice:** Cents (integer) es la unidad canónica en **todo** el pipeline
form → repo → engine → renderer. Display numbers existen **solo** en el
último paso, en la frontera hacia la UI (renderizado de `formatCurrency` y
`CurrencyInput`).

**Why:** ADR-03 del proyecto (visible en `lib/money/format.ts`) ya establece
"All money is stored as integer cents internally". Pero la implementación
incumple: `TransactionForm` setea `amount` con un round-trip
`displayToCents(cents) / 100` y `Transactions.tsx:81` aplica `centsToDisplay`
asumiendo display. El engine (`getMsiMonthlyAmount`, `getMsiInstallmentAmount`,
`computeMsiSchedule`) opera en display numbers, no en cents. La consecuencia
es ambigüedad: nadie sabe si `tx.amount` es cents o display, y se acumulan
conversiones cruzadas.

**Alternatives considered:**

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| A) Cents en storage + engine | Una sola unidad, sin ambigüedad. ADR-03 se cumple literalmente. | Hay que cambiar firmas de `getMsiMonthlyAmount`/`getMsiInstallmentAmount` y actualizar ~9 tests de msi.test.ts. | **Elegida** |
| B) Display en storage (revierte ADR-03) | Cero cambios al engine, tests pasan tal cual. | Pierde invariante de no-float-money, rompe `TransactionsTable.tsx:147` (`centsToDisplay(tx.amount)`) y `MsiSummary.tsx:82`. | Rechazada |
| C) Wrapper de cents en el repo | Sin cambios de schema, defensa en repo. | No arregla el form (sigue mandando display). Genera doble round-trip oculto. | Rechazada |

**Implementation del cambio (A):**

1. `Transaction.tsx` form state: `amount: number` ahora contiene cents.
   Schema Zod del form mantiene `z.number().positive()` (interpretación: cents).
2. `TransactionForm.tsx:213` — fix:
   ```ts
   onChangeCents={(cents) =>
     setValue("amount", cents, { shouldDirty: true })  // cents ya viene
   }
   ```
3. `Transactions.tsx:81` — caller:
   ```ts
   amount: values.amount,  // ya son cents, NO centsToDisplay
   ```
4. Engine signature change:
   ```ts
   // antes: getMsiMonthlyAmount(amount: number /* display */, months: MsiTenure)
   // después: getMsiMonthlyAmount(amountCents: number, months: MsiTenure): number /* cents */
   export function getMsiMonthlyAmount(amountCents: number, months: MsiTenure): number {
     if (amountCents <= 0 || months <= 0) return 0;
     return Math.floor(amountCents / months);  // cents / N = cents
   }
   export function getMsiInstallmentAmount(
     amountCents: number,
     months: MsiTenure,
     monthIndex: number,
   ): number {
     if (amountCents <= 0 || months <= 0) return 0;
     if (monthIndex < 1 || monthIndex > months) return 0;
     const base = getMsiMonthlyAmount(amountCents, months);
     if (monthIndex === months) {
       return amountCents - base * (months - 1);  // absorb residue in cents
     }
     return base;
   }
   ```
5. `computeMsiSchedule`: cada entry `.amount` ahora está en cents.
6. `MsiSelector.tsx:33-40`:
   ```ts
   const previews = useMemo(
     () =>
       MSI_TERM.map((term) => {
         const monthlyCents = getMsiMonthlyAmount(totalCents, term);
         return { term, monthlyCents };
       }),
     [totalCents],
   );
   ```
   Y línea 84: `formatCurrency(monthlyCents, currency)` (sin `* 100`).
7. `TransactionForm.tsx:153-156, 338`: `formatCurrency(monthlyCents, currency)`.
8. `MsiSummary.tsx:82`: `centsToDisplay` ya no necesario — `summary[t].totalDebt`
   sigue siendo cents, pero ahora `data: MSI_TERM.map((t) => summary[t].totalDebt / 100)` …
   en realidad el chart acepta números display. Mantenemos `centsToDisplay`
   aquí: `data: MSI_TERM.map((t) => centsToDisplay(summary[t].totalDebt))`.
9. Tooltip callback línea 107: ya hacía `Math.round(value * 100)` antes de
   `formatCurrency` (asumía display). Con el cambio, `value` ahora es
   cents directamente: `formatCurrency(value, currency)`. **Cambio adicional.**

**Test deltas:**
- `MsiSelector.test.tsx:36-39` — `expect(screen.getByText(/100\.00\/mes/))` se
  mantiene (120000¢ / 12 = 10000¢ → `$100.00`). Es literalmente la misma
  aserción, pero ahora con el fix de fondo.
- `msi.test.ts` — `expect(getMsiMonthlyAmount(1000, 3)).toBe(333.33)` se
  convierte en `expect(getMsiMonthlyAmount(100000, 3)).toBe(33333)` (cents).
  Tests de invariante Σ se actualizan correspondientemente.
- `TransactionsTable.tsx:147` `accessorFn: (tx) => centsToDisplay(tx.amount)` —
  sin cambios (sigue siendo cents → display para sort).
- `computeMsiSchedule` test: ahora la entry `.amount` es cents
  (`{year: 2026, month: 6, amount: 33333}`).

**Rejected alternative** (refactor más conservador): mantener engine en display
y agregar boundary `Math.round(monthly * 100)` en `MsiSelector` y
`TransactionForm`. Esto deja el problema latente (engine no respeta ADR-03) y
los tests futuros pueden volver a fallar de la misma forma. Lo correcto es
mover el contrato a cents una sola vez.

### AD-2: Card cycle data model

**Choice:** Reemplazar `paymentDueDay: 1..31` con `daysToPayAfterCut: 1..62`
en el mismo migration que remueve `last4` (R-2). Dexie v1 → v2 con upgrade
hook que backfillea en una transacción atómica.

**Why:** El modelo `paymentDueDay` día-del-mes no captura bien la realidad:
el día de pago depende del día de corte. Para una tarjeta que corta el 22 y
paga el 22 del mes siguiente, el ciclo es 30 días aprox, no 0. El nuevo
modelo es **constante por tarjeta** (no depende de `today`) y mucho más fácil
de razonar: `cycleLengthDays === daysToPayAfterCut`, `paymentDate = cutDate +
daysToPayAfterCut días`.

**Alternatives considered:**

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| A) `daysToPayAfterCut: 1..62` + Dexie v2 upgrade | Modelo correcto, una sola migración, ciclo constante. | Backfill es heurístico; usuario debe verificar Tarjeta P. | **Elegida** |
| B) Mantener `paymentDueDay` pero arreglar la matemática del motor | Sin migración destructiva. | El modelo sigue mal; Tarjeta P (cut=pay) seguirá dando casos patológicos. | Rechazada |
| C) `cycleLengthDays` directo (sin derivar) | Cero matemáticas. | Pierde la conexión entre cutDay y paymentDate; el usuario tiene que calcular dos cosas. | Rechazada |

**Implementation details:**

`src/db/schemas/card.ts` (después):
```ts
export const CardSchema = z.object({
  id: z.uuid(),
  bank: z.string().min(1).max(60),
  holderName: z.string().min(1).max(80),
  cutDay: z.number().int().min(1).max(31),
  daysToPayAfterCut: z.number().int().min(1).max(62),
  creditLimit: z.number().positive().optional(),
  priority: z.number().int().default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
```

`src/db/database.ts` — Dexie v2:
```ts
this.version(1).stores({
  transactions: 'id, type, date, cardId, [type+date], [cardId+date]',
  cards: 'id, bank, priority, createdAt',
  debts: 'id, creditor, startDate, createdAt',
  settings: 'id',
});

this.version(2).stores({
  // Schema idéntico (no cambiamos índices); upgrade solo backfillea datos.
  transactions: 'id, type, date, cardId, [type+date], [cardId+date]',
  cards: 'id, bank, priority, createdAt',
  debts: 'id, creditor, startDate, createdAt',
  settings: 'id',
}).upgrade(async (tx) => {
  await tx.table('cards').toCollection().modify((card: unknown) => {
    const c = card as { paymentDueDay?: number; cutDay: number; last4?: string };
    // Backfill daysToPayAfterCut desde paymentDueDay.
    if (c.paymentDueDay !== undefined && c.daysToPayAfterCut === undefined) {
      const raw = c.paymentDueDay >= c.cutDay
        ? c.paymentDueDay - c.cutDay
        : 30 - c.cutDay + c.paymentDueDay;
      c.daysToPayAfterCut = raw === 0 ? 30 : raw;
    }
    // Limpieza explícita de last4 (legado de hot-fixes #1, no debe persistir).
    delete c.last4;
    delete c.paymentDueDay;
  });
});
```

`src/engine/cycle.ts` — `computeCutCycle` reescrito:
```ts
export function computeCutCycle(card: Card, today: Date): CutCycleInfo {
  const todayUtc = utcDate(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );

  const y = todayUtc.getUTCFullYear();
  const m = todayUtc.getUTCMonth() + 1;
  const d = todayUtc.getUTCDate();

  // Próximo cutDate: primera ocurrencia de cutDay >= hoy.
  const baseYear = d >= card.cutDay ? addMonths(y, m, 1).year : y;
  const baseMonth = d >= card.cutDay ? addMonths(y, m, 1).month : m;
  const clampedCut = clampDay(card.cutDay, baseYear, baseMonth);
  const cutDate = utcDate(baseYear, baseMonth, clampedCut);

  // paymentDate = cutDate + daysToPayAfterCut días, sin clamping de mes.
  const paymentDate = new Date(cutDate);
  paymentDate.setUTCDate(paymentDate.getUTCDate() + card.daysToPayAfterCut);

  const daysUntilCut = diffDays(todayUtc, cutDate);
  const daysUntilPayment = diffDays(todayUtc, paymentDate);
  const cycleLengthDays = card.daysToPayAfterCut; // constante.

  return {
    daysUntilCut,
    daysUntilPayment,
    cycleLengthDays,
    cutDate,
    paymentDate,
  };
}
```

**Backfill formula + Tarjeta P fallback (0 → 30):**
- Si `paymentDueDay >= cutDay`: `paymentDueDay - cutDay`. Ej. M(27,7) → 7-27 =
  -20, no aplica. S(13,3) → 3-13 = -10, no aplica.
- Espera, M es cut=27, paymentDueDay=7: `7 >= 27` es false → `30 - 27 + 7 = 10`.
  S es cut=13, paymentDueDay=3: `3 >= 13` es false → `30 - 13 + 3 = 20`. ✓
- P es cut=22, paymentDueDay=22: `22 >= 22` es true → `22 - 22 = 0`. Fallback 30.
- Justificación del 30: si el banco dice "pagas el mismo día que cortó", el
  usuario probablemente tiene 30 días de financiamiento (ciclo estándar). El
  usuario puede corregir manualmente a su valor real después de la migración.

**Backup schema v1 → v2:**
```ts
// src/lib/backup/schema.ts
export const BACKUP_VERSION = 2 as const;
```
Import-side: la versión 1 del export se considera legacy y se rechaza (o se
intenta un migrator mínimo). Decisión: **rechazar v1** (`min(2)` en Zod) y
documentar al usuario que debe exportar antes del upgrade. Si tiene v1
exportado, no se importa — aceptable per el explore ("user likely has no old
exports yet").

### AD-3: Date-only storage contract

**Choice:** Schema usa `z.iso.date()` (YYYY-MM-DD) en `transaction.date`,
`msiStartDate`, `debt.startDate`, `debt.endDate`. Helpers nuevos en
`src/lib/date/local.ts`. Legacy normalizer recorta datetime ISO existentes
a date-only en el upgrade Dexie v2 → v3 (o en read-through — decidir
durante apply según conveniencia).

**Why:** La app vive en zonas horarias no-UTC. Tratar "2026-06-04" como
`2026-06-04T00:00:00.000Z` y luego `new Date(...).toISOString()` causa
shifts cuando la conversión pasa por local. La forma correcta es **no
tener zona horaria en absoluto**: date-only strings.

**Alternatives considered:**

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| A) `z.iso.date()` + helpers locales + read-through normalizer | Storage unambiguous, no TZ math, parseISO de date-fns lo acepta. | Hay que migrar filas existentes (T00:00:00.000Z → date-only). | **Elegida** |
| B) Mantener `z.iso.datetime()` + always local-tz al leer | Sin cambio de schema. | Propenso a errores (la misma trampa que R-4). | Rechazada |
| C) Cambiar a `z.iso.date()` sin normalizer | Storage nuevo, asumimos DB vacía. | Rompe a usuarios existentes; v1 backup incompat. | Rechazada |

**Implementation details:**

`src/lib/date/local.ts` (nuevo):
```ts
import { format, parseISO } from 'date-fns';

/** "YYYY-MM-DD" usando componentes LOCALES (no UTC). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Inverso: parsea "YYYY-MM-DD" como local-midnight (no UTC). */
export function fromLocalDateString(s: string): Date {
  // Validamos formato antes de split para evitar surprises.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) throw new Error(`Invalid local date string: ${s}`);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** Hoy como "YYYY-MM-DD" local. Reemplaza `new Date().toISOString().slice(0,10)`. */
export function todayLocalDateString(): string {
  return toLocalDateString(new Date());
}

/** Normaliza un valor ISO datetime o date a date-only "YYYY-MM-DD". Idempotente. */
export function normalizeToDateString(value: string): string {
  // Si ya es date-only, retorna igual.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Si es datetime, recortamos al prefijo.
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  // Si es otra cosa, intentamos parsear.
  const d = parseISO(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Cannot normalize to date: ${value}`);
  }
  return toLocalDateString(d);
}
```

`src/db/schemas/transaction.ts`:
```ts
const BaseTransaction = z.object({
  id: z.uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().min(1).max(120),
  date: z.iso.date(),  // antes: z.iso.datetime()
  category: z.string().optional(),
});

// MsiExpenseSchema:
msiStartDate: z.iso.date(),  // antes: z.iso.datetime()
```

`src/db/schemas/debt.ts`:
```ts
startDate: z.iso.date(),
endDate: z.iso.date().optional(),
```

`TransactionForm.tsx` — submit:
```ts
// antes:
// date: new Date(values.date).toISOString(),
// msiStartDate: new Date(values.msiStartDate).toISOString(),

// después:
date: values.date,                       // ya es "YYYY-MM-DD" del DateInput
msiStartDate: values.msiStartDate,       // idem
```

`DebtForm.tsx` — submit: análogo.

`DebtForm.tsx:264, 265` y `TransactionForm.tsx:400, 407` — defaults
edit: `toIsoDateString(new Date(tx.date))` ya devuelve "YYYY-MM-DD", sin cambio.
Pero **validar** que `tx.date` que viene de Dexie (legacy) sea date-only. Si
es datetime, el `fromLocalDateString` del Zod schema va a fallar al
validarse. Por eso el normalizer debe correr en **read** (en el repo o en
el store), no en write.

**Dexie upgrade path:**

Después de R-2 (v1→v2) seguimos con la fecha. La migración de fechas
necesita otra versión (v2 → v3) que normalice las cuatro tablas. Esto
suma complejidad, así que la decisión es: **read-through normalization** en
`useLiveTransactions` y `useLiveDebts` (y repo equivalente):

```ts
// src/hooks/useLiveTransactions.ts (o en transactionsRepo.toModel)
function normalizeTx(tx: Transaction): Transaction {
  return {
    ...tx,
    date: normalizeToDateString(tx.date),
    ...(tx.type === 'expense_msi'
      ? { msiStartDate: normalizeToDateString(tx.msiStartDate) }
      : {}),
  };
}
```

Esto es **idempotente**: si la fila ya es date-only, retorna igual.

**Display layer:** `formatDate("2026-06-04")` — `parseISO("2026-06-04")` de
date-fns devuelve un Date local-midnight, y `format(d, "d 'de' MMMM 'de'
yyyy")` produce `"4 de junio de 2026"`. Sin cambios.

**DateInput component contract:** ya emite `YYYY-MM-DD` (ver `toIsoDateString`).
**Sin cambios al componente.** Solo se renombra en la doc.

### AD-4: MSI plazo 1 mes integration

**Choice:** MSI_TERM = `[1, 3, 6, 9, 12, 18, 24]`. Color palette se vuelve
función. Grid 7-up. Validación schema sincronizada entre `transaction.ts`
y `TransactionForm.tsx`.

**Why:** El plazo 1 mes es un caso común ("a 1 pago, sin intereses"). El
cómputo del motor ya lo soporta (con `Math.floor` la cuota regular es el
monto total y la "última" absorbe el residue 0). El grid y la paleta de
colores, en cambio, hardcodeaban 6 elementos.

**Alternatives considered:**

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| A) MSI_TERM como array + función `getColorForTerm` + grid auto-fit | Sin acoplamiento entre largo del array y paleta. | Hay que extraer la función a `engine/msi.ts` o `lib/msi/palette.ts`. | **Elegida** |
| B) Hardcodear paleta para 7 entries | Cero abstracción. | Próximo plazo agregado (¿36m?) repite el bug. | Rechazada |
| C) No agregar plazo 1 | El usuario no lo pidió. | El usuario SÍ lo pidió (per explore R-5). | N/A |

**Implementation details:**

`src/db/schemas/transaction.ts`:
```ts
export const MSI_TERM = [1, 3, 6, 9, 12, 18, 24] as const;
export type MsiTerm = (typeof MSI_TERM)[number];
export const MsiMonths = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(6),
  z.literal(9),
  z.literal(12),
  z.literal(18),
  z.literal(24),
]);
```

`src/lib/msi/palette.ts` (nuevo):
```ts
const PALETTE = [
  'rgba(16, 185, 129, 0.85)',  // safe (1m y 3m usan tonos verdes)
  'rgba(132, 204, 22, 0.85)',
  'rgba(245, 158, 11, 0.85)',  // warning (9m)
  'rgba(249, 115, 22, 0.85)',
  'rgba(239, 68, 68, 0.85)',   // danger (18m)
  'rgba(220, 38, 38, 0.85)',
  'rgba(190, 18, 60, 0.85)',   // (24m)
] as const;

export function getColorForTerm(term: number): string {
  const idx = MSI_TERM.indexOf(term as MsiTerm);
  return idx === -1 ? 'rgba(100, 116, 139, 0.85)' : PALETTE[idx]!;
}
```

`MsiSelector.tsx:50`:
```tsx
className="grid grid-cols-3 sm:grid-cols-7 gap-2"
```

`TransactionForm.tsx:43-45` — duplicar la union (per la nota del explore:
el form tiene su propio Zod schema que debe estar sincronizado):
```ts
msiMonths: z
  .union([z.literal(1), z.literal(3), z.literal(6), z.literal(9),
         z.literal(12), z.literal(18), z.literal(24)])
  .optional(),
```

**Math para term=1:**
- `getMsiMonthlyAmount(1200, 1)`: `Math.floor(1200/1) = 1200`. ✓
- `getMsiInstallmentAmount(1200, 1, 1)`: base=1200, monthIndex===months → `1200 - 1200*0 = 1200`. ✓
- `computeMsiSchedule({...12 meses...}, today)`: 1 sola entry. ✓

### AD-5: Budget engine completeness

**Choice (R-7-A):** Corregir el off-by-one en `computeMonthlySpending` y
`computePaymentForCurrentMonth`. La nueva condición es
`monthsSinceStart < 0 || monthsSinceStart >= msiMonths`, y se pasa
`monthsSinceStart + 1` a `getMsiInstallmentAmount`.

**Why:** El gate actual `monthsSinceStart < 1` excluye la primera cuota
porque `monthsSinceStart` se calcula como `(year - startYear) * 12 + (month
- startMonth)`. Si MSI empezó este mes, `monthsSinceStart === 0`, y el gate
lo salta. Pero `getMsiInstallmentAmount` espera un `monthIndex` **1-based**,
así que hay que pasar `monthsSinceStart + 1`.

**Alternatives considered:**

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| A) Cambiar gate a `< 0 || >= msiMonths` + `+1` al call | Aritmética correcta, sin cambios al engine MSI. | Hay que tocar ambos sitios (MonthlySpending y PaymentForCurrentMonth). | **Elegida** |
| B) Cambiar gate a `< 0 || > msiMonths` + cambiar signatura de `getMsiInstallmentAmount` a 0-based | Consistencia interna del engine. | Cambia la API pública del engine; rompe el schedule 1-based. | Rechazada |
| C) Dejarlo y agregar un manual offset | Trabajo extra mensual. | No escala. | Rechazada |

**Implementation del cambio:**

`src/engine/budget.ts` (después):
```ts
if (tx.type === 'expense_msi') {
  const start = new Date(tx.msiStartDate);  // date-only "YYYY-MM-DD"
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth() + 1;
  const monthsSinceStart =
    (year - startYear) * 12 + (month - startMonth);
  if (monthsSinceStart < 0 || monthsSinceStart >= tx.msiMonths) continue;
  amount = getMsiInstallmentAmount(
    tx.amount,
    tx.msiMonths as MsiTenure,
    monthsSinceStart + 1,  // <-- FIX: monthIndex es 1-based.
  );
}
```

Idéntico en `computePaymentForCurrentMonth`.

**R-7-B (cash expense no mueve el widget):**
- Status: NO confirmado al nivel del engine. Tests existentes prueban
  que `paymentMethod === 'cash'` SÍ entra en `total`.
- Hipótesis más probable: bug R-1 infló `tx.amount` a 100×, empujando el
  widget al estado danger 200%+ desde el primer gasto real, y el usuario
  no notó cambio al agregar el segundo.
- Decisión: **no tocar** en este design. El `sdd-apply` hace verificación
  manual post-WU-A. Si R-7-B reaparece, escala a batch 3.

**Out of scope flagged:** `src/engine/debt.ts:37-39` tiene el mismo
off-by-one (no se cita en el explore, pero lo verificamos durante apply;
si está, fix en WU-D).

### AD-6: Rationale honesty in SmartShopper

**Choice:** Reescribir el rationale de `computeBestCardToUseToday` para
que reporte la realidad: días desde el último corte, fecha exacta del
próximo pago, días hasta el pago. Sin mentiras hardcoded.

**Why:** El rationale actual
`"Tu tarjeta X cortó hace poco, tenés hasta el día N para pagar (M días)"`
es **literalmente falso** — el texto no depende de `today`. La usuario
confía en él para tomar decisiones de compra. El nuevo modelo
`daysToPayAfterCut` da la información necesaria para ser honesto:
- `previousCutDate` = el último corte que ya pasó (antes de `today`).
- `nextPaymentDate` = `previousCutDate + daysToPayAfterCut días`.
- Mensaje refleja esos tres datos.

**Implementation:**

```ts
// src/engine/cycle.ts

function previousCutDate(card: Card, today: Date): Date {
  // Iteramos hasta 3 meses hacia atrás para encontrar el último cutDay que ya pasó.
  // (Si el ciclo es > 90 días esto podría fallar, pero daysToPayAfterCut <= 62
  // garantiza que el último cut está dentro de los últimos 2 meses).
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  const d = today.getUTCDate();
  for (let offset = 0; offset <= 2; offset += 1) {
    const candidate = addMonths(y, m, -offset);
    const clamped = clampDay(card.cutDay, candidate.year, candidate.month);
    const dt = utcDate(candidate.year, candidate.month, clamped);
    if (dt.getTime() < today.getTime()) return dt;
  }
  // Fallback improbable: usamos el primer día del mes actual.
  return utcDate(y, m, 1);
}

export function computeBestCardToUseToday(
  cards: Card[],
  today: Date,
): BestCardResult | null {
  if (cards.length === 0) return null;

  let best: { card: Card; cycle: number; priority: number } | null = null;
  for (const card of cards) {
    const cycle = computeCutCycle(card, today);
    const priority = card.priority;
    if (
      best === null ||
      cycle.cycleLengthDays > best.cycle ||
      (cycle.cycleLengthDays === best.cycle && priority > best.priority)
    ) {
      best = { card, cycle: cycle.cycleLengthDays, priority };
    }
  }

  if (!best) return null;

  const previous = previousCutDate(best.card, today);
  const daysSinceLastCut = Math.round((today.getTime() - previous.getTime()) / 86_400_000);
  const nextPayment = new Date(previous);
  nextPayment.setUTCDate(nextPayment.getUTCDate() + best.card.daysToPayAfterCut);
  const daysUntilPayment = Math.round((nextPayment.getTime() - today.getTime()) / 86_400_000);
  const daysLabel = daysSinceLastCut === 1 ? 'día' : 'días';
  const formattedPayment = format(nextPayment, "d 'de' MMMM", { locale: es });
  const rationale =
    `Tu tarjeta ${best.card.bank} cortó hace ${daysSinceLastCut} ${daysLabel}. ` +
    `Tu próximo pago es el ${formattedPayment}. ` +
    `Tenés ${daysUntilPayment} días para pagar.`;

  return {
    card: best.card,
    cycleLengthDays: best.cycle,
    rationale,
  };
}
```

`findUpcomingConvenientCut` — el cambio en el modelo no le afecta: sigue
usando `daysUntilCut` que ya estaba bien. Sin cambios necesarios.

`SmartShopper.tsx:101` — el `•••• {card.last4}` se reemplaza por nada
(per R-2: ya no tenemos `last4`).

## Test strategy

Para cada work unit (resumen; los detalles viven en `sdd-tasks`):

### WU-A — Money fix (bugs 1, 6)
- **Unit tests ADD**:
  - `src/features/transactions/TransactionForm.test.tsx` (nuevo):
    - describe "amount wiring":
      - "writes cents directly when user enters $200" (submit, mock onSubmit,
        assert `output.amount === 20000`).
      - "round-trips cents on edit" (seed Dexie con `tx.amount = 5000`,
        abrir form, submitir sin cambios, assert `output.amount === 5000`).
    - describe "MSI preview":
      - "preview shows $100.00/mes for $1200 a 12 meses" (render
        TransactionForm con `amount=120000`, msiMonths=12, assert text).
- **Tests MODIFY**:
  - `src/components/form/MsiSelector.test.tsx`:
    - Línea 36-39: `expect(screen.getByText(/100\.00\/mes/))` se mantiene
      semánticamente (el bug estaba produciendo el MISMO texto malformado
      pero por otras razones). Añadir un caso explícito:
      `"displays correct monthly for non-divisible amount"` con
      `totalCents=100000` plazo 3 → expect text contiene `333.33/mes`.
  - `src/engine/__tests__/msi.test.ts`:
    - Tests de `getMsiMonthlyAmount`, `getMsiInstallmentAmount`,
      `computeMsiSchedule`: ahora la firma toma/retorna cents.
    - `expect(getMsiMonthlyAmount(1000, 3)).toBe(333.33)` →
      `expect(getMsiMonthlyAmount(100000, 3)).toBe(33333)`.
    - Invariante Σ: tests parametrizados con cents.
    - `computeMsiSchedule` `.amount` ahora en cents: `{year, month, amount: 33333}`.

### WU-B — Cycle schema migration (bugs 2, 3)
- **Unit tests ADD/MODIFY**:
  - `src/engine/__tests__/cycle.test.ts`:
    - `makeCard` factory: remover `paymentDueDay` y `last4`; añadir
      `daysToPayAfterCut`.
    - Cada test: usar `daysToPayAfterCut` en lugar de `paymentDueDay`.
    - Test nuevo: "Tarjeta P (cut=22, daysToPayAfterCut=30) → cycleLength=30
      días, paymentDate = previousCut + 30d".
    - Test nuevo: "cycleLengthDays === daysToPayAfterCut (constante)".
    - `computeBestCardToUseToday` tests: assert nuevo rationale
      contiene `"cortó hace"` y `"próximo pago es el"` y `"días para pagar"`.
- **Migration tests ADD**:
  - `src/db/__tests__/migration.v2.test.ts` (nuevo, fake-indexeddb):
    - "v1 con Tarjeta P (cutDay=22, paymentDueDay=22) migra a v2
      con daysToPayAfterCut=30 y sin paymentDueDay ni last4".
    - "v1 con Tarjeta S (cutDay=13, paymentDueDay=3) migra a v2
      con daysToPayAfterCut=20".
    - "v1 con Tarjeta M (cutDay=27, paymentDueDay=7) migra a v2
      con daysToPayAfterCut=10".
    - "cards sin paymentDueDay (edge case futuro) no se tocan".
- **Snapshot tests UPDATE**:
  - Si existe snapshot de `CardListItem`, `DeleteCardConfirm`, etc.,
    regenerar sin el `****` suffix.
- **Tests ADD para backup**:
  - `src/lib/backup/schema.test.ts` (nuevo o actualizar):
    - "BACKUP_VERSION es 2".
    - "v1 payload es rechazado" (validar que `version < 2` falla el parse).

### WU-C — Timezone-safe dates (bug 4)
- **Unit tests ADD**:
  - `src/lib/date/local.test.ts` (nuevo):
    - `toLocalDateString(new Date(2026, 5, 4))` → `"2026-06-04"`.
    - `fromLocalDateString("2026-06-04")` → `new Date(2026, 5, 4)`.
    - `todayLocalDateString()` formato `YYYY-MM-DD`.
    - `normalizeToDateString("2026-06-04")` → `"2026-06-04"` (idempotente).
    - `normalizeToDateString("2026-06-04T00:00:00.000Z")` → `"2026-06-04"`.
    - `normalizeToDateString("2026-06-04T15:30:00.000Z")` → `"2026-06-04"`
      (recorta prefijo).
- **Round-trip regression test**:
  - `TransactionForm.test.tsx` (extender): submit fecha `2026-06-04`, leer
    de Dexie, assert `tx.date === "2026-06-04"`.
- **Tests MODIFY**:
  - `engine/__tests__/budget.test.ts`, `msi.test.ts`: cambiar fechas a
    `"2026-06-04"` (date-only) en seeds. `new Date("2026-06-04")` en JS
    devuelve UTC-midnight, lo que es OK para los assertions (que usan
    `getUTCMonth`). Validar que el cambio de contrato no rompe tests
    existentes.
- **Migration integration test (opcional)**: si decidimos Dexie v2→v3
  migration, agregar test con fake-indexeddb que siembra v2 con datetime
  rows y verifica que se transforman a date-only. Si decidimos
  read-through normalization, agregar test del `useLiveTransactions` con
  payload mixto.

### WU-D — MSI plazo 1m + budget gate (bugs 5, 7)
- **Unit tests ADD/MODIFY**:
  - `src/engine/__tests__/msi.test.ts`:
    - `getMsiMonthlyAmount(1200, 1) === 1200`.
    - `getMsiInstallmentAmount(1200, 1, 1) === 1200`.
    - `getMsiInstallmentAmount(1200, 1, 2) === 0` (fuera de rango).
    - `computeMsiSchedule({...1200, 1, msiStartDate:"2026-05-15"...}, today)`
      tiene 1 sola entry `{year: 2026, month: 6, amount: 1200}`.
    - `MsiMonths` Zod schema acepta `1`.
- **Tests MODIFY**:
  - `src/components/form/MsiSelector.test.tsx`:
    - Línea 7-15: `radios.length === 7`, contiene "1".
    - Caso para `totalCents=120000` plazo 1 → `$1200.00/mes`.
- **Tests MODIFY (budget gate)**:
  - `src/engine/__tests__/budget.test.ts`:
    - "MSI con msiStartDate = hoy cuenta la cuota 1 en el mes actual":
      tx con `msiStartDate = "2026-06-04"`, hoy = `2026-06-04`,
      `computeMonthlySpending` total incluye 1/3 del monto.
    - "MSI del mes anterior a este mes cuenta la cuota 2":
      tx con `msiStartDate = "2026-05-04"`, hoy = `2026-06-04`,
      `computeMonthlySpending` total incluye 2/12.
    - "MSI que ya terminó (mes > msiMonths) no se cuenta".
- **Tests ADD (palette function)**:
  - `src/lib/msi/palette.test.ts` (nuevo): `getColorForTerm(1) !== undefined`,
    `getColorForTerm(99)` (no en MSI_TERM) → fallback color.

## Implementation plan (4 work units, stacked-to-main)

### WU-A — Money fix (bugs 1, 6)
**Files (con line ranges + before/after):**

1. `src/engine/msi.ts`:
   - `getMsiMonthlyAmount(amount, months)` (línea 41-47): cambiar firma a
     cents, return cents. `Math.floor(amountCents / months)`.
   - `getMsiInstallmentAmount` (línea 58-73): análogo.
   - `computeMsiSchedule` (línea 85-111): comentario JSDoc actualizado
     para aclarar que `.amount` está en cents.

2. `src/features/transactions/TransactionForm.tsx`:
   - Línea 213: `setValue("amount", displayToCents(cents) / 100, ...)` →
     `setValue("amount", cents, { shouldDirty: true })`.
   - Línea 153-156: `getMsiMonthlyAmount(centsToDisplay(amountCents), m)` →
     `getMsiMonthlyAmount(amountCents, m)`.
   - Línea 338: `formatCurrency(monthlyPreview * 100, currency)` →
     `formatCurrency(monthlyPreview, currency)`.

3. `src/components/form/MsiSelector.tsx`:
   - Línea 33-40: `getMsiMonthlyAmount(centsToDisplay(totalCents), term)` →
     `getMsiMonthlyAmount(totalCents, term)`. Renombrar `monthly` → `monthlyCents`.
   - Línea 84: `formatCurrency(monthly * 100, currency)` →
     `formatCurrency(monthlyCents, currency)`.

4. `src/pages/Transactions.tsx` (línea 81): `amount: centsToDisplay(values.amount)` →
   `amount: values.amount` (con comment explicando que ahora son cents).

5. `src/features/widgets/MsiSummary.tsx`:
   - Línea 82: ya usa `centsToDisplay(summary[t].totalDebt)` — sin cambio.
   - Línea 107: `formatCurrency(Math.round(value * 100), currency)` →
     `formatCurrency(value, currency)` (value ya es cents post-cambio).

**Estimated diff:** ~120 lines modified across 5 files.
**Tests added/modified:** ~8 (TransactionForm 3, MsiSelector 1, msi.test 4).
**PR title:** `fix(money): correct cents contract across form, engine, and widgets`
**PR body:** "Bug 1 + 6. Money is now cents everywhere (per ADR-03). All
existing tests updated to the new contract."

### WU-B — Cycle schema migration (bugs 2, 3)
**Files:**

1. `src/db/schemas/card.ts` — reemplazar `paymentDueDay` por
   `daysToPayAfterCut`; eliminar `last4`.

2. `src/db/database.ts` — agregar `this.version(2).stores(...).upgrade(async
   (tx) => { await tx.table('cards').toCollection().modify(...) })`.

3. `src/engine/cycle.ts` — reescribir `computeCutCycle` con el nuevo modelo
   (AD-2). Reescribir `computeBestCardToUseToday` rationale (AD-6).
   Eliminar usos de `paymentDueDay` y `last4`.

4. `src/db/schemas/index.ts` — sin cambios (re-export sigue).

5. `src/db/schemas/settings.ts` — sin cambios (no toca).

6. `src/features/cards/CardForm.tsx` — reemplazar `paymentDueDay` por
   `daysToPayAfterCut` (label, input, schema, submit, defaultsFor,
   cardToFormValues). Eliminar línea 103 `last4: card?.last4 ?? ""`.

7. `src/features/cards/CardListItem.tsx` — línea 78 eliminar `**** {card.last4}`;
   línea 87 `"Corte día X · Pago día Y"` → `"Corte día X · Paga N días después"`.

8. `src/features/cards/DeleteCardConfirm.tsx` — línea 46 eliminar `**** ${card.last4}`.

9. `src/components/form/CardSelect.tsx` — línea 35 cambiar
   ``${c.bank} •••• ${c.last4}`` → ``${c.bank}``.

10. `src/features/widgets/SmartShopper.tsx` — línea 101 eliminar `•••• {card.last4}`.

11. `src/features/widgets/PaymentCalendar.tsx` — línea 85 eliminar `•••• {row.original.card.last4}`.

12. `src/features/transactions/TransactionsTable.tsx` — línea 201
    `${card.bank} •••• ${card.last4}` → `${card.bank}`.

13. `src/lib/backup/schema.ts` — `BACKUP_VERSION = 2`; el cambio de shape
    de CardSchema fluye automáticamente al re-exportar.

**Estimated diff:** ~250 lines modified across 13 files (incluye migration hook).
**Tests added/modified:** ~12 (cycle.test reescrito, migration.test nuevo,
backup.test nuevo, regression tests de cada consumer).
**PR title:** `feat(cards): migrate to daysToPayAfterCut and remove last4 residue`
**PR body:** "Bug 2 + 3. Dexie v1→v2 with backfill. Backup schema bumped to
v2. Old exports are rejected (user was warned)."

### WU-C — Timezone-safe dates (bug 4)
**Files:**

1. `src/lib/date/local.ts` (nuevo) — implementar `toLocalDateString`,
   `fromLocalDateString`, `todayLocalDateString`, `normalizeToDateString`.

2. `src/db/schemas/transaction.ts` — `z.iso.datetime()` → `z.iso.date()` para
   `BaseTransaction.date` y `MsiExpenseSchema.msiStartDate`.

3. `src/db/schemas/debt.ts` — idem para `startDate` y `endDate`.

4. `src/features/transactions/TransactionForm.tsx` — líneas 167, 174: eliminar
   `new Date(...).toISOString()`. Pasar `values.date` y `values.msiStartDate`
   directo. Líneas 400, 407 — `toIsoDateString(new Date(tx.date))` ya devuelve
   date-only, sin cambio, **pero** si `tx.date` es legacy datetime, el
   Zod parse va a fallar en el read.

5. `src/features/debts/DebtForm.tsx` — líneas 104, 114: idem.

6. `src/db/repositories/transactions.ts` (o `useLiveTransactions.ts`) —
   agregar `normalizeToDateString` read-through.

7. `src/db/repositories/debts.ts` (o `useLiveDebts.ts`) — idem.

8. `src/lib/backup/schema.ts` — sin cambios de versión (solo cambia el
   shape de los date fields; si la v2 ya está en producción, esto es v2.1
   o sin bump porque las dates date-only son **más restrictivas** que
   datetime). Decisión: **no bump**; el Zod parse rechazará filas legacy
   en import → mitigation: read-through normalizer en `importBackup` que
   aplica `normalizeToDateString` antes del Zod parse.

**Estimated diff:** ~150 lines modified across 6-7 files + 1 new.
**Tests added/modified:** ~6 (local.test nuevo, TransactionForm 1,
budget/msi seeds).
**PR title:** `fix(date): store dates as date-only to avoid UTC offset bug`
**PR body:** "Bug 4. Zod schema + helpers + read-through normalizer. Display
layer is unaffected (parseISO accepts both)."

### WU-D — MSI plazo 1m + budget gate (bugs 5, 7)
**Files:**

1. `src/db/schemas/transaction.ts` — `MSI_TERM` (línea 9): agregar `1` al
   array. `MsiMonths` Zod union agregar `z.literal(1)`.

2. `src/features/transactions/TransactionForm.tsx` — línea 43-45: replicar
   la union con `z.literal(1)`.

3. `src/components/form/MsiSelector.tsx` — línea 50: `grid-cols-3 sm:grid-cols-7`.

4. `src/lib/msi/palette.ts` (nuevo) — `getColorForTerm` función.

5. `src/features/widgets/MsiSummary.tsx` — línea 78: usar `getColorForTerm`
   en lugar del array hardcoded. Línea 83-90 array literal →
   `MSI_TERM.map(t => getColorForTerm(t))`.

6. `src/engine/budget.ts` — líneas 47-54, 112-120: cambiar el gate
   `monthsSinceStart < 1 || > msiMonths` → `< 0 || >= msiMonths`, y
   `monthsSinceStart` → `monthsSinceStart + 1` en el call.

7. `src/engine/debt.ts` — línea 37-39: verificar el mismo off-by-one;
   si está presente, aplicar el mismo fix (es seguro hacerlo en este WU
   porque es la misma clase de bug, mismo risk profile).

**Estimated diff:** ~80 lines modified across 7 files + 1 new.
**Tests added/modified:** ~7 (MsiSelector 1, msi 4, budget 2).
**PR title:** `feat(msi): add 1-month plazo and fix budget MSI first-month gate`
**PR body:** "Bug 5 + 7-A. 7 plazos disponibles. Budget MSI gate ahora
incluye la primera cuota. Bug 7-B verificado manualmente en apply."

## Risks & mitigations

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Dexie v1→v2 destructivo: Tarjeta P backfill a 30 (asumido, no real). | Media | El usuario revisa manualmente después. Si está mal, edita la tarjeta. Backfill documentado en PR body. |
| Backup v1 incompatible con v2. | Baja | Probablemente el usuario no tiene v1 exportado (decisión per explore). Si lo tiene, se rechaza con mensaje claro. |
| Engine signature change (cents) rompe consumers externos del módulo. | Media | Solo consumers internos (`MsiSelector`, `MsiSummary`, `TransactionForm`, `engine/debt`, tests). Audit completo pre-merge. |
| Read-through date normalizer no cubre paths que usan repos directamente. | Baja | `useLive*` hooks son la única vía de lectura en la UI. Si alguien importa `db.cards.toArray()` directamente, debe normalizar. Documentar. |
| `getMsiMonthlyAmount` signature change rompe tests externos (e2e futuros). | Baja | No hay e2e hoy. Si llegan, se documenta la convención cents. |
| Bug 7-B reaparece tras R-1 fix. | Media | Manual verification en `sdd-apply` post-WU-A. Escalación a batch 3 si persiste. |
| El form ya tiene un `displayToCents` mal usado; otros sitios pueden tener la misma trampa. | Baja | Audit completo de llamadas a `displayToCents` / `centsToDisplay` antes de merge. |
| `DateInput` ya emite date-only, pero Zod schema viejo no validaba. Con `z.iso.date()`, rompe si el componente cambia. | Baja | Test contract explícito: `DateInput` solo emite `"YYYY-MM-DD"`. |
| En AD-6, `previousCutDate` itera hasta 3 meses. Si `daysToPayAfterCut > 90` (futuro), falla. | Baja | Schema limita a 62. Si el límite sube, ajustar el offset. |

## Rollback plan

**WU-A:** Single revert commit. No hay cambio de schema ni migration. Riesgo: tests que dependen del contrato nuevo se rompen hasta que se reverte también.

**WU-B:** Migración Dexie v1→v2. Revert simple NO restaura el shape previo
porque las filas ya están mutadas (`daysToPayAfterCut` en vez de
`paymentDueDay`). Plan:
- Si se descubre en < 24h post-merge: revert + Dexie downgrade explícito
  (escribir `this.version(3)` con `.upgrade(tx => tx.table('cards').toCollection().modify(c => { c.paymentDueDay = c.daysToPayAfterCut + c.cutDay; c.last4 = ''; delete c.daysToPayAfterCut; }))`).
- Si se descubre > 24h: contactar usuario, decidir si degradar o aguantar.
- **Mitigation principal:** test exhaustivo de migración con
  `fake-indexeddb` antes de merge. Los 3 tests del user cards son la
  red de seguridad.

**WU-C:** El read-through normalizer es **idempotente** (`normalizeToDateString`
sobre date-only retorna igual). Si revertimos el commit, los datos en DB
siguen siendo date-only (lo nuevo es válido) y los helpers `local.ts` se
dejan de usar. La app vuelve a usar `z.iso.datetime()` y los datos
date-only **fallan el parse**. Por eso el rollback NO es trivial.
- Plan: feature flag `USE_DATE_ONLY` en `zod` schema. Si se baja el flag,
  el schema vuelve a `z.iso.datetime()` y un transform previo convierte
  date-only → datetime. **Implementar el feature flag es opcional;**
  documentar en el PR que rollback requiere data fixup.

**WU-D:** Single revert commit. Cambia solo lógica del form + engine +
UI. Sin migración de datos.

## Out of scope (explicit)

- **Bug 7-B** verification: ocurre en `sdd-apply` post-WU-A. Si
  reaparece, batch 3.
- **Debt cycle engine** (`src/engine/debt.ts:37-39`): mismo off-by-one
  potencial que el budget MSI gate. Si está, fix en WU-D; sino, flag
  para batch 3.
- **Backup schema major bump** beyond 1→2: no se hace v2→v3 por el
  cambio de dates (es read-through, no destructive). Si en el futuro se
  hace destructive (ej. cambiar `amount` a Money type), bump apropiado.
- **Wider engine refactor** to accept Money type object: fuera de scope;
  es lo que ADR-03 previene con cents enteros.
- **i18n** del rationale: queda en español neutro (decisión de producto).
- **Fix `pages/Transactions.tsx:81` para nuevos métodos de pago (transfer, debit):**
  WU-A resuelve el wiring del amount. Otros aspectos del submit quedan
  intactos.

## skill_resolution

`paths-injected` — Recibí paths exactos de typescript, zod-4, react-19,
test-driven-development, ultimate-frontend-craft, security-best-practices
del orchestrator. Los leí y apliqué:
- typescript: const-types en `MSI_TERM`, `BACKUP_VERSION`, `STATUS_COLOR`,
  `PAGE_SIZE_OPTIONS`.
- zod-4: `z.iso.date()` y `z.iso.datetime()` top-level (Zod 4); uso de
  `error` param en refinements.
- react-19: sin `useMemo`/`useCallback` manuales (compiler los maneja);
  no `forwardRef` (no se necesita acá); named imports.
- test-driven-development: cada test listado en "Test strategy" arriba
  sigue Iron Law (failing test first, watch it fail, minimal code, watch
  it pass, refactor).
- ultimate-frontend-craft: rationale honesto, no "cortó hace poco"
  hardcoded lie.
- security-best-practices: sin secretos en código; validación Zod en
  bordes de I/O (Dexie, backup import).
