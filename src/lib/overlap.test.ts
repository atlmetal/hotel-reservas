import { describe, expect, it } from "vitest";
import { fechasSeSolapan } from "./overlap";

function d(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

describe("fechasSeSolapan", () => {
  it("detecta solapamiento parcial al inicio", () => {
    expect(
      fechasSeSolapan(d("2026-10-18"), d("2026-10-22"), d("2026-10-20"), d("2026-10-25")),
    ).toBe(true);
  });

  it("detecta solapamiento parcial al final", () => {
    expect(
      fechasSeSolapan(d("2026-10-22"), d("2026-10-28"), d("2026-10-20"), d("2026-10-25")),
    ).toBe(true);
  });

  it("detecta cuando la nueva envuelve a la existente", () => {
    expect(
      fechasSeSolapan(d("2026-10-18"), d("2026-10-28"), d("2026-10-20"), d("2026-10-25")),
    ).toBe(true);
  });

  it("detecta cuando la nueva queda dentro de la existente", () => {
    expect(
      fechasSeSolapan(d("2026-10-21"), d("2026-10-23"), d("2026-10-20"), d("2026-10-25")),
    ).toBe(true);
  });

  it("no solapa si la nueva termina el mismo día que empieza la existente (checkout = checkin)", () => {
    expect(
      fechasSeSolapan(d("2026-10-18"), d("2026-10-20"), d("2026-10-20"), d("2026-10-25")),
    ).toBe(false);
  });

  it("no solapa si la nueva empieza el mismo día que termina la existente", () => {
    expect(
      fechasSeSolapan(d("2026-10-25"), d("2026-10-28"), d("2026-10-20"), d("2026-10-25")),
    ).toBe(false);
  });

  it("no solapa rangos completamente separados", () => {
    expect(
      fechasSeSolapan(d("2026-10-10"), d("2026-10-12"), d("2026-10-20"), d("2026-10-25")),
    ).toBe(false);
  });
});
