import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EstadoBadge } from "@/components/estado-badge";
import { formatearCop } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function ResultadoPage(
  props: PageProps<"/reservas/[id]/resultado">,
) {
  return (
    <Suspense fallback={<p>Cargando reserva…</p>}>
      <ResultadoContent params={props.params} />
    </Suspense>
  );
}

async function ResultadoContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { room: true },
  });
  if (!reservation) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Resultado de la reserva
      </h1>
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
      <div className="flex flex-wrap gap-4 text-sm">
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
