import { describe, expect, it } from "vitest";
import { validarFormularioReserva } from "./reservation-validation";

const base = {
  checkIn: "2026-10-20",
  checkOut: "2026-10-22",
  nombre: "Ana Pérez",
  email: "ana@ejemplo.com",
  celular: "3001234567",
  huespedes: 2,
  capacidad: 2,
  hoy: "2026-10-19",
};

describe("validarFormularioReserva", () => {
  it("acepta un formulario válido sin errores", () => {
    expect(validarFormularioReserva(base)).toEqual({});
  });

  it("rechaza entrada anterior a hoy", () => {
    const errors = validarFormularioReserva({
      ...base,
      checkIn: "2026-10-18",
      checkOut: "2026-10-20",
    });
    expect(errors.checkIn).toBeDefined();
  });

  it("acepta entrada igual a hoy", () => {
    const errors = validarFormularioReserva({
      ...base,
      checkIn: "2026-10-19",
      checkOut: "2026-10-20",
    });
    expect(errors.checkIn).toBeUndefined();
  });

  it("rechaza salida anterior o igual a la entrada", () => {
    expect(
      validarFormularioReserva({ ...base, checkOut: "2026-10-20" }).checkOut,
    ).toBeDefined();
    expect(
      validarFormularioReserva({ ...base, checkOut: "2026-10-19" }).checkOut,
    ).toBeDefined();
  });

  it("rechaza más de 30 noches", () => {
    const errors = validarFormularioReserva({
      ...base,
      checkIn: "2026-10-20",
      checkOut: "2026-11-21", // 32 noches
    });
    expect(errors.checkOut).toMatch(/30/);
  });

  it("acepta exactamente 30 noches", () => {
    const errors = validarFormularioReserva({
      ...base,
      checkIn: "2026-10-20",
      checkOut: "2026-11-19", // 30 noches
    });
    expect(errors.checkOut).toBeUndefined();
  });

  it("valida longitud del nombre (3 a 80)", () => {
    expect(validarFormularioReserva({ ...base, nombre: "Ab" }).nombre).toBeDefined();
    expect(
      validarFormularioReserva({ ...base, nombre: "A".repeat(81) }).nombre,
    ).toBeDefined();
    expect(
      validarFormularioReserva({ ...base, nombre: "Ana" }).nombre,
    ).toBeUndefined();
  });

  it("rechaza correo inválido", () => {
    expect(
      validarFormularioReserva({ ...base, email: "sin-arroba" }).email,
    ).toBeDefined();
  });

  it("rechaza celular que no tenga 10 dígitos empezando por 3", () => {
    expect(
      validarFormularioReserva({ ...base, celular: "300123456" }).celular,
    ).toBeDefined(); // 9 dígitos
    expect(
      validarFormularioReserva({ ...base, celular: "2001234567" }).celular,
    ).toBeDefined();
    expect(
      validarFormularioReserva({ ...base, celular: "3001234567" }).celular,
    ).toBeUndefined();
  });

  it("rechaza huéspedes fuera de 1..capacidad", () => {
    expect(
      validarFormularioReserva({ ...base, huespedes: 0 }).huespedes,
    ).toBeDefined();
    expect(
      validarFormularioReserva({ ...base, huespedes: 3, capacidad: 2 }).huespedes,
    ).toBeDefined();
    expect(
      validarFormularioReserva({ ...base, huespedes: 2, capacidad: 2 }).huespedes,
    ).toBeUndefined();
  });
});
