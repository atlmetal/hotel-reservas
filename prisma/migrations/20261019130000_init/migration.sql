-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ReservationEstado" AS ENUM ('PENDIENTE_PAGO', 'CONFIRMADA', 'PAGO_RECHAZADO');

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "tarifaNocheCop" INTEGER NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "roomId" INTEGER NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "huespedes" INTEGER NOT NULL,
    "noches" INTEGER NOT NULL,
    "totalCop" INTEGER NOT NULL,
    "referencia" TEXT NOT NULL,
    "estado" "ReservationEstado" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "payuTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_referencia_key" ON "Reservation"("referencia");

-- CreateIndex
CREATE INDEX "Reservation_roomId_estado_idx" ON "Reservation"("roomId", "estado");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
