import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { EstadoBadge } from "@/components/estado-badge";
import { formatearCop } from "@/lib/format";
import {
  firmaRespuestaPayu,
  firmaValida,
  mapearEstadoConsultaPayu,
} from "@/lib/payu";
import { consultarTransaccionPayu, payuConfig } from "@/lib/payu-server";
import { prisma } from "@/lib/prisma";
import { generarReferencia } from "@/lib/referencia";

type Query = Record<string, string | string[] | undefined>;

const PARAMETROS_PAYU = ["transactionState", "referenceCode", "TX_VALUE", "signature"];

export default function ResultadoPage(
  props: PageProps<"/reservas/[id]/resultado">,
) {
  return (
    <Suspense fallback={<p>Cargando reserva…</p>}>
      <ResultadoContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

/** “Intentar de nuevo” (F5): referencia nueva y de vuelta a la página de pago. */
async function intentarDeNuevo(id: string) {
  "use server";
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (reservation?.estado === "PAGO_RECHAZADO") {
    await prisma.reservation.update({
      where: { id },
      data: { referencia: generarReferencia() },
    });
    redirect(`/reservas/${id}/pago`);
  }
  redirect(`/reservas/${id}/resultado`);
}

async function ResultadoContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await connection();
  let reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { room: true },
  });
  if (!reservation) notFound();

  const uno = (nombre: string) => {
    const valor = query[nombre];
    return (Array.isArray(valor) ? valor[0] : valor) ?? "";
  };

  // F5: con parámetros de PayU se verifica la firma y se consulta la API de
  // consultas; el estado solo cambia con lo que responde PayU, nunca con la URL.
  let aviso: string | null = null;
  let pendiente = false;
  if (PARAMETROS_PAYU.some((nombre) => uno(nombre))) {
    const payu = payuConfig();
    const esperada = firmaRespuestaPayu({
      apiKey: payu.apiKey,
      merchantId: payu.merchantId,
      referenceCode: uno("referenceCode"),
      txValue: uno("TX_VALUE"),
      currency: uno("currency"),
      transactionState: uno("transactionState"),
    });
    if (
      !firmaValida(esperada, uno("signature")) ||
      uno("referenceCode") !== reservation.referencia
    ) {
      aviso =
        "La respuesta de PayU no es válida: la firma o la referencia no coinciden. La reserva no cambió.";
    } else {
      try {
        const transaccion = await consultarTransaccionPayu(reservation.referencia);
        const estado = transaccion && mapearEstadoConsultaPayu(transaccion.state);
        if (transaccion) {
          reservation = await prisma.reservation.update({
            where: { id },
            data: {
              payuTransactionId: transaccion.id,
              ...(estado ? { estado } : {}),
            },
            include: { room: true },
          });
        }
        pendiente = !estado;
      } catch (error) {
        console.error("Consulta a PayU fallida:", (error as Error).message);
        aviso =
          "No fue posible consultar el pago en PayU. Intenta actualizar el estado en unos segundos.";
        pendiente = true;
      }
    }
  }

  const actualizar = `/reservas/${id}/resultado?${new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) =>
      (Array.isArray(v) ? v : [v ?? ""]).map((valor) => [k, valor]),
    ),
  )}`;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Resultado de la reserva
      </h1>
      {aviso ? (
        <p
          role="alert"
          className="border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          {aviso}
        </p>
      ) : null}
      {pendiente ? (
        <p className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          PayU todavía no confirma el pago.{" "}
          <Link href={actualizar} className="font-medium underline underline-offset-2">
            Actualizar estado
          </Link>
        </p>
      ) : null}
      <dl className="space-y-3 border border-stone-200 bg-white p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Estado</dt>
          <dd>
            <EstadoBadge estado={reservation.estado} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Referencia</dt>
          <dd className="font-mono">{reservation.referencia}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Habitación</dt>
          <dd>{reservation.room.nombre}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Fechas</dt>
          <dd>
            {reservation.checkIn.toISOString().slice(0, 10)} →{" "}
            {reservation.checkOut.toISOString().slice(0, 10)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Total</dt>
          <dd data-testid="total">{formatearCop(reservation.totalCop)}</dd>
        </div>
        {reservation.payuTransactionId ? (
          <div className="flex justify-between gap-4">
            <dt className="text-stone-600">Id de transacción</dt>
            <dd className="font-mono text-xs">
              {reservation.payuTransactionId}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {reservation.estado === "PAGO_RECHAZADO" ? (
          <form action={intentarDeNuevo.bind(null, reservation.id)}>
            <button
              type="submit"
              className="bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-800"
            >
              Intentar de nuevo
            </button>
          </form>
        ) : null}
        {reservation.estado === "PENDIENTE_PAGO" ? (
          <Link
            href={`/reservas/${reservation.id}/pago`}
            className="font-medium text-stone-900 underline underline-offset-2"
          >
            Ir al pago
          </Link>
        ) : null}
        <Link
          href="/reservas"
          className="text-stone-600 underline underline-offset-2"
        >
          Ver todas las reservas
        </Link>
      </div>
    </div>
  );
}
