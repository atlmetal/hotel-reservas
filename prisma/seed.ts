import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const rooms = [
  {
    slug: "estandar",
    nombre: "Estándar",
    descripcion:
      "Habitación cómoda con cama doble, baño privado y escritorio. Ideal para una o dos personas.",
    capacidad: 2,
    tarifaNocheCop: 180_000,
  },
  {
    slug: "superior",
    nombre: "Superior",
    descripcion:
      "Más espacio, cama queen y área de estar. Pensada para hasta tres huéspedes.",
    capacidad: 3,
    tarifaNocheCop: 250_000,
  },
  {
    slug: "suite-aurora",
    nombre: "Suite Aurora",
    descripcion:
      "Suite amplia con sala, cama king y vistas. Capacidad para hasta cuatro personas.",
    capacidad: 4,
    tarifaNocheCop: 420_000,
  },
] as const;

async function main() {
  for (const room of rooms) {
    await prisma.room.upsert({
      where: { slug: room.slug },
      create: { ...room },
      update: {
        nombre: room.nombre,
        descripcion: room.descripcion,
        capacidad: room.capacidad,
        tarifaNocheCop: room.tarifaNocheCop,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
