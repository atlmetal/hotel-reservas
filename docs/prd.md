# PRD: Reservas Hotel Aurora

Versión 1.1, 10 de octubre de 2026. Documento de requisitos para generar la aplicación con Cursor y para
que TestSprite derive el plan de pruebas. Electiva Énfasis III, unidad 4.

## 1. Propósito

Aplicación web mínima para que un huésped reserve una habitación de un hotel pequeño y pague en línea
con PayU Latam en su ambiente de pruebas (sandbox). Es el sistema bajo prueba de un plan de pruebas
generado con un agente de IA y TestSprite. Se genera con Cursor y se despliega en Vercel con cada push a
GitHub.

## 2. Alcance

Incluye: catálogo de habitaciones, formulario de reserva con validaciones, cálculo del precio, pago con
el WebCheckout de PayU, confirmación del pago consultando la API de consultas de PayU, URL de
confirmación (webhook), lista de reservas y una API JSON.

No incluye: autenticación de usuarios, cancelaciones, reembolsos, correos, varios hoteles, idiomas,
imágenes reales ni pasarela en producción.

## 3. Usuarios

- Huésped: elige habitación, reserva y paga.
- Recepción: consulta la lista de reservas. En el MVP no hay login.

## 4. Stack y restricciones técnicas

- Next.js con App Router (la versión que instale `create-next-app`), TypeScript estricto y Tailwind.
  Node 22.
- Prisma con PostgreSQL: base local en desarrollo, Neon en Vercel.
- PayU Latam sandbox: WebCheckout en `https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/`
  (formulario POST, sin iframe) y API de consultas en
  `https://sandbox.api.payulatam.com/reports-api/4.0/service.cgi`. Las credenciales del sandbox son
  públicas y las documenta PayU: `apiKey 4Vj8eK4rloUd272L48hsrarnUA`, `apiLogin pRRXKOl8ikMmt9u`,
  `merchantId 508029`, `accountId 512321` (Colombia).
- Variables de entorno, todas leídas con `process.env` en el servidor: `DATABASE_URL`, `APP_URL`,
  `PAYU_CHECKOUT_URL`, `PAYU_REPORTS_URL`, `PAYU_API_KEY`, `PAYU_API_LOGIN`, `PAYU_MERCHANT_ID`,
  `PAYU_ACCOUNT_ID` y `PAYU_TEST` (`1` en sandbox). `.env.example` trae los valores públicos del sandbox
  de PayU y deja vacíos `DATABASE_URL` y `APP_URL`.
- El `apiKey` nunca llega al cliente. Las tres firmas (formulario, respuesta y confirmación) se calculan
  en el servidor.
- Textos de la interfaz en español. Moneda COP sin decimales; a PayU se envía `amount` como entero en
  pesos (por ejemplo `180000`).
- Accesibilidad básica: cada campo con su `label`, botones con texto, errores visibles junto al campo.
- Atributos `data-testid` estables: `room-card` en cada habitación del catálogo, `campo-<nombre>` en
  cada campo del formulario, `continuar-pago` en el botón de continuar, `total` en el resumen de
  precio, `pagar-payu` en el botón de pago, `estado-reserva` en el estado y `fila-reserva` en cada
  fila de la lista.

## 5. Modelo de datos

Room: `id` entero, `slug` único, `nombre`, `descripcion`, `capacidad` entero, `tarifaNocheCop` entero.

Reservation: `id` cuid, `roomId`, `checkIn` fecha, `checkOut` fecha, `nombre`, `email`, `celular`,
`huespedes` entero, `noches` entero, `totalCop` entero, `referencia` única, `estado` enum
(`PENDIENTE_PAGO`, `CONFIRMADA`, `PAGO_RECHAZADO`), `payuTransactionId` opcional, `createdAt`,
`updatedAt`.

Semilla idempotente con tres habitaciones: Estándar (2 personas, 180 000 COP la noche), Superior
(3 personas, 250 000) y Suite Aurora (4 personas, 420 000).

## 6. Funcionalidades y criterios de aceptación

**F1. Catálogo (`/`).** Muestra las tres habitaciones con nombre, descripción, capacidad y tarifa
formateada como “$180.000 COP por noche”, cada una con un enlace “Reservar” a `/reservar/[slug]`.

**F2. Formulario de reserva (`/reservar/[slug]`).** Campos: fecha de entrada, fecha de salida, nombre
completo, correo, celular y número de huéspedes. Validaciones, iguales en cliente y servidor:

- entrada igual o posterior a hoy; salida posterior a la entrada; máximo 30 noches;
- nombre de 3 a 80 caracteres; correo con formato válido;
- celular colombiano: exactamente 10 dígitos y empieza por 3;
- huéspedes entre 1 y la capacidad de la habitación.

Muestra un resumen que se actualiza al cambiar las fechas: noches y total (noches × tarifa). Cada error
se muestra junto a su campo. El botón “Continuar al pago” envía a F3 y lleva a la página de pago.

**F3. Crear reserva (`POST /api/reservations`).** Recibe JSON con `roomSlug`, `checkIn`, `checkOut`,
`nombre`, `email`, `celular` y `huespedes`. Responde 201 con la reserva creada en estado
`PENDIENTE_PAGO`, con `noches`, `totalCop` y `referencia` con formato `AUR-<AAAAMMDD>-<6 caracteres>`
(solo letras y números). Responde 400 con la lista de errores por campo si algo no valida, 404 si la
habitación no existe y 409 si la habitación ya tiene una reserva `CONFIRMADA` que se solape con las
fechas pedidas.

**F4. Página de pago (`/reservas/[id]/pago`).** Muestra el resumen de la reserva y un formulario
`POST` al WebCheckout de PayU con campos ocultos: `merchantId`, `accountId`, `description` (“Reserva
<referencia>: <habitación>, <n> noches”), `referenceCode` (la referencia), `amount` (el total en pesos,
entero), `tax` `0`, `taxReturnBase` `0`, `currency` `COP`, `signature`, `test` (`PAYU_TEST`),
`buyerEmail`, `buyerFullName`, `telephone` (el celular), `responseUrl` igual a
`${APP_URL}/reservas/[id]/resultado` y `confirmationUrl` igual a `${APP_URL}/api/webhooks/payu`. La
firma es MD5 de `apiKey~merchantId~referenceCode~amount~currency`, con `amount` exactamente como se
envía, calculada en el servidor. El botón dice “Pagar con PayU” y lleva `data-testid="pagar-payu"`.
Incluye una caja de ayuda con los datos del sandbox: tarjeta Visa 4111 1111 1111 1111, vencimiento en
un año futuro; para aprobar, nombre del tarjetahabiente `APPROVED`, CVV `777` y mes menor que 6; para
rechazar, nombre `REJECTED`, CVV `666` y mes mayor que 6. Si la reserva ya está `CONFIRMADA`, redirige
al resultado.

**F5. Resultado (`/reservas/[id]/resultado`).** PayU devuelve al huésped por `GET` con, entre otros,
`transactionState`, `referenceCode`, `TX_VALUE`, `currency`, `signature`, `transactionId`,
`reference_pol`, `lapResponseCode`, `message` y `processingDate`. El servidor:

1. Verifica `signature` contra MD5 de `apiKey~merchantId~referenceCode~new_value~currency~transactionState`,
   donde `new_value` es `TX_VALUE` redondeado a un decimal con redondeo al par más cercano (150.25 da
   150.2; 150.35 da 150.4; 180000.00 da 180000.0). Si no coincide, muestra un error y no cambia nada.
2. Consulta la API de consultas de PayU con `ORDER_DETAIL_BY_REFERENCE_CODE` (JSON con `test`,
   `language`, `command`, `merchant.apiLogin`, `merchant.apiKey` y `details.referenceCode`) y toma el
   `transactionResponse.state` de la transacción más reciente de la orden con esa referencia.
3. Guarda `payuTransactionId` y actualiza el estado: APPROVED pasa a `CONFIRMADA`; DECLINED, ERROR y
   EXPIRED pasan a `PAGO_RECHAZADO`; PENDING y SUBMITTED no cambian nada y la página ofrece “Actualizar
   estado”.

Muestra estado, referencia, habitación, fechas, total e id de transacción. Si el pago fue rechazado,
ofrece “Intentar de nuevo”, que genera una referencia nueva y vuelve a la página de pago. Si llega sin
parámetros de PayU, solo muestra el estado guardado.

**F6. Confirmación (`POST /api/webhooks/payu`).** PayU la llama servidor a servidor, con
`application/x-www-form-urlencoded`, solo cuando la transacción llega a un estado final, con
`state_pol`, `reference_sale`, `reference_pol`, `value`, `currency`, `sign`, `merchant_id`,
`transaction_id`, `response_message_pol`, `payment_method_type` y `email_buyer`. Verifica `sign`
contra MD5 de `apiKey~merchant_id~reference_sale~new_value~currency~state_pol`, donde `new_value` es
`value` con un solo decimal si el segundo decimal es cero (150.00 da 150.0) y con los dos decimales si
no (150.25 queda 150.25). Si no coincide, responde 403 y no cambia nada. Si coincide, busca la reserva
por `reference_sale`, guarda `transaction_id` y aplica: `4` pasa a `CONFIRMADA`; `6` y `5` pasan a
`PAGO_RECHAZADO`; cualquier otro valor no cambia nada. Responde 200 con el texto `OK`, sin HTML. En
desarrollo local esta URL no es alcanzable desde PayU, así que se prueba con peticiones simuladas; en
Vercel sí recibe las confirmaciones reales porque la URL viaja en cada formulario de pago.

**F7. Lista de reservas (`/reservas`).** Tabla ordenada por fecha de creación descendente con
referencia, habitación, fechas, huésped, total y estado como etiqueta de color, y enlace al resultado.
Con la base vacía muestra “Todavía no hay reservas”.

**F8. API JSON.** `GET /api/rooms` (200, lista), `GET /api/reservations` (200, lista),
`GET /api/reservations/[id]` (200 o 404) y `GET /api/health` (200 con `{ "status": "ok" }`).

**F9. Errores.** Página 404 propia para reservas inexistentes; estados de carga; nunca se muestra una
traza al usuario.

## 7. Reglas de negocio

- Noches = días entre entrada y salida; la noche de salida no se cobra. Total = noches × tarifa.
- Dos reservas de la misma habitación se solapan si `entradaNueva < salidaExistente` y
  `salidaNueva > entradaExistente`. Solo las `CONFIRMADA` bloquean fechas.
- Una reserva `PENDIENTE_PAGO` no bloquea disponibilidad en el MVP.
- El estado solo cambia por la API de consultas de PayU o por la URL de confirmación con firma válida.
  La página de resultado muestra y dispara la consulta; no cambia el estado por sí sola.

## 8. Requisitos no funcionales

- Sin llamadas externas salvo a PayU. Logs del servidor sin secretos.
- `npm run lint` y `npm run build` sin errores.
- Tests unitarios con Vitest para: cálculo de noches y total, validación del formulario, solapamiento,
  las tres firmas de PayU (con sus reglas de redondeo) y el mapeo de estados.
- README en español: cómo correr en local, variables, cómo desplegar, cómo probar el pago.

## 9. Despliegue

- Repositorio público `atlmetal/hotel-reservas` en GitHub, rama `main`.
- Vercel importa el repo: cada push a `main` despliega a producción; cada pull request genera un
  preview. Base Neon (PostgreSQL) conectada desde el marketplace de Vercel.
- Script `build`: `prisma generate && prisma migrate deploy && next build`. Semilla con
  `npm run db:seed`, idempotente, ejecutada una vez contra cada base.

## 10. Pruebas esperadas (guía para TestSprite)

Sin login. Casos mínimos: catálogo con tres habitaciones; validaciones del formulario (fecha pasada,
salida anterior a la entrada, celular de 9 dígitos, correo inválido, huéspedes por encima de la
capacidad); reserva válida creada con referencia y total correctos; 409 por solapamiento con una reserva
confirmada; página de pago con el formulario de PayU y la firma presente; pago aprobado en el sandbox
(nombre `APPROVED`, CVV `777`) que deja la reserva `CONFIRMADA`; pago rechazado (nombre `REJECTED`, CVV
`666`) que la deja `PAGO_RECHAZADO`; lista de reservas con el estado actualizado; API de habitaciones,
reservas y salud; confirmación con firma inválida que responde 403 y confirmación simulada con firma
válida (calculada con el `apiKey` público del sandbox) que confirma la reserva.
