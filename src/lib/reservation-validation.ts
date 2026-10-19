import { calcularNoches } from "./pricing";

export type ReservationFormInput = {
  checkIn: string;
  checkOut: string;
  nombre: string;
  email: string;
  celular: string;
  huespedes: number;
  capacidad: number;
  /** Fecha de referencia “hoy” (YYYY-MM-DD o Date). Por defecto UTC de ahora. */
  hoy?: string | Date;
};

export type ReservationFieldErrors = Partial<
  Record<
    "checkIn" | "checkOut" | "nombre" | "email" | "celular" | "huespedes",
    string
  >
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CELULAR_RE = /^3\d{9}$/;
const MAX_NOCHES = 30;

/**
 * Validación del formulario de reserva (F2).
 * Devuelve un objeto de errores por campo (vacío si todo es válido).
 */
export function validarFormularioReserva(
  input: ReservationFormInput,
): ReservationFieldErrors {
  const errors: ReservationFieldErrors = {};
  const hoy = toDateOnlyString(input.hoy ?? new Date());

  const checkIn = input.checkIn?.trim() ?? "";
  const checkOut = input.checkOut?.trim() ?? "";

  if (!checkIn || !isValidDateString(checkIn)) {
    errors.checkIn = "La fecha de entrada no es válida";
  } else if (checkIn < hoy) {
    errors.checkIn = "La fecha de entrada debe ser igual o posterior a hoy";
  }

  if (!checkOut || !isValidDateString(checkOut)) {
    errors.checkOut = "La fecha de salida no es válida";
  } else if (checkIn && isValidDateString(checkIn) && checkOut <= checkIn) {
    errors.checkOut = "La fecha de salida debe ser posterior a la entrada";
  } else if (
    checkIn &&
    isValidDateString(checkIn) &&
    isValidDateString(checkOut)
  ) {
    const noches = calcularNoches(parseDateOnly(checkIn), parseDateOnly(checkOut));
    if (noches > MAX_NOCHES) {
      errors.checkOut = `El máximo de noches permitidas es ${MAX_NOCHES}`;
    }
  }

  const nombre = input.nombre?.trim() ?? "";
  if (nombre.length < 3 || nombre.length > 80) {
    errors.nombre = "El nombre debe tener entre 3 y 80 caracteres";
  }

  const email = input.email?.trim() ?? "";
  if (!EMAIL_RE.test(email)) {
    errors.email = "El correo no tiene un formato válido";
  }

  const celular = (input.celular ?? "").replace(/\s/g, "");
  if (!CELULAR_RE.test(celular)) {
    errors.celular =
      "El celular debe tener exactamente 10 dígitos y empezar por 3";
  }

  const huespedes = Number(input.huespedes);
  if (
    !Number.isInteger(huespedes) ||
    huespedes < 1 ||
    huespedes > input.capacidad
  ) {
    errors.huespedes = `Los huéspedes deben estar entre 1 y ${input.capacidad}`;
  }

  return errors;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseDateOnly(value);
  return toDateOnlyString(d) === value;
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateOnlyString(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
