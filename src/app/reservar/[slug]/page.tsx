import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { formatearCop } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ReservationForm } from "./reservation-form";

export default function ReservarPage(props: PageProps<"/reservar/[slug]">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-stone-600 hover:text-stone-900">
        ← Volver al catálogo
      </Link>
      <Suspense fallback={<p>Cargando formulario…</p>}>
        <ReservarContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ReservarContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reservar</h1>
        <p className="mt-2 text-stone-600">
          {room.nombre} · {formatearCop(room.tarifaNocheCop)} por noche · hasta{" "}
          {room.capacidad} {room.capacidad === 1 ? "persona" : "personas"}
        </p>
      </div>
      <ReservationForm
        roomSlug={room.slug}
        capacidad={room.capacidad}
        tarifaNocheCop={room.tarifaNocheCop}
        nombreHabitacion={room.nombre}
      />
    </div>
  );
}
