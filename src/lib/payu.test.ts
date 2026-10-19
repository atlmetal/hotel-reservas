import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  firmaConfirmacionPayu,
  firmaFormularioPayu,
  firmaRespuestaPayu,
  formatNewValueConfirmacion,
  formatNewValueRespuesta,
  mapearEstadoConfirmacionPayu,
  mapearEstadoConsultaPayu,
} from "./payu";

const apiKey = "4Vj8eK4rloUd272L48hsrarnUA";
const merchantId = "508029";

function md5(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex");
}

describe("formatNewValueRespuesta (F5, redondeo al par)", () => {
  it("redondea 150.25 a 150.2", () => {
    expect(formatNewValueRespuesta(150.25)).toBe("150.2");
  });

  it("redondea 150.35 a 150.4", () => {
    expect(formatNewValueRespuesta(150.35)).toBe("150.4");
  });

  it("formatea 180000.00 como 180000.0", () => {
    expect(formatNewValueRespuesta(180000.0)).toBe("180000.0");
    expect(formatNewValueRespuesta("180000.00")).toBe("180000.0");
  });
});

describe("formatNewValueConfirmacion (F6)", () => {
  it("usa un decimal si el segundo es cero", () => {
    expect(formatNewValueConfirmacion(150.0)).toBe("150.0");
    expect(formatNewValueConfirmacion("150.00")).toBe("150.0");
  });

  it("conserva dos decimales si el segundo no es cero", () => {
    expect(formatNewValueConfirmacion(150.25)).toBe("150.25");
  });
});

describe("firmaFormularioPayu (F4)", () => {
  it("firma con amount entero exactamente como se envía", () => {
    const referenceCode = "AUR-20261020-ABC123";
    const amount = 360000;
    const currency = "COP";
    const expected = md5(
      `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`,
    );
    expect(
      firmaFormularioPayu({
        apiKey,
        merchantId,
        referenceCode,
        amount,
        currency,
      }),
    ).toBe(expected);
  });
});

describe("firmaRespuestaPayu (F5)", () => {
  it("usa new_value con redondeo al par", () => {
    const referenceCode = "AUR-20261020-ABC123";
    const expected = md5(
      `${apiKey}~${merchantId}~${referenceCode}~150.2~COP~4`,
    );
    expect(
      firmaRespuestaPayu({
        apiKey,
        merchantId,
        referenceCode,
        txValue: 150.25,
        currency: "COP",
        transactionState: "4",
      }),
    ).toBe(expected);
  });

  it("firma 180000.0 para TX_VALUE entero", () => {
    const referenceCode = "AUR-20261020-ABC123";
    const expected = md5(
      `${apiKey}~${merchantId}~${referenceCode}~180000.0~COP~4`,
    );
    expect(
      firmaRespuestaPayu({
        apiKey,
        merchantId,
        referenceCode,
        txValue: 180000,
        currency: "COP",
        transactionState: "4",
      }),
    ).toBe(expected);
  });
});

describe("firmaConfirmacionPayu (F6)", () => {
  it("usa un decimal cuando el segundo es cero", () => {
    const referenceSale = "AUR-20261020-ABC123";
    const expected = md5(
      `${apiKey}~${merchantId}~${referenceSale}~180000.0~COP~4`,
    );
    expect(
      firmaConfirmacionPayu({
        apiKey,
        merchantId,
        referenceSale,
        value: 180000,
        currency: "COP",
        statePol: 4,
      }),
    ).toBe(expected);
  });

  it("conserva dos decimales cuando el segundo no es cero", () => {
    const referenceSale = "AUR-20261020-ABC123";
    const expected = md5(
      `${apiKey}~${merchantId}~${referenceSale}~150.25~COP~4`,
    );
    expect(
      firmaConfirmacionPayu({
        apiKey,
        merchantId,
        referenceSale,
        value: 150.25,
        currency: "COP",
        statePol: "4",
      }),
    ).toBe(expected);
  });
});

describe("mapearEstadoConsultaPayu (F5)", () => {
  it("mapea APPROVED a CONFIRMADA", () => {
    expect(mapearEstadoConsultaPayu("APPROVED")).toBe("CONFIRMADA");
  });

  it("mapea DECLINED, ERROR y EXPIRED a PAGO_RECHAZADO", () => {
    expect(mapearEstadoConsultaPayu("DECLINED")).toBe("PAGO_RECHAZADO");
    expect(mapearEstadoConsultaPayu("ERROR")).toBe("PAGO_RECHAZADO");
    expect(mapearEstadoConsultaPayu("EXPIRED")).toBe("PAGO_RECHAZADO");
  });

  it("no cambia nada con PENDING ni SUBMITTED", () => {
    expect(mapearEstadoConsultaPayu("PENDING")).toBeNull();
    expect(mapearEstadoConsultaPayu("SUBMITTED")).toBeNull();
  });
});

describe("mapearEstadoConfirmacionPayu (F6)", () => {
  it("mapea 4 a CONFIRMADA", () => {
    expect(mapearEstadoConfirmacionPayu(4)).toBe("CONFIRMADA");
    expect(mapearEstadoConfirmacionPayu("4")).toBe("CONFIRMADA");
  });

  it("mapea 5 y 6 a PAGO_RECHAZADO", () => {
    expect(mapearEstadoConfirmacionPayu(5)).toBe("PAGO_RECHAZADO");
    expect(mapearEstadoConfirmacionPayu(6)).toBe("PAGO_RECHAZADO");
  });

  it("no cambia con cualquier otro valor", () => {
    expect(mapearEstadoConfirmacionPayu(7)).toBeNull();
    expect(mapearEstadoConfirmacionPayu("1")).toBeNull();
  });
});
