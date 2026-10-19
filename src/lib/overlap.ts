/**
 * Dos reservas se solapan si entradaNueva < salidaExistente
 * y salidaNueva > entradaExistente.
 */
export function fechasSeSolapan(
  entradaNueva: Date,
  salidaNueva: Date,
  entradaExistente: Date,
  salidaExistente: Date,
): boolean {
  return (
    utcMs(entradaNueva) < utcMs(salidaExistente) &&
    utcMs(salidaNueva) > utcMs(entradaExistente)
  );
}

function utcMs(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}
