import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
          Hotel Aurora
        </Link>
        <nav className="flex gap-4 text-sm text-stone-600">
          <Link href="/" className="hover:text-stone-900">
            Habitaciones
          </Link>
          <Link href="/reservas" className="hover:text-stone-900">
            Reservas
          </Link>
        </nav>
      </div>
    </header>
  );
}
