import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EstadoBadge } from "@/components/estado-badge";
import { formatearCop } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function ReservasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reservas</h1>
        <p className="mt-2 text-stone-600">
          Listado ordenado por fecha de creación.
        </p>
      </div>
      <Suspense fallback={<p>Cargando reservas…</p>}>
        <ReservasTable />
      </Suspense>
    </div>
  );
}

async function ReservasTable() {
  await connection();
  const reservations = await prisma.reservation.findMany({
    include: { room: true },
    orderBy: { createdAt: "desc" },
  });

  if (reservations.length === 0) {
    return <p>Todavía no hay reservas</p>;
  }

  return (
    <div className="overflow-x-auto border border-stone-200 bg-white">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-100 text-stone-700">
          <tr>
            <th className="px-3 py-2 font-medium">Referencia</th>
            <th className="px-3 py-2 font-medium">Habitación</th>
            <th className="px-3 py-2 font-medium">Fechas</th>
            <th className="px-3 py-2 font-medium">Huésped</th>
            <th className="px-3 py-2 font-medium">Total</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium"> </th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr
              key={r.id}
              data-testid="fila-reserva"
              className="border-b border-stone-100 last:border-0"
            >
              <td className="px-3 py-2 font-mono text-xs">{r.referencia}</td>
              <td className="px-3 py-2">{r.room.nombre}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
              </td>
              <td className="px-3 py-2">{r.nombre}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatearCop(r.totalCop)}
              </td>
              <td className="px-3 py-2">
                <EstadoBadge estado={r.estado} />
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/reservas/${r.id}/resultado`}
                  className="text-stone-900 underline underline-offset-2"
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
