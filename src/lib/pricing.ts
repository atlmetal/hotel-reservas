/** Noches = días entre entrada y salida; la noche de salida no se cobra. */
export function calcularNoches(checkIn: Date, checkOut: Date): number {
  const entrada = utcDateOnly(checkIn);
  const salida = utcDateOnly(checkOut);
  const ms = salida.getTime() - entrada.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Total = noches × tarifa por noche (COP entero). */
export function calcularTotal(noches: number, tarifaNocheCop: number): number {
  return noches * tarifaNocheCop;
}

function utcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
