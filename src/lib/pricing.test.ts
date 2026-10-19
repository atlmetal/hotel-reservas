import { describe, expect, it } from "vitest";
import { calcularNoches, calcularTotal } from "./pricing";

function d(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

describe("calcularNoches", () => {
  it("cuenta los días entre entrada y salida sin cobrar la noche de salida", () => {
    expect(calcularNoches(d("2026-10-20"), d("2026-10-21"))).toBe(1);
    expect(calcularNoches(d("2026-10-20"), d("2026-10-23"))).toBe(3);
  });

  it("devuelve 0 si entrada y salida son el mismo día", () => {
    expect(calcularNoches(d("2026-10-20"), d("2026-10-20"))).toBe(0);
  });

  it("maneja cruces de mes y año", () => {
    expect(calcularNoches(d("2026-10-30"), d("2026-11-02"))).toBe(3);
    expect(calcularNoches(d("2026-12-30"), d("2027-01-02"))).toBe(3);
  });
});

describe("calcularTotal", () => {
  it("multiplica noches por tarifa", () => {
    expect(calcularTotal(2, 180_000)).toBe(360_000);
    expect(calcularTotal(1, 420_000)).toBe(420_000);
  });

  it("devuelve 0 con cero noches", () => {
    expect(calcularTotal(0, 180_000)).toBe(0);
  });
});
