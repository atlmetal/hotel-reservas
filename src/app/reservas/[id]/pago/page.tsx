import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { formatearCop } from "@/lib/format";
import { firmaFormularioPayu } from "@/lib/payu";
import { payuConfig } from "@/lib/payu-server";
import { prisma } from "@/lib/prisma";

export default function PagoPage(props: PageProps<"/reservas/[id]/pago">) {
  return (
    <Suspense fallback={<p>Cargando pago…</p>}>
      <PagoContent params={props.params} />
    </Suspense>
  );
}

async function PagoContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { room: true },
  });
  if (!reservation) notFound();

  if (reservation.estado === "CONFIRMADA") {
    redirect(`/reservas/${id}/resultado`);
  }

  // F4: la firma se calcula aquí con PAYU_API_KEY, que nunca llega al cliente.
  const payu = payuConfig();
  const amount = String(reservation.totalCop);
  const campos = {
    merchantId: payu.merchantId,
    accountId: payu.accountId,
    description: `Reserva ${reservation.referencia}: ${reservation.room.nombre}, ${reservation.noches} noches`,
    referenceCode: reservation.referencia,
    amount,
    tax: "0",
    taxReturnBase: "0",
    currency: "COP",
    signature: firmaFormularioPayu({
      apiKey: payu.apiKey,
      merchantId: payu.merchantId,
      referenceCode: reservation.referencia,
      amount,
      currency: "COP",
    }),
    test: payu.test,
    buyerEmail: reservation.email,
    buyerFullName: reservation.nombre,
    telephone: reservation.celular,
    responseUrl: `${payu.appUrl}/reservas/${id}/resultado`,
    confirmationUrl: `${payu.appUrl}/api/webhooks/payu`,
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Pago</h1>
      <dl className="space-y-3 border border-stone-200 bg-white p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Referencia</dt>
          <dd className="font-mono">{reservation.referencia}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Habitación</dt>
          <dd>{reservation.room.nombre}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Noches</dt>
          <dd>{reservation.noches}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Total</dt>
          <dd data-testid="total">{formatearCop(reservation.totalCop)}</dd>
        </div>
      </dl>
      <form method="post" action={payu.checkoutUrl}>
        {Object.entries(campos).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button
          type="submit"
          data-testid="pagar-payu"
          className="w-full bg-stone-900 px-4 py-3 text-sm font-medium text-white hover:bg-stone-800"
        >
          Pagar con PayU
        </button>
      </form>
      <aside className="space-y-2 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">Datos de prueba del sandbox de PayU</p>
        <p>
          Tarjeta Visa <span className="font-mono">4111 1111 1111 1111</span>,
          vencimiento en un año futuro.
        </p>
        <p>
          Para aprobar: nombre del tarjetahabiente{" "}
          <span className="font-mono">APPROVED</span>, CVV{" "}
          <span className="font-mono">777</span> y mes menor que 6.
        </p>
        <p>
          Para rechazar: nombre <span className="font-mono">REJECTED</span>,
          CVV <span className="font-mono">666</span> y mes mayor que 6.
        </p>
      </aside>
    </div>
  );
}
