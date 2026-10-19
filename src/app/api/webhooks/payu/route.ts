import {
  firmaConfirmacionPayu,
  firmaValida,
  mapearEstadoConfirmacionPayu,
} from "@/lib/payu";
import { payuConfig } from "@/lib/payu-server";
import { prisma } from "@/lib/prisma";

function texto(cuerpo: string, status: number) {
  return new Response(cuerpo, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** URL de confirmación de PayU (F6): form-urlencoded, servidor a servidor. */
export async function POST(request: Request) {
  let datos: FormData;
  try {
    datos = await request.formData();
  } catch {
    return texto("El cuerpo debe ser application/x-www-form-urlencoded", 400);
  }
  const campo = (nombre: string) => String(datos.get(nombre) ?? "");

  const payu = payuConfig();
  const esperada = firmaConfirmacionPayu({
    apiKey: payu.apiKey,
    merchantId: campo("merchant_id"),
    referenceSale: campo("reference_sale"),
    value: campo("value"),
    currency: campo("currency"),
    statePol: campo("state_pol"),
  });
  if (
    campo("merchant_id") !== payu.merchantId ||
    !firmaValida(esperada, campo("sign"))
  ) {
    return texto("Firma inválida", 403);
  }

  const reservation = await prisma.reservation.findUnique({
    where: { referencia: campo("reference_sale") },
  });
  if (!reservation) {
    return texto("Reserva no encontrada", 404);
  }
  // Una confirmación firmada por otro monto o moneda no es el pago de esta reserva.
  if (
    campo("currency") !== "COP" ||
    Number(campo("value")) !== reservation.totalCop
  ) {
    return texto("El monto o la moneda no coinciden con la reserva", 400);
  }

  const estado = mapearEstadoConfirmacionPayu(campo("state_pol"));
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      payuTransactionId: campo("transaction_id") || reservation.payuTransactionId,
      ...(estado ? { estado } : {}),
    },
  });
  return texto("OK", 200);
}
