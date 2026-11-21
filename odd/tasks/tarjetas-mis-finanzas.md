# Tarjetas · Mis finanzas (`tarjetas-mis-finanzas`)

Objetivo: rehacer la pantalla **Tarjetas** de control-ingresos para que responda, en orden: "¿Cuál es mi próximo pago? ¿Cuánto crédito me queda entre todas mis tarjetas? ¿Qué compras explican ese importe?", tomando `Tarjetas-autonoma.html` como referencia ejecutable y `DESIGN-RULES` como especificación visual, **conservando el diseño del Dashboard**.
Branch: `feat/redesign-ui-2026` · Delivery: `ask-on-risk` (una sola branch) · Test runner: `npm run test` (Vitest 3 + Testing Library), luego `npm run typecheck`, `npm run lint`, `npm run build`.

## Specs

- **S1** — "Implementa la página Tarjetas de Mis finanzas". Criterio: la pantalla existe, funciona con datos reales de Dexie y responde las tres preguntas del encabezado.
- **S2** — "Usa `Tarjetas-autonoma.html` como referencia ejecutable y `DESIGN-RULES` como especificación visual. En el HTML, busca `<template id="vista-tarjetas">` para ver la estructura." Criterio: estructura, textos y métricas de la referencia; `DESIGN-RULES` manda en medidas y color.
- **S3** — "Conserva el diseño del Dashboard." Criterio: no se toca la pantalla de Inicio ni sus tokens.
- **S4** — "Identifica el modelo que ya carga tarjetas, movimientos y pagos fijos. Usa el identificador estable de la tarjeta para relacionar esos registros, incluso cuando cambie su nombre." Criterio: se reutiliza el modelo existente; la relación es por `card.id`, nunca por nombre.
- **S5** — "Cada tarjeta tiene nombre, titular, límite en centavos de MXN, día de corte, plazo de pago en días, prioridad, acabado visual y estado de archivo. Obtén las tarjetas activas en orden de prioridad. La primera aparece seleccionada al abrir la cartera por primera vez." Criterio: los ocho atributos existen en el modelo; `archivada` se puede alternar; la selección persiste y cae en la primera activa si la seleccionada ya no está.
- **S6** — "La demo tiene fecha de referencia 20 de noviembre de 2026. Usa esa fecha para calcular 'Hoy', 'Mañana', el ciclo y las cuotas restantes. Muestra la fecha de los datos al pie. Calcula todas las cifras antes de formatearlas con dos decimales en español de México." Criterio: cálculos en enteros (centavos) y formateo sólo en el borde.
- **S7** — "En una integración, reutiliza las funciones equivalentes del proyecto." Criterio: se reutiliza `src/engine/**`; nada de reglas duplicadas.
- **S8** — Orden de la vista: (1) encabezado con "Tarjetas", botón "Nueva tarjeta" y enlace a "Ajustes"; (2) alerta de vencimiento en cápsula ámbar; (3) resumen de crédito "Crédito disponible estimado" con botón de información; (4) "Mi cartera" con selector de tarjetas, plástico, disponible, barra de uso, corte, próximo pago y menú; (5) "Próximos pagos"; (6) "Compras a meses"; (7) pie con moneda, fecha de los datos y tarjetas archivadas.
- **S9** — "Usa la columna de 390 px de ancho máximo, 16 px de margen lateral interior y 14 px entre bloques. El panel de contenido tiene 24 px de radio y relleno de 10 px arriba, 20 px a cada lado y 20 px abajo. La alerta tiene 52 px de altura mínima y radio de 999 px." Criterio: medidas de `DESIGN-RULES` §1 y §4.
- **S10** — Acabados: "plata con acento cobre a PLATA, azul a Mercado Pago, verde oscuro a Stori y marino como opción para nuevas tarjetas." Criterio: el acabado es un atributo de la tarjeta, editable, con los cuatro valores de `DESIGN-RULES` §6.
- **S11** — "Al elegir un nombre, actualiza el plástico, el disponible individual, el porcentaje y ambas fechas. El resumen superior y las dos listas inferiores siguen representando toda la cartera. Marca el botón elegido con `aria-pressed="true"`." Criterio: la selección cambia sólo el plástico; los totales no.
- **S12** — "Admite toque y teclado, incluidas flechas laterales, Inicio y Fin en el selector. En pantalla táctil, un gesto horizontal sobre el plástico puede cambiar de tarjeta. Conserva el desplazamiento vertical al arrastrar hacia arriba o abajo." Criterio: teclado completo y swipe horizontal sin bloquear el scroll vertical.
- **S13** — Destinos: "Más del encabezado" → formulario "Nueva tarjeta" con nombre, titular, límite, corte, plazo de pago y acabado, que guarda, selecciona y recalcula; "Información del resumen" → hoja "Cómo se estima el crédito" con botón "Entendido"; "Tocar el plástico" → ficha con pestañas "Resumen", "Movimientos" y "MSI"; "Alerta o fila de pago" → detalle del vencimiento con importe, fecha, corte y desglose por grupos (MSI, compras de un solo pago, pagos fijos previstos) mostrando sólo grupos con cargos y "Ver tarjeta"; "Tres puntos" → menú con "Ver detalle", "Editar tarjeta", "Cambiar prioridad" y "Quitar de mi cartera" (con confirmación; archiva y conserva movimientos y reglas; restaurar la devuelve al final); "Reordenar" → lista con asa, botones de subir/bajar, "Guardar orden" y "Cancelar"; "Ver las N" → pantalla "Compras a meses" del mes del respaldo con filtros de plazo.
- **S14** — "Para los destinos con URL, conserva el mes y el identificador de cada entidad." Criterio: la URL lleva mes e id; recargar un enlace profundo reabre el contexto correcto.
- **S15** — "Al cerrar una hoja, devuelve el foco al control de origen cuando siga visible." Criterio: foco devuelto al cerrar.
- **S16** — Cálculos (§5 del encargo), textuales: "Crédito usado por tarjeta…", "Disponible por tarjeta… máximo(0, límite − usado)…", "Ciclo y vencimiento… El día del corte es el primer día del plazo. El vencimiento es el corte más el plazo menos un día…", "Pago previsto…", "Redondeo… Trabaja en centavos enteros…". Criterio: las cinco reglas se reproducen y quedan documentadas en el motor.
- **S17** — Estados: cartera vacía → totales en cero, "Aún no tienes tarjetas registradas" y "Agregar tarjeta"; listas sin registros → "Sin pagos previstos" / "Sin compras a meses activas"; error de lectura → "Reintentar"; en edición se indica el campo con error y se conservan los valores escritos.
- **S18** — Validación: "nombre único, límite de $0.01 a $999,999,999.99, corte entre 1 y 31, y plazo de pago entre 1 y 90 días."
- **S19** — Pruebas de aceptación (respaldo inicial): "3 tarjetas activas, $52,071.34 disponibles, $39,228.66 usados, límite de $91,300.00 y 43 % de uso"; "El disponible individual cambia de $22,292.18 a $17,779.16. La cifra conjunta sigue en $52,071.34"; "PLATA aparece primero con $458.26 el 22 de noviembre, Stori después con $5,768.00 el 5 de diciembre y Mercado Pago con $10,230.32 el 8 de diciembre"; "Hay ocho activas. La primera es 'Galaxy S26 Papá', con $14,101.04 y 19 cuotas por cubrir. Al filtrar a 12 meses aparecen dos compras"; "Prueba el plazo de 16 meses"; "Usar teclado y pantalla pequeña… A 320 y 387 px, el importe y el último control se pueden consultar y la página conserva el desplazamiento vertical."
- **S20** — Alcance: sólo la pantalla Tarjetas y sus destinos. No se toca Inicio, Movimientos (salvo el filtro de tarjeta por URL), ni el modelo de datos de transacciones; los cambios de esquema son los campos de tarjeta que el encargo exige.

## Contrato

Fuente: `Tarjetas-autonoma.html` (líneas como `T:<n>`) + `DESIGN-RULES`. Cantidades en **centavos enteros MXN**; formateo sólo en el borde.

### C1 · Referencia y convención de ciclo

- Referencia: `asOf = 2026-11-20`, mes del respaldo `2026-11`.
- **Convención de la app (no cambia)**: `due = cut + daysToPayAfterCut`; el día siguiente al corte es el día 1. Ya la usa `src/engine/cycle.ts` (`computeActivePaymentDate`) y Inicio.
- La referencia usa la convención inclusiva (`due = cut + days − 1`). **Se traduce en el seed**: el dato `days` de la demo se guarda como `days − 1` (PLATA 32→31, Mercado Pago 12→11, Stori 23→22) y así se reproduce su calendario exacto con **una sola convención en la app**.
- Corte del **próximo** pago (regla `T:1818-1823`): `m = month(ref − days)`; `cut = min(cutDay, último día de m)`; `due = cut + days`; si `due < ref` → `m = m + 1 mes` y se recalcula. Con la semilla: PLATA cut 2026-10-22 / due 2026-11-22 (2 días); Stori cut 2026-11-13 / due 2026-12-05 (15 días); Mercado Pago cut 2026-11-27 / due 2026-12-08 (18 días).
- Ciclo en curso (ficha): `cut = corte del mes de ref` (o del mes siguiente si `ref > cut`); `start = corte del mes anterior + 1 día`; `due = cut + days`. "Corte" y "Próximo pago" pueden ser de ciclos distintos.

### C2 · Crédito usado, disponible, resumen

- MSI pendiente: por plan, cuotas con mes ≥ mes de la referencia (los meses anteriores se consideran cubiertos); sin cuotas restantes, el plan se descarta. `remaining = Σ cuotas`.
- Compras de un solo pago ya realizadas con vencimiento ≥ referencia. El vencimiento **se calcula** con el ciclo de la tarjeta: `closing(card, compra) = corte del mes de la compra, o el del mes siguiente si la compra es posterior al corte`; `due = closing + days`. (La referencia guarda además una fecha explícita por compra; la app no tiene ese campo y su cálculo da las mismas fechas para la semilla — ninguna compra de un solo pago alcanza la referencia, luego no altera ninguna cifra de aceptación.)
- `used = Σ MSI pendientes + Σ compras de un solo pago`; los **pagos fijos no cuentan como crédito usado**.
- `available = max(0, límite − used)`; `pct = límite ? round(used/límite×100) : 0`.
- Cartera: `limit = Σ límites`; `used = Σ used`; **`available = Σ available individuales`** (no `limit − used`); `percent = limit ? round(100×used/limit) : 0`. La barra se pinta con `min(100, percent)%`; el texto muestra el porcentaje real.

### C3 · Pago previsto por tarjeta

- Ventana del estado de cuenta: `start = corte del mes anterior + 1 día`, `cut = corte`; mes del vencimiento = mes de `due`.
- Grupos (sólo los que tengan cargos): (1) **Compras a meses**: cuotas de los planes de esa tarjeta cuyo mes = mes del vencimiento → "Cuota N de T"; (2) **Compras de un solo pago**: compras de esa tarjeta con fecha en `[start, cut]`; (3) **Pagos fijos previstos**: reglas fijas de esa tarjeta en la ventana, con periodicidad mensual desde su inicio.
- **Dedup**: un cargo fijo ya registrado como compra (misma tarjeta, fecha, importe y descripción normalizada) cuenta **una sola vez**.
- `total = Σ fijos + Σ cuotas + Σ compras`.

### C4 · Redondeo MSI

- Calendario: `base = floor(cents / term)`, `residuo = cents % term`; el día de la primera cuota (`msiStartDate`) se repite cada mes, ajustado al último día del mes.
- Reglas: `first` (respaldos importados) → el residuo entero va a la **primera** cuota; `spread` (planes nuevos) → 1 centavo extra a cada una de las primeras `residuo` cuotas; `last` (regla histórica de la app) → el residuo va a la **última** cuota.
- Invariante `Σ cuotas === importe`. La app usa hoy `last`; los respaldos importados usan `first`; los planes nuevos usan `spread`. El atributo viaja con la transacción (`msiPlanRule`) y el exportador de respaldos lo conserva.

### C5 · Semilla de demostración

Tarjetas (todas de crédito, titular "Bryan Nuñez", acabado por nombre):

| nombre | límite ¢ | corte | plazo (demo → app) | prioridad | acabado (fondo / borde / marca / texto) |
|---|---|---|---|---|---|
| PLATA | 2 550 000 | 22 | 32 → 31 | 0 | `#dce3e9` / `#c3cfd5` / `#98421f` / `#283944` |
| Mercado Pago | 5 380 000 | 27 | 12 → 11 | 1 | `#8bcfe7` / `#79bad6` / `#0b3558` / `#112e48` |
| Stori | 1 200 000 | 13 | 23 → 22 | 2 | `#184d46` / `#26635a` / `#d1f6cc` / `#eefcf2` |

Acabado por defecto de tarjetas nuevas: marino `#233c63` / `#3c547b` / `#e5eeff` / `#eff4ff`.

Planes MSI (11; todos con regla `first`; `date` = compra, `msiStartDate` = mes de la primera cuota):

| descripción | tarjeta | ¢ | compra | plazo | primera cuota |
|---|---|---|---|---|---|
| Compras atrasadas | MP | 672 195 | 2025-04-28 | 15 | 2025-05-27 |
| Compras Atrasadas | MP | 695 880 | 2025-05-10 | 15 | 2025-05-27 |
| Compras Atrasadas | MP | 911 265 | 2026-01-28 | 15 | 2026-02-27 |
| Monitor Sansung | PLATA | 164 999 | 2026-05-22 | 12 | 2026-06-22 |
| Silla | PLATA | 384 924 | 2026-05-23 | 12 | 2026-06-22 |
| Galaxy S26 Papá | MP | 1 781 193 | 2026-05-28 | 24 | 2026-06-27 |
| Definidor de Rizos | MP | 198 130 | 2026-05-28 | 10 | 2026-06-27 |
| Base de Silla | MP | 80 548 | 2026-05-28 | 4 | 2026-06-27 |
| iPad 11 Pulgadas | MP | 739 368 | 2026-06-29 | 18 | 2026-07-27 |
| iPad Air | MP | 1 372 224 | 2026-07-05 | 24 | 2026-07-27 |
| Shampoo de mamá | MP | 39 300 | 2026-08-05 | 4 | 2026-08-27 |

Compras de un solo pago: 38 (PLATA 11, Stori 24, MP 2) + "Alitas Michoacana" (Stori, 37 202 ¢, 2026-07-28) sin fecha explícita. Todas vencen antes de la referencia (la más reciente: 2026-10-14) → **no aportan al crédito usado**. Detalle en `T:1120-1692`.

Pagos fijos (7; frecuencia mensual):

| etiqueta | tarjeta | ¢ | día | inicio |
|---|---|---|---|---|
| Hybidge | Stori | 200 000 | 13 | 2026-06-06 |
| Apple Music Familia | Stori | 23 900 | 1 | 2026-09-16 |
| iCloud Storage | Stori | 4 900 | 1 | 2026-09-16 |
| Minimax API | Stori | 18 000 | 1 | 2026-09-16 |
| Saldo OXXO | Stori | 30 000 | 1 | 2026-09-16 |
| Gasolina | Stori | 300 000 | 1 | 2026-09-22 |
| Renta | MP | 770 000 | 1 | 2026-10-13 |

### C6 · Cifras esperadas (contrato de aceptación)

- Cartera: 3 tarjetas activas · disponible **$52 071.34** (5 207 134) · usado **$39 228.66** (3 922 866) · límite **$91 300.00** (9 130 000) · **43 %**.
- Por tarjeta: PLATA disponible **$22 292.18** (2 229 218) · usado 320 782 · 13 %. Mercado Pago disponible **$17 779.16** (1 777 916) · usado 3 602 084 · 67 %. Stori disponible **$12 000.00** (1 200 000) · usado 0 · 0 %.
- Próximos pagos: PLATA **$458.26** el 22 nov (En 2 días) · Stori **$5 768.00** el 5 dic (En 15 días) · Mercado Pago **$10 230.32** el 8 dic (En 18 días).
- MSI activas: **8**. Mayor saldo: "Galaxy S26 Papá" **$14 101.04**, **19** cuotas por cubrir (de 24); luego iPad Air $11 435.20 (20/24), iPad 11 Pulgadas $5 750.64 (14/18), Compras Atrasadas $3 645.06 (6/15), Silla $2 245.39 (7/12), Definidor de Rizos $990.65 (5/10), Monitor Sansung $962.43 (7/12), Shampoo de mamá $98.25 (1/4).
- Filtros de plazo (descendente): **24, 18, 15, 12, 10, 4** meses. Con el filtro de 12 meses: **2** compras, saldo $3 207.82.

### C7 · Textos literales

Pantalla: "Tarjetas" · "Nueva tarjeta" · "Ajustes" · "Crédito disponible estimado" · "Usado estimado" · "Límite total" · "Usado N %" · "N tarjetas" · "Mi cartera" · "Reordenar" · "Disponible estimado" · "Corte" · "Próximo pago" · "Opciones de {nombre}" · "Próximos pagos" · "Vence el {fecha}" · "Compras a meses" · "Ver las N" · "Sin pagos previstos." · "Sin compras a meses activas." · "Aún no tienes tarjetas registradas." · "Agregar tarjeta" · "No se pudo leer la cartera guardada." · "Reintentar" · pie "Importes en MXN · {20 nov 2026}" · "Tarjetas archivadas".

Hojas: "Cómo se estima el crédito" · "Entendido" · "Ordenar mi cartera" · "Mantén presionada el asa y arrastra para ordenar por prioridad. También puedes usar las flechas." · "Guardar orden" · "Cancelar" · "Ver detalle" · "Editar tarjeta" · "Cambiar prioridad" · "Quitar de mi cartera" · "¿Quitar {nombre}?" · "Conservar tarjeta" · "Quitar tarjeta" · "Tarjetas archivadas" · "Restaurar en mi cartera" · "Nueva tarjeta" · "Editar tarjeta" · "Nombre de la tarjeta" · "Titular" · "Límite de crédito en MXN" · "Día de corte" · "Plazo de pago en días" · "El plazo incluye el día de corte." · "Color de la tarjeta" (Plata, Azul, Verde, Marino) · "Agregar tarjeta" · "Guardar cambios" · "Resumen" · "Movimientos" · "MSI" · "Ciclo en curso" · "Ver historial completo (N)" · "Pago previsto de {nombre}" · "Desglose del pago" · "Compras a meses" · "Compras de un solo pago" · "Pagos fijos previstos" · "Ver tarjeta" · "Quitar filtro" · "Saldo restante estimado" · "Detalle no disponible" · "El registro ya no está disponible en este periodo." · "Volver".

### C8 · Métricas (DESIGN-RULES)

Columna 390 px · interior 14 px arriba / 16 px laterales · separación 14 px entre bloques · panel 24 px de radio, relleno 10·20·20 · resumen azul marino 28 px de radio · alerta ámbar 999 px, alto mínimo 52 px, relleno 6·14, separación 12 px · filas 64 px mínimo, separación 12 px · barra del resumen 12 px (radio 6), barra individual 7 px · plástico 1.586:1, radio 16 px, borde 1 px, relleno `clamp(15px,1.55vw,23px)` · chips de selector 44 px, radio 22 px · filtros de plazo 44 px mínimo, 13 px laterales, fila horizontal con barra oculta · pestañas de ficha 44 px mínimo (grupo radio 14, pestaña radio 11) · botones de icono 44×44 radio 22 px · menú inferior `min(358px, 100% − 32px)`, alto 72 px, radio 36 px · hoja móvil: ancho completo, alto máximo 92 dvh, radios superiores 24 px · tipografía: título 26/800, título de panel 17/700, cifra 44/800 (+centavos 22/700), métrica 17/700, nombre de fila 15/600, auxiliar 13, filtro 14/600, etiqueta 12/600.

## Tasks

| ID | Specs | Unidad | Route | Estado |
| --- | --- | --- | --- | --- |
| T1 | S4, S5, S16 | Modelo + motor: campos de tarjeta (acabado, archivada), migración, repo, funciones puras de crédito/ciclo/pago previsto/MSI + tests | Inline (padre) | hecha · `cf0962c` |
| T2 | S8 (1-4), S9, S10, S11 | Pantalla Tarjetas: encabezado, alerta, resumen de crédito, "Mi cartera" con selector y plástico | Inline (padre) | hecha · `ab1e10e` |
| T3 | S8 (5-7), S17 | "Próximos pagos", "Compras a meses", pie con archivadas, estados vacío/error | Inline (padre) | hecha · `ab1e10e` |
| T4 | S13, S14, S15 | Hojas: ficha de tarjeta (3 pestañas), detalle de vencimiento, "Cómo se estima el crédito", reordenar, formulario nueva tarjeta | delegada | hecha · `8784be2`, `3579643` |
| T5 | S13, S14, S12 | Pantalla "Compras a meses" con filtros de plazo, gestos, teclado y enlaces profundos | delegada | hecha · `5c86981` |
| T6 | S19, S20 | Verificación: respaldo de demostración, pruebas de aceptación, revisión visual 320/387/390 px | Inline (padre) | en curso |

## Log

- **L1 (2026-11-20)** — Encargo del usuario (texto íntegro en el mensaje de la conversación): implementar la página Tarjetas de "Mis finanzas" con `Tarjetas-autonoma.html` como referencia ejecutable y `DESIGN-RULES` como especificación visual, conservando el diseño del Dashboard, entregando la implementación funcionando y confirmando los recorridos del apartado de pruebas.
- **L2 (2026-11-20)** — Mapa de la referencia (exploración de `Tarjetas-autonoma.html`): la vista se clona de `<template id="vista-tarjetas">` (líneas 908–973) y se pinta en `renderWallet()` (2419–2511). Orden real de bloques: encabezado → alerta ámbar → resumen azul marino → "Mi cartera" → "Próximos pagos" → "Compras a meses" → pie. Textos literales de la referencia: "Crédito disponible estimado", "Usado estimado", "Límite total", "Disponible estimado", "Mi cartera", "Reordenar", "Próximos pagos", "Compras a meses", "Ver las N", "Sin pagos previstos.", "Sin compras a meses activas.", "Aún no tienes tarjetas registradas.", "Agregar tarjeta", "No se pudo leer la cartera guardada.", "Reintentar", "Cómo se estima el crédito" (+ botón "Entendido"), "Ordenar mi cartera" (+ "Guardar orden" / "Cancelar"), "¿Quitar {nombre}?" ("Conservar tarjeta" / "Quitar tarjeta"), "Tarjetas archivadas", "Ver detalle" / "Editar tarjeta" / "Cambiar prioridad" / "Quitar de mi cartera", "Nueva tarjeta" / "Editar tarjeta", pie "Importes en MXN · 20 nov 2026".
- **L3 (2026-11-20)** — Decisiones de integración (decididas por el padre, no por la referencia):
  - **URL**: la app usa `createBrowserRouter` (historial HTML5), no hash; se traduce el esquema de la referencia: `/cards` · `/cards?sheet=card&id=<cardId>&tab=resumen|actividad|msi` · `/cards?sheet=payment&id=<cardId>` · `/cards?sheet=plan&id=<txId>&month=<YYYY-MM>` · `/cards/msi?month=<YYYY-MM>&term=<n>` · `/transactions?card=<cardId>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>` (historial completo filtrado). El mes y el id viajan siempre en la URL.
  - **Selección**: `selectedCardId` persistido en `uiStore` (localStorage, estado de UI, no dato). Si la seleccionada ya no está activa, cae en la primera activa por prioridad.
  - **Datos**: `archivada` (boolean) y `acabado` (skin) pasan a ser atributos de la tarjeta → `CardSchema` + migración Dexie v4 con backfill (`archivada=false`, `acabado` derivado del nombre para las tarjetas existentes). Los respaldos v3 siguen importando porque ambos campos tienen default.
  - **Alcance de esquema**: no se toca `transactions` ni `fixedPayments`. El motor nuevo vive en `src/engine/wallet.ts` (funciones puras) y reutiliza `src/engine/msi.ts` y `src/lib/date/cycle.ts`.
- **L4 (2026-11-20)** — Motor y modelo (T1), implementados en el padre: `src/engine/wallet.ts` con `referenceDate`, `cutDateOf`, `computeWalletCycle`, `computeNextDeadline`, `computeMsiInstallments` (tres reglas de redondeo), `computeMsiPlans`, `purchaseDueDate`, `computeCardUsage`, `computePortfolio`, `computeExpectedPayment` (dedup de cargos fijos), `computeUpcomingPayments`, `computeMsiPurchases` y `computeMsiTerms`. `CardSchema` gana `skin` y `archived`; `MsiExpenseSchema` gana `msiPlanRule` (`last` | `first` | `spread`); la migración Dexie v4 rellena `skin` por nombre, `archived=false` y `msiPlanRule='last'`. `cardsRepo` gana `listActive`, `listArchived`, `archive` y `restore`. La paleta de acabados vive en un solo lugar: `src/lib/cards/skin.ts`.
- **L5 (2026-11-20)** — Pantalla (T2, T3) construida con el modelo vivo: `src/features/cards/wallet.ts` (view-model + `useWalletView` con error y reintento) y los componentes `CardPlastic`, `CardSelector`, `CreditSummary`, `DueAlert`, `UpcomingPayments`, `MsiPurchasesPreview`, `MiniCard` y `WalletFooter`. Se retiran los componentes de la versión anterior (`CardBlock`, `CardList`, `CardDetail`, `CardsEmpty`, `computeCardAccount`, `useCardAccounts`, `types`, `DeleteCardConfirm`) porque el modelo nuevo los deja sin equivalente.
- **L6 (2026-11-20)** — Ronda de fidelidad contra la referencia (medida con Playwright, no a ojo): plástico de 318×201 con relleno 15 px y radio 16 px; marca con la caja de cada emisor (`PLΛTΛ` a `clamp(1.45rem,13.1cqw,2.85rem)` / 630 / `0.055em`, "mercado pago" a dos líneas, "stori"); chip EMV dorado de la referencia (`clamp(26px,11cqw,38px)`); trama con los mismos trazos por acabado; chips del selector con fondo de página y 13 px; "Ver las N" en el encabezado de "Compras a meses"; barra individual de 7 px sobre el color de separador y fila de uso en dos columnas ("Usado 13 %" / "$3 207.82 de $25 500.00"); pictograma de Ajustes con filtros en vez de engranaje; resumen azul marino fijo `#0B2B66` en ambos temas (token nuevo `--color-wallet-hero`, sin redefinir en oscuro).
- **L7 (2026-11-20)** — Verificación de T1-T3: `npm run test` 566 pruebas (84 archivos) en verde, `npm run typecheck`, `npm run lint` (0 avisos) y `npm run build` en verde. Con la semilla de demostración, la pantalla reproduce **exactamente** las cifras de C6: cartera $52 071.34 disponibles / $39 228.66 usados / $91 300.00 de límite / 43 %; PLATA $22 292.18 (13 %), Mercado Pago $17 779.16; próximos pagos PLATA $458.26 (22 nov, 2 d), Stori $5 768.00 (5 dic, 15 d), Mercado Pago $10 230.32 (8 dic, 18 d); 8 compras MSI con "Galaxy S26 Papá" en $14 101.04 y 19 cuotas por cubrir. Capturas Playwright a 390 y 360 px en claro y oscuro, sin desbordamiento horizontal (`overflowX = 0`).
- **L8 (2026-11-20)** — Pendiente: T4 (hojas: ficha de tarjeta, detalle de vencimiento, "Cómo se estima el crédito", reordenar, formulario) y T5 (pantalla "Compras a meses" con filtros de plazo) siguen abiertas; T6 cierra cuando existan las capturas a 320 y 387 px y la verificación de los enlaces profundos.
- **L9 (2026-11-20)** — Entrega en dos unidades revisables: `cf0962c` (motor + modelo) y `ab1e10e` (pantalla). Evaluación nativa de riesgo sobre el tramo `77753b8…ab1e10e`: `risk: medium`, `review_due: false` (`under_budget`), sin revisión externa pendiente en este tramo.
- **L10 (2026-11-20)** — Hojas (T4). Ocho hojas sobre una primitiva nueva `Sheet` (`src/components/ui/design/Sheet.tsx`) que sigue `DESIGN-RULES` §7: en móvil, anclada al pie con ancho completo, alto máximo de 92 dvh y radios superiores de 24 px; en escritorio, diálogo centrado de 470 px con radio de 26 px. Cierra con Escape, con el fondo o con el botón de 44 px, y devuelve el foco al control de origen. Contenido: ficha de la tarjeta (pestañas Resumen, Movimientos y MSI), desglose del vencimiento por grupos, "Cómo se estima el crédito", reordenar, tarjetas archivadas, confirmar el retiro, formulario de alta y edición (nombre único, límite $0.01–$999,999,999.99, corte 1–31, plazo 1–90 y acabado) y el menú de opciones. El `CardSchema` sube el plazo máximo de 62 a 90 días para que coincida con la validación del formulario.
- **L11 (2026-11-20)** — Cableado (T4). `src/features/cards/CardsSheets.tsx` lee la URL (`?sheet=card|payment|credit|reorder|archived|menu|remove|new|edit` con `id` y `tab`), monta la hoja con los datos ya calculados y deja las escrituras (`cardsRepo.reorder`, `archive`, `restore`, `create`, `update`) en el host. Movimientos acepta `?card=&from=&to=` para el historial completo de la tarjeta, y la ventana sustituye a los límites del mes.
- **L12 (2026-11-20)** — Compras a meses (T5). Ruta `/cards/msi` con el resumen "Saldo restante estimado", el filtro de plazos en una fila horizontal con barra oculta y la lista de compras activas; el mes y el plazo viajan en la URL. Con la semilla: **8** compras activas por **$39 228.66** y, al filtrar a **12 meses**, **2** compras por **$3 207.82** (cifras de C6). Plazos disponibles: **24, 18, 15, 12, 10, 4** meses.
- **L13 (2026-11-20)** — Verificación tras T4 y T5: `npm run test` **629** pruebas en 94 archivos, `npm run typecheck`, `npm run lint` (0 avisos) y `npm run build` en verde. Capturas Playwright de las ocho hojas y de la pantalla de compras a meses a 390 px (claro y oscuro), sin desbordamiento horizontal; a 320 y 387 px la página conserva el scroll vertical y el último control queda por encima del menú.

