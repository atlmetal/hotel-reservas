import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { formatearCop } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Habitaciones</h1>
        <p className="mt-2 text-stone-600">
          Elige una habitación para reservar en Hotel Aurora.
        </p>
      </div>
      <Suspense fallback={<p>Cargando habitaciones…</p>}>
        <RoomCatalog />
      </Suspense>
    </div>
  );
}

async function RoomCatalog() {
  await connection();
  const rooms = await prisma.room.findMany({ orderBy: { id: "asc" } });

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <li
          key={room.id}
          data-testid="room-card"
          className="flex flex-col gap-3 border border-stone-200 bg-white p-5"
        >
          <h2 className="text-xl font-semibold">{room.nombre}</h2>
          <p className="flex-1 text-sm text-stone-600">{room.descripcion}</p>
          <p className="text-sm text-stone-700">
            Capacidad: {room.capacidad}{" "}
            {room.capacidad === 1 ? "persona" : "personas"}
          </p>
          <p className="font-medium">
            {formatearCop(room.tarifaNocheCop)} por noche
          </p>
          <Link
            href={`/reservar/${room.slug}`}
            className="inline-flex items-center justify-center bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Reservar
          </Link>
        </li>
      ))}
    </ul>
  );
}
