"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { calcularNoches, calcularTotal } from "@/lib/pricing";
import { formatearCop } from "@/lib/format";
import { parseDateOnly } from "@/lib/dates";
import {
  type ReservationFieldErrors,
  validarFormularioReserva,
} from "@/lib/reservation-validation";

type Props = {
  roomSlug: string;
  capacidad: number;
  tarifaNocheCop: number;
  nombreHabitacion: string;
};

export function ReservationForm({
  roomSlug,
  capacidad,
  tarifaNocheCop,
  nombreHabitacion,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [huespedes, setHuespedes] = useState(1);
  const [errors, setErrors] = useState<ReservationFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resumen = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
      return null;
    }
    if (checkOut <= checkIn) return null;
    const noches = calcularNoches(parseDateOnly(checkIn), parseDateOnly(checkOut));
    if (noches < 1) return null;
    return {
      noches,
      total: calcularTotal(noches, tarifaNocheCop),
    };
  }, [checkIn, checkOut, tarifaNocheCop]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validarFormularioReserva({
      checkIn,
      checkOut,
      nombre,
      email,
      celular,
      huespedes,
      capacidad,
    });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomSlug,
            checkIn,
            checkOut,
            nombre,
            email,
            celular,
            huespedes,
          }),
        });

        const data = (await res.json()) as {
          id?: string;
          errors?: ReservationFieldErrors;
          error?: string;
        };

        if (res.status === 400 && data.errors) {
          setErrors(data.errors);
          return;
        }
        if (res.status === 404) {
          setFormError(data.error ?? "Habitación no encontrada");
          return;
        }
        if (res.status === 409) {
          setFormError(
            data.error ??
              "La habitación ya tiene una reserva confirmada en esas fechas",
          );
          return;
        }
        if (!res.ok || !data.id) {
          setFormError("No se pudo crear la reserva. Intenta de nuevo.");
          return;
        }

        router.push(`/reservas/${data.id}/pago`);
      } catch {
        setFormError("No se pudo crear la reserva. Intenta de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5" noValidate>
      <p className="text-sm text-stone-600">
        Reservando: <span className="font-medium text-stone-900">{nombreHabitacion}</span>
      </p>

      <Field
        id="checkIn"
        label="Fecha de entrada"
        error={errors.checkIn}
      >
        <input
          id="checkIn"
          type="date"
          data-testid="campo-checkIn"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full border border-stone-300 px-3 py-2"
        />
      </Field>

      <Field
        id="checkOut"
        label="Fecha de salida"
        error={errors.checkOut}
      >
        <input
          id="checkOut"
          type="date"
          data-testid="campo-checkOut"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full border border-stone-300 px-3 py-2"
        />
      </Field>

      <Field id="nombre" label="Nombre completo" error={errors.nombre}>
        <input
          id="nombre"
          type="text"
          data-testid="campo-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border border-stone-300 px-3 py-2"
          autoComplete="name"
        />
      </Field>

      <Field id="email" label="Correo" error={errors.email}>
        <input
          id="email"
          type="email"
          data-testid="campo-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-stone-300 px-3 py-2"
          autoComplete="email"
        />
      </Field>

      <Field id="celular" label="Celular" error={errors.celular}>
        <input
          id="celular"
          type="tel"
          data-testid="campo-celular"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          className="w-full border border-stone-300 px-3 py-2"
          autoComplete="tel"
          inputMode="numeric"
        />
      </Field>

      <Field id="huespedes" label="Número de huéspedes" error={errors.huespedes}>
        <input
          id="huespedes"
          type="number"
          min={1}
          max={capacidad}
          data-testid="campo-huespedes"
          value={huespedes}
          onChange={(e) => setHuespedes(Number(e.target.value))}
          className="w-full border border-stone-300 px-3 py-2"
        />
      </Field>

      {resumen ? (
        <div className="border border-stone-200 bg-white p-4 text-sm">
          <p>
            {resumen.noches} {resumen.noches === 1 ? "noche" : "noches"}
          </p>
          <p data-testid="total" className="mt-1 text-base font-semibold">
            Total: {formatearCop(resumen.total)}
          </p>
        </div>
      ) : null}

      {formError ? (
        <p className="text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="continuar-pago"
        disabled={isPending}
        className="w-full bg-stone-900 px-4 py-3 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {isPending ? "Creando reserva…" : "Continuar al pago"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
