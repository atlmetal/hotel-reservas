# Reservas Hotel Aurora

MVP para reservar una habitación de un hotel pequeño y pagarla en línea con el WebCheckout de PayU
Latam en su sandbox. Next.js (App Router), Prisma con PostgreSQL y despliegue en Vercel con una base
Neon. Los requisitos están en [`docs/prd.md`](docs/prd.md).

En producción: https://hotel-reservas-psi.vercel.app

## Correr en local

Requisitos: Node 22 y un PostgreSQL al que llegue `DATABASE_URL`.

```bash
cp .env.example .env.local     # completar DATABASE_URL y APP_URL=http://localhost:3000
npm install
npx prisma migrate deploy      # crea las tablas
npm run db:seed                # tres habitaciones; se puede repetir sin duplicar
npm run dev                    # http://localhost:3000
```

Comprobaciones: `npm test` (Vitest), `npm run lint` y `npm run build`.

## Variables de entorno

Todas se leen en el servidor; ninguna llega al navegador.

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL que usa la app (en Neon, la del pool) |
| `DATABASE_URL_UNPOOLED` | Solo en Neon: conexión directa que usa `prisma migrate` |
| `APP_URL` | URL pública de la app, sin `/` final; arma `responseUrl` y `confirmationUrl` |
| `PAYU_CHECKOUT_URL` | `https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/` |
| `PAYU_REPORTS_URL` | `https://sandbox.api.payulatam.com/reports-api/4.0/service.cgi` |
| `PAYU_API_KEY`, `PAYU_API_LOGIN`, `PAYU_MERCHANT_ID`, `PAYU_ACCOUNT_ID` | Credenciales públicas del sandbox de Colombia (ver `.env.example`) |
| `PAYU_TEST` | `1` en sandbox |

## Desplegar en Vercel

1. Importar el repositorio en Vercel: cada push a `main` despliega a producción y cada pull request
   genera un preview.
2. En Storage, crear una base Neon y conectarla al proyecto con el prefijo `DATABASE`: así quedan
   `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
3. Cargar las variables de PayU y `APP_URL` con el dominio de producción.
4. El script `build` genera el cliente de Prisma, aplica las migraciones, siembra las habitaciones
   (la semilla es idempotente) y compila la app.

## Probar el pago

En la página de pago, “Pagar con PayU” lleva al WebCheckout del sandbox. Con la tarjeta Visa
`4111 1111 1111 1111` y vencimiento en un año futuro:

- Aprobado: nombre del tarjetahabiente `APPROVED`, CVV `777` y mes menor que 6.
- Rechazado: nombre `REJECTED`, CVV `666` y mes mayor que 6.

Al volver, la página de resultado verifica la firma de PayU y consulta la API de consultas antes de
cambiar el estado. En la versión desplegada, PayU llama además a `POST /api/webhooks/payu`; en local
esa URL no es alcanzable desde PayU y se prueba con peticiones simuladas:

```bash
REF=AUR-20261019-ABC123   # referencia de una reserva existente
SIGN=$(printf '%s' "4Vj8eK4rloUd272L48hsrarnUA~508029~$REF~180000.0~COP~4" | md5sum | cut -d' ' -f1)
curl -X POST http://localhost:3000/api/webhooks/payu \
  -d "merchant_id=508029&reference_sale=$REF&value=180000.00&currency=COP&state_pol=4&transaction_id=tx-1&sign=$SIGN"
```
