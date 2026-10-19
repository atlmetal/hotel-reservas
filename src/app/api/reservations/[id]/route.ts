import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/reservations/[id]">,
) {
  const { id } = await context.params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { room: true },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Reserva no encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json(reservation);
}
