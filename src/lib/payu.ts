import { createHash } from "node:crypto";

export type ReservationEstado =
  | "PENDIENTE_PAGO"
  | "CONFIRMADA"
  | "PAGO_RECHAZADO";

/**
 * Firma del formulario de pago (F4).
 * MD5 de apiKey~merchantId~referenceCode~amount~currency
 * con amount exactamente como se envía (entero en pesos).
 */
export function firmaFormularioPayu(params: {
  apiKey: string;
  merchantId: string;
  referenceCode: string;
  amount: number | string;
  currency: string;
}): string {
  const amount = String(params.amount);
  const raw = [
    params.apiKey,
    params.merchantId,
    params.referenceCode,
    amount,
    params.currency,
  ].join("~");
  return md5(raw);
}

/**
 * Firma de la respuesta GET de PayU (F5).
 * MD5 de apiKey~merchantId~referenceCode~new_value~currency~transactionState
 * donde new_value es TX_VALUE redondeado a un decimal con redondeo al par
 * más cercano (banker's rounding).
 */
export function firmaRespuestaPayu(params: {
  apiKey: string;
  merchantId: string;
  referenceCode: string;
  txValue: number | string;
  currency: string;
  transactionState: string;
}): string {
  const newValue = formatNewValueRespuesta(params.txValue);
  const raw = [
    params.apiKey,
    params.merchantId,
    params.referenceCode,
    newValue,
    params.currency,
    params.transactionState,
  ].join("~");
  return md5(raw);
}

/**
 * Firma de la confirmación/webhook (F6).
 * MD5 de apiKey~merchant_id~reference_sale~new_value~currency~state_pol
 * donde new_value tiene un decimal si el segundo es cero (150.00 → 150.0)
 * y dos si no (150.25 → 150.25).
 */
export function firmaConfirmacionPayu(params: {
  apiKey: string;
  merchantId: string;
  referenceSale: string;
  value: number | string;
  currency: string;
  statePol: string | number;
}): string {
  const newValue = formatNewValueConfirmacion(params.value);
  const raw = [
    params.apiKey,
    params.merchantId,
    params.referenceSale,
    newValue,
    params.currency,
    String(params.statePol),
  ].join("~");
  return md5(raw);
}

/**
 * TX_VALUE → new_value para F5: un decimal, redondeo al par más cercano.
 * 150.25 → 150.2; 150.35 → 150.4; 180000.00 → 180000.0
 */
export function formatNewValueRespuesta(txValue: number | string): string {
  const rounded = roundHalfToEven(toNumber(txValue), 1);
  return rounded.toFixed(1);
}

/**
 * value → new_value para F6:
 * un decimal si el segundo es cero; dos si no.
 */
export function formatNewValueConfirmacion(value: number | string): string {
  const fixed2 = toNumber(value).toFixed(2);
  if (fixed2.endsWith("0")) {
    return fixed2.slice(0, -1);
  }
  return fixed2;
}

/**
 * Mapeo de transactionResponse.state (API de consultas / F5)
 * a estado de reserva. null = no cambiar.
 */
export function mapearEstadoConsultaPayu(
  state: string,
): ReservationEstado | null {
  switch (state) {
    case "APPROVED":
      return "CONFIRMADA";
    case "DECLINED":
    case "ERROR":
    case "EXPIRED":
      return "PAGO_RECHAZADO";
    case "PENDING":
    case "SUBMITTED":
      return null;
    default:
      return null;
  }
}

/**
 * Mapeo de state_pol (webhook F6) a estado de reserva.
 * 4 → CONFIRMADA; 5 y 6 → PAGO_RECHAZADO; otro → no cambiar.
 */
export function mapearEstadoConfirmacionPayu(
  statePol: string | number,
): ReservationEstado | null {
  switch (String(statePol)) {
    case "4":
      return "CONFIRMADA";
    case "5":
    case "6":
      return "PAGO_RECHAZADO";
    default:
      return null;
  }
}

function md5(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex");
}

function toNumber(value: number | string): number {
  if (typeof value === "number") return value;
  return Number(value);
}

/**
 * Redondeo half-to-even (al par más cercano) a `decimals` decimales.
 * Evita errores de punto flotante trabajando en enteros a partir del string.
 */
function roundHalfToEven(value: number, decimals: number): number {
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const factor = 10 ** decimals;
  // Trabajar con string para no perder el dígito de decisión por float
  const asFixed = abs.toFixed(decimals + 4);
  const [intPart, fracPart = ""] = asFixed.split(".");
  const keep = fracPart.slice(0, decimals);
  const rest = fracPart.slice(decimals);
  const decisionDigit = rest.charAt(0) || "0";
  const restTail = rest.slice(1).replace(/0+$/, "");

  let kept = Number(intPart + keep);
  const shouldBump =
    decisionDigit > "5" ||
    (decisionDigit === "5" && (restTail.length > 0 || kept % 2 !== 0));

  if (shouldBump) {
    kept += 1;
  }

  return (sign * kept) / factor;
}
