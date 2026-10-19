import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-stone-600">
        No encontramos lo que buscas.
      </p>
      <Link
        href="/"
        className="inline-flex text-sm font-medium text-stone-900 underline underline-offset-2"
      >
        Ir al catálogo
      </Link>
    </div>
  );
}
