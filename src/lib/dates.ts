export const ZONA_HOTEL = "America/Bogota";

/**
 * Fecha calendario (YYYY-MM-DD) en la zona del hotel.
 * Misma lógica en cliente y servidor.
 */
export function fechaEnBogota(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HOTEL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Interpreta YYYY-MM-DD como fecha calendario (UTC medianoche). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
