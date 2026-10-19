import { claseEstado, etiquetaEstado } from "@/lib/format";

type Estado = "PENDIENTE_PAGO" | "CONFIRMADA" | "PAGO_RECHAZADO";

export function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span
      data-testid="estado-reserva"
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${claseEstado(estado)}`}
    >
      {etiquetaEstado(estado)}
    </span>
  );
}
