import { transaccionMasReciente, type OrdenPayu } from "./payu";

/** Configuración de PayU leída del entorno. Solo se usa en el servidor. */
export function payuConfig() {
  const valor = (nombre: string) => {
    const v = process.env[nombre];
    if (!v) throw new Error(`${nombre} no está definida`);
    return v;
  };
  return {
    appUrl: valor("APP_URL").replace(/\/$/, ""),
    checkoutUrl: valor("PAYU_CHECKOUT_URL"),
    reportsUrl: valor("PAYU_REPORTS_URL"),
    apiKey: valor("PAYU_API_KEY"),
    apiLogin: valor("PAYU_API_LOGIN"),
    merchantId: valor("PAYU_MERCHANT_ID"),
    accountId: valor("PAYU_ACCOUNT_ID"),
    test: valor("PAYU_TEST"),
  };
}

/**
 * Consulta ORDER_DETAIL_BY_REFERENCE_CODE (F5) y devuelve la transacción más
 * reciente de la referencia, o null si PayU no tiene ninguna.
 */
export async function consultarTransaccionPayu(referencia: string) {
  const payu = payuConfig();
  const respuesta = await fetch(payu.reportsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      test: payu.test === "1",
      language: "es",
      command: "ORDER_DETAIL_BY_REFERENCE_CODE",
      merchant: { apiLogin: payu.apiLogin, apiKey: payu.apiKey },
      details: { referenceCode: referencia },
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`La API de consultas de PayU respondió HTTP ${respuesta.status}`);
  }
  const datos = (await respuesta.json()) as {
    code?: string;
    error?: string | null;
    result?: { payload?: OrdenPayu[] | null };
  };
  if (datos.code !== "SUCCESS") {
    throw new Error(`La API de consultas de PayU respondió ${datos.code}: ${datos.error}`);
  }
  return transaccionMasReciente(datos.result?.payload);
}
