import { describe, expect, it } from "vitest";
import { fechaEnBogota } from "./dates";
import { validarFormularioReserva } from "./reservation-validation";

describe("fechaEnBogota", () => {
  it("usa el calendario de America/Bogota (UTC-5)", () => {
    // 00:30 UTC del 20 = 19:30 del 19 en Bogotá → aún es el 19
    expect(fechaEnBogota(new Date("2026-10-20T00:30:00.000Z"))).toBe(
      "2026-10-19",
    );
    // 05:00 UTC del 20 = 00:00 del 20 en Bogotá
    expect(fechaEnBogota(new Date("2026-10-20T05:00:00.000Z"))).toBe(
      "2026-10-20",
    );
  });
});

describe("validarFormularioReserva con zona Bogotá", () => {
  const base = {
    checkOut: "2026-10-21",
    nombre: "Ana Pérez",
    email: "ana@ejemplo.com",
    celular: "3001234567",
    huespedes: 2,
    capacidad: 2,
  };

  it("acepta el día calendario de Bogotá tras las 19:00 hora local", () => {
    // Tras las 7 p. m. Bogotá el reloj UTC ya es el día siguiente
    const tardeBogota = new Date("2026-10-20T00:30:00.000Z");
    const errors = validarFormularioReserva({
      ...base,
      hoy: tardeBogota,
      checkIn: "2026-10-19",
    });
    expect(errors.checkIn).toBeUndefined();
  });

  it("rechaza el día anterior al calendario de Bogotá", () => {
    const tardeBogota = new Date("2026-10-20T00:30:00.000Z");
    const errors = validarFormularioReserva({
      ...base,
      hoy: tardeBogota,
      checkIn: "2026-10-18",
    });
    expect(errors.checkIn).toBeDefined();
  });
});
