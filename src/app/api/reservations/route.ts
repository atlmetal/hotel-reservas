import { NextResponse } from "next/server";
import { parseDateOnly } from "@/lib/dates";
import { fechasSeSolapan } from "@/lib/overlap";
import { calcularNoches, calcularTotal } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { generarReferencia } from "@/lib/referencia";
import { validarFormularioReserva } from "@/lib/reservation-validation";

type CreateBody = {
  roomSlug?: string;
  checkIn?: string;
  checkOut?: string;
  nombre?: string;
  email?: string;
  celular?: string;
  huespedes?: number;
};

export async function GET() {
  const reservations = await prisma.reservation.findMany({
    include: { room: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reservations);
}

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es JSON válido" },
      { status: 400 },
    );
  }

  const roomSlug = body.roomSlug?.trim() ?? "";
  if (!roomSlug) {
    return NextResponse.json(
      { errors: { roomSlug: "La habitación es obligatoria" } },
      { status: 400 },
    );
  }

  const room = await prisma.room.findUnique({ where: { slug: roomSlug } });
  if (!room) {
    return NextResponse.json(
      { error: "Habitación no encontrada" },
      { status: 404 },
    );
  }

  const checkIn = body.checkIn?.trim() ?? "";
  const checkOut = body.checkOut?.trim() ?? "";
  const nombre = body.nombre?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const celular = (body.celular ?? "").replace(/\s/g, "");
  const huespedes = Number(body.huespedes);

  const errors = validarFormularioReserva({
    checkIn,
    checkOut,
    nombre,
    email,
    celular,
    huespedes,
    capacidad: room.capacidad,
  });

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const entrada = parseDateOnly(checkIn);
  const salida = parseDateOnly(checkOut);

  const confirmadas = await prisma.reservation.findMany({
    where: { roomId: room.id, estado: "CONFIRMADA" },
  });

  const haySolape = confirmadas.some((r) =>
    fechasSeSolapan(entrada, salida, r.checkIn, r.checkOut),
  );
  if (haySolape) {
    return NextResponse.json(
      {
        error:
          "La habitación ya tiene una reserva confirmada en esas fechas",
      },
      { status: 409 },
    );
  }

  const noches = calcularNoches(entrada, salida);
  const totalCop = calcularTotal(noches, room.tarifaNocheCop);
  const referencia = generarReferencia();

  const reservation = await prisma.reservation.create({
    data: {
      roomId: room.id,
      checkIn: entrada,
      checkOut: salida,
      nombre,
      email,
      celular,
      huespedes,
      noches,
      totalCop,
      referencia,
      estado: "PENDIENTE_PAGO",
    },
    include: { room: true },
  });

  return NextResponse.json(reservation, { status: 201 });
}
