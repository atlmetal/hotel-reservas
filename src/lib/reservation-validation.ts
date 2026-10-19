import { fechaEnBogota, parseDateOnly } from "./dates";
import { calcularNoches } from "./pricing";

export type ReservationFormInput = {
  checkIn: string;
  checkOut: string;
  nombre: string;
  email: string;
  celular: string;
  huespedes: number;
  capacidad: number;
  /**
   * Fecha de referencia “hoy” (YYYY-MM-DD o Date).
   * Si es Date u omitida, se interpreta en America/Bogota.
   */
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
  const hoy = resolverHoy(input.hoy);

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

function resolverHoy(hoy: string | Date | undefined): string {
  if (typeof hoy === "string") {
    return hoy.slice(0, 10);
  }
  return fechaEnBogota(hoy ?? new Date());
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseDateOnly(value);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` === value;
}
