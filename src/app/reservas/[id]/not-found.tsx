import Link from "next/link";

export default function ReservaNotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reserva no encontrada</h1>
      <p className="text-stone-600">
        No existe una reserva con ese identificador.
      </p>
      <Link
        href="/reservas"
        className="inline-flex text-sm font-medium text-stone-900 underline underline-offset-2"
      >
        Volver a la lista de reservas
      </Link>
    </div>
  );
}
