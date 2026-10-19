import { fechaEnBogota } from "./dates";

const ALFANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Formato AUR-<AAAAMMDD>-<6 caracteres alfanuméricos> (fecha en Bogotá). */
export function generarReferencia(now: Date = new Date()): string {
  const yyyymmdd = fechaEnBogota(now).replaceAll("-", "");
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALFANUM[Math.floor(Math.random() * ALFANUM.length)]!;
  }
  return `AUR-${yyyymmdd}-${suffix}`;
}
