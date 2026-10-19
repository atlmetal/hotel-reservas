import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { formatearCop } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function PagoPage(props: PageProps<"/reservas/[id]/pago">) {
  return (
    <Suspense fallback={<p>Cargando pago…</p>}>
      <PagoContent params={props.params} />
    </Suspense>
  );
}

async function PagoContent({
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

  if (reservation.estado === "CONFIRMADA") {
    redirect(`/reservas/${id}/resultado`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Pago</h1>
      <dl className="space-y-3 border border-stone-200 bg-white p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Referencia</dt>
          <dd className="font-mono">{reservation.referencia}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Habitación</dt>
          <dd>{reservation.room.nombre}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Noches</dt>
          <dd>{reservation.noches}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Total</dt>
          <dd data-testid="total">{formatearCop(reservation.totalCop)}</dd>
        </div>
      </dl>
      <p className="text-sm text-stone-600">
        El formulario de PayU se conectará en el siguiente paso. Mientras tanto
        puedes revisar el estado de la reserva.
      </p>
      <Link
        href={`/reservas/${id}/resultado`}
        className="inline-flex text-sm font-medium text-stone-900 underline underline-offset-2"
      >
        Ver resultado
      </Link>
    </div>
  );
}
