/** Formato de tarifa/total: "$180.000 COP" */
export function formatearCop(valor: number): string {
  return `$${valor.toLocaleString("es-CO")} COP`;
}

export function etiquetaEstado(
  estado: "PENDIENTE_PAGO" | "CONFIRMADA" | "PAGO_RECHAZADO",
): string {
  switch (estado) {
    case "PENDIENTE_PAGO":
      return "Pendiente de pago";
    case "CONFIRMADA":
      return "Confirmada";
    case "PAGO_RECHAZADO":
      return "Pago rechazado";
  }
}

export function claseEstado(
  estado: "PENDIENTE_PAGO" | "CONFIRMADA" | "PAGO_RECHAZADO",
): string {
  switch (estado) {
    case "PENDIENTE_PAGO":
      return "bg-amber-100 text-amber-900";
    case "CONFIRMADA":
      return "bg-emerald-100 text-emerald-900";
    case "PAGO_RECHAZADO":
      return "bg-red-100 text-red-900";
  }
}
