# TestSprite AI Testing Report (MCP)

Informe completado por el agente que orquestó TestSprite por MCP, a partir de `raw_report.md` y
`test_results.json` de cada corrida. Cada caso se revisó a mano: su código, su oráculo y el estado real
de la base de datos o de PayU después de la corrida.

---

## 1️⃣ Document Metadata

- **Project Name:** hotel-reservas (Reservas Hotel Aurora)
- **Date:** 2026-10-19
- **Prepared by:** TestSprite AI Team (generación y ejecución) y revisión del agente orquestador
- **Servidor bajo prueba:** `next start` (modo producción) en `localhost:3000`, expuesto a la nube de
  TestSprite por su túnel. PRD: `docs/prd.md` v1.1 (v1.2 desde la corrección de F6).
- **Corridas:**
  - Frontend 1: 23 casos, 13:56 a 14:03 (hora de Bogotá).
  - Repeticiones de frontend: TC020 con la base vacía (14:35) y TC009 con una URL de retorno firmada (14:36).
  - Backend 1: 10 casos.
  - Repeticiones de backend tras corregir F6: TC006 y TC008, y de nuevo TC008 con instrucción.
- **Créditos:** 150 al empezar y 135,4 al terminar (plan Free).

---

## 2️⃣ Requirement Validation Summary

Columnas: estado en la primera corrida y, si hubo, en la repetición; severidad del hallazgo; análisis.
“Oráculo” es lo que comprueba el código exportado del caso.

### Requirement: Catálogo de habitaciones (F1)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC003 Browse room catalog and start a reservation | ✅ Passed | LOW | Correcto. Oráculo: el campo `campo-checkIn` visible tras “Reservar”. |
| TC007 Open the Standard room booking flow | ✅ Passed | LOW | Correcto; redundante con TC003. Oráculo: URL `/reservar/estandar` y botón `continuar-pago`. |
| TC008 Open the Suite Aurora booking flow | ✅ Passed | LOW | Correcto; redundante con TC003. |

### Requirement: Formulario de reserva y validaciones (F2, F3 desde la interfaz)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC001 Complete a valid reservation and reach payment | ✅ Passed | LOW | Correcto: la reserva quedó en la base en `PENDIENTE_PAGO`. Oráculo: URL `/pago` y texto “Noches”. |
| TC016 Show live nights and total while booking | ✅ Passed | MEDIUM | Lo dio por bueno el juez de IA; el código exportado no comprueba el total y usa fechas fijas (20 a 23 de octubre de 2026) que caducan. |
| TC017 Reject a booking with an invalid date range | ✅ Passed | MEDIUM | Correcto según el juez; el código exportado solo comprueba que la página cargó. |
| TC019 Reject a booking with a past check-in date | ✅ Passed | MEDIUM | Igual que TC017: veredicto correcto, oráculo exportado débil. |
| TC023 Show field validation errors for invalid guest details | ✅ Passed | MEDIUM | Correcto; el oráculo exportado solo verifica que la URL no cambie, no los mensajes por campo. |

### Requirement: Pago con PayU sandbox (F4)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC004 Open the PayU sandbox checkout | ✅ Passed | LOW | Correcto. Oráculo: la URL de `sandbox.checkout.payulatam.com`. |
| TC010 Review reservation summary before paying | ✅ Passed | LOW | Correcto. Oráculo: “Noches” y `pagar-payu` visibles. |
| TC002 Complete an approved sandbox payment | ✅ Passed | HIGH (oráculo) | Veredicto correcto, verificado aparte: la reserva quedó `CONFIRMADA` y PayU tiene la transacción `APPROVED`. Pero el oráculo exportado es `transactionState=4` en la URL, el dato que el PRD prohíbe usar para decidir el estado: pasaría aunque la app no actualizara la reserva. |
| TC005 Complete a rejected sandbox payment | ✅ Passed | HIGH (oráculo) | Igual que TC002: la reserva quedó `PAGO_RECHAZADO` (PayU: `DECLINED`), pero el oráculo exportado es `lapTransactionState=DECLINED` en la URL. |

### Requirement: Resultado del pago (F5)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC006 Ver estado y detalle en el resultado | ✅ Passed | MEDIUM | Correcto según el juez; intentó primero `/reservas/1` (id inventado). Oráculo exportado débil. |
| TC009 Actualizar el estado mostrado | ⛔ Blocked → ✅ Passed | MEDIUM (prueba) | Bloqueado porque abrió `/reservas/1`, un id inventado (los ids son cuid) y la app respondió bien con su 404. El estado pendiente no se puede producir con tarjeta en el sandbox. Repetido con una reserva pendiente y la URL de retorno firmada en la instrucción: pasó, aunque el código exportado de la repetición solo verifica que se vea “Fechas”. |
| TC012 Permitir reintentar un pago rechazado | ✅ Passed | MEDIUM | Correcto, verificado en la base y en PayU: la reserva `RDSKKJ` quedó rechazada (`DECLINED`) y el reintento le asignó la referencia nueva `5SJAB1`. Dependió de una reserva pendiente que ya existía; el oráculo exportado solo mira la URL `/pago`. |

### Requirement: Lista de reservas (F7)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC011 Ver el listado ordenado por fecha | ✅ Passed | MEDIUM | El oráculo exportado busca una fila concreta (`AUR-20261019-0LNVLU`) y no comprueba el orden: se rompe con otros datos. |
| TC013 View the reservations list newest first | ✅ Passed | MEDIUM | Igual que TC011 (fila `AUR-20261019-2BE7U6`); redundante. |
| TC014 Abrir el resultado desde el listado | ✅ Passed | LOW | Correcto. Oráculo: URL `/resultado` y el término “Estado”. |
| TC015 Open a reservation from the list | ✅ Passed | LOW | Correcto; redundante con TC014. |
| TC020 Ver el estado vacío del listado | ❌ Failed → ✅ Passed | MEDIUM (prueba) | Falló porque la base tenía reservas; la precondición “lista vacía” no se preparó. Repetido con la app apuntando a una base vacía: pasó. El oráculo de la primera versión era un XPath absoluto; el de la repetición solo verifica que la página cargó. |

### Requirement: Páginas de no encontrado (F9)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC018 Página de no encontrado en reserva inexistente | ✅ Passed | LOW | Correcto en la interfaz. No revisa el código HTTP: la página responde 200 (ver riesgos). |
| TC021 Unknown route with the custom not-found page | ✅ Passed | LOW | Correcto. |
| TC022 Volver al catálogo desde no encontrado | ✅ Passed | LOW | Correcto. |

### Requirement: API JSON (F3 y F8)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC001 health_check_api_returns_status_ok | ✅ Passed | LOW | Correcto; oráculo exacto (200 y `status: ok`). |
| TC002 rooms_catalog_api_returns_seeded_rooms | ✅ Passed | LOW | Correcto; valida slugs, capacidades y tarifas. |
| TC003 reservation_creation_with_valid_data | ✅ Passed | LOW | Correcto; valida 201, estado, noches, total y formato de referencia. |
| TC004 reservation_creation_with_invalid_fields | ✅ Passed | LOW | Correcto; 400 con el error en el campo esperado para fecha pasada, correo y huéspedes. |
| TC005 reservation_creation_with_unknown_roomslug | ✅ Passed | LOW | Correcto (404). |
| TC006 reservation_creation_with_date_conflict | ✅ Passed → ✅ Passed | HIGH (app) | Pasó, pero al revisarlo se vio que confirma una reserva de 360 000 COP con una confirmación firmada por 180 000, y la app la aceptó: faltaba validar monto y moneda en F6. Se corrigió la app (PRD 1.2) y la versión regenerada del caso pasó. |
| TC007 reservation_retrieval_with_missing_id | ✅ Passed | LOW | Correcto (404). |

### Requirement: URL de confirmación de PayU (F6)

| Test | Estado | Severidad | Análisis / hallazgos |
|---|---|---|---|
| TC008 payu_confirmation_webhook_valid_request | ✅ Passed → ❌ Failed → ✅ Passed | MEDIUM (prueba) | Primera versión correcta y con buen oráculo (estado y id de transacción leídos de vuelta). Al regenerarse tras la corrección buscó el id en `transaction_id`, no en `payuTransactionId`, y falló aunque la base tenía el valor. Con la instrucción del nombre del campo pasó y ahora cubre también el rechazo (`state_pol` 5). |
| TC009 payu_confirmation_webhook_invalid_signature | ✅ Passed | LOW | Correcto (403 y sin cambios). |
| TC010 payu_confirmation_webhook_unknown_reference_sale | ✅ Passed | LOW | Correcto (404). |

---

## 3️⃣ Coverage & Matching Metrics

| Requisito | Casos | Estado final |
|---|---|---|
| F1 Catálogo | 3 de frontend | 3 de 3 |
| F2 y F3 desde la interfaz | 5 de frontend (TC001 crea la reserva) | 5 de 5 |
| F3 por API (201, 400, 404, 409) | 4 de backend | 4 de 4 |
| F4 Página de pago | 4 de frontend | 4 de 4 |
| F5 Resultado del pago | 3 de frontend | 3 de 3, uno tras repetición |
| F6 Confirmación | 3 de backend | 3 de 3, tras corrección y repetición |
| F7 Lista de reservas | 5 de frontend | 5 de 5, uno tras repetición |
| F8 API JSON | 3 de backend | 3 de 3 |
| F9 Errores | 3 de frontend | 3 de 3 |

- Primera corrida de frontend: 21 de 23 en verde (91 %), 1 fallido y 1 bloqueado, los dos por la prueba.
- Primera corrida de backend: 10 de 10.
- Defectos reales de la app hallados con TestSprite: 1 (F6 sin validar monto y moneda), y salió de leer
  un caso que pasaba, no de un fallo.
- Falsos negativos (fallos que no eran defectos): 3 (TC009 y TC020 de frontend, TC008 regenerado).
- Casos de frontend cuyo código exportado no comprueba lo que promete su título (solo la URL, una fila
  concreta o “la página cargó”): 12 de 23, contando las versiones repetidas de TC009 (solo verifica que
  se vea “Fechas”) y TC020 (solo que la página cargó). En ellos el veredicto lo dio el juez de IA.
  Los 10 de backend sí comprueban códigos HTTP y cuerpos.
- Casos redundantes: 4 (TC007, TC008, TC013 y TC015 de frontend).

---

## 4️⃣ Key Gaps / Risks

- **Oráculos en la URL.** TC002 y TC005 dan por bueno el pago leyendo los parámetros que pone PayU, no el
  estado de la reserva. Conviene exigir `estado-reserva` o leer la reserva por la API.
- **Veredicto del juez frente al código exportado.** Varios casos pasaron por la observación del agente,
  pero su código exportado no lo comprobaría al volver a correrse fuera de TestSprite.
- **Datos de prueba.** Hubo ids inventados (`/reservas/1`), aserciones atadas a filas concretas,
  precondiciones no preparadas (lista vacía) y casos que usaron datos de otras corridas.
- **Regeneración no determinista.** Volver a generar TC008 cambió su oráculo y lo volvió falso negativo.
- **Lo que no se probó.** El código HTTP de las páginas 404 (responden 200 por el streaming de Next.js),
  la concurrencia del 409 (verificación e inserción fuera de una transacción) y el pago pendiente real.
- **Dependencia externa.** Los recorridos de pago dependen del sandbox de PayU, de su latencia y de las
  dos versiones de su checkout.
