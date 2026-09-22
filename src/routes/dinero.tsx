import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, Boton, Campo, Etiqueta, Tarjeta, Vacio } from "@/components/AppShell";
import { fechaLarga, hoyISO, id, pesos, useStore } from "@/lib/store";

export const Route = createFileRoute("/dinero")({
  head: () => ({
    meta: [
      { title: "Dinero · AgenIA-UIB" },
      {
        name: "description",
        content:
          "Registra pagos realizados, ingresos y obligaciones por pagar con cuenta, categoría y comprobante.",
      },
      { property: "og:title", content: "Dinero · AgenIA-UIB" },
      {
        property: "og:description",
        content: "Cuentas, categorías y pagos pendientes separados de los pagos ya realizados.",
      },
    ],
  }),
  component: Dinero,
});

function Dinero() {
  const { estado, set } = useStore();
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [cuenta, setCuenta] = useState("Efectivo");
  const [categoria, setCategoria] = useState("General");
  const [tipo, setTipo] = useState<"gasto" | "ingreso">("gasto");

  const agregar = () => {
    const valor = Number(monto);
    if (!concepto.trim() || !Number.isFinite(valor) || valor <= 0) {
      toast.error("Necesito un concepto y un monto mayor a cero.");
      return;
    }
    set((a) => ({
      ...a,
      movimientos: [
        {
          id: id(),
          tipo,
          concepto,
          monto: valor,
          cuenta,
          categoria,
          fecha: hoyISO(),
          verificado: false,
          espacioId: a.espacios[0]?.id ?? "personal",
        },
        ...a.movimientos,
      ],
    }));
    setConcepto("");
    setMonto("");
    toast.success("Movimiento registrado");
  };

  const marcarPagado = (obligacionId: string) => {
    set((a) => {
      const o = a.obligaciones.find((x) => x.id === obligacionId);
      if (!o) return a;
      return {
        ...a,
        obligaciones: a.obligaciones.map((x) =>
          x.id === obligacionId ? { ...x, estado: "pagado" as const } : x,
        ),
        movimientos: [
          {
            id: id(),
            tipo: "gasto" as const,
            concepto: o.concepto,
            monto: o.monto,
            cuenta: o.cuenta || "Sin cuenta",
            categoria: "Obligaciones",
            fecha: hoyISO(),
            verificado: false,
            espacioId: o.espacioId,
          },
          ...a.movimientos,
        ],
      };
    });
    toast.success("Pago registrado y marcado como pagado");
  };

  const porCategoria = estado.movimientos
    .filter((m) => m.tipo === "gasto")
    .reduce<Record<string, number>>((acc, m) => {
      acc[m.categoria] = (acc[m.categoria] ?? 0) + m.monto;
      return acc;
    }, {});

  return (
    <AppShell
      titulo="Tu dinero, sin depender de la memoria"
      bajada="Los pagos realizados y las obligaciones por pagar se llevan por separado."
    >
      <Tarjeta>
        <Etiqueta>Registrar movimiento</Etiqueta>
        <div className="mt-3 flex gap-2">
          {(["gasto", "ingreso"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${tipo === t ? "bg-foreground text-primary-foreground" : "border border-border bg-background"}`}
            >
              {t === "gasto" ? "Pagué" : "Recibí"}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-3">
          <Campo
            etiqueta="Concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Internet, mercado, arriendo…"
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Monto"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="85000"
            />
            <Campo
              etiqueta="Cuenta"
              value={cuenta}
              onChange={(e) => setCuenta(e.target.value)}
            />
          </div>
          <Campo
            etiqueta="Categoría"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <Boton onClick={agregar} className="w-full">
            Guardar movimiento
          </Boton>
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Por pagar</Etiqueta>
        <div className="mt-3 space-y-2">
          {estado.obligaciones.filter((o) => o.estado === "pendiente").length ? (
            estado.obligaciones
              .filter((o) => o.estado === "pendiente")
              .map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{o.concepto}</p>
                    <span className="font-display text-sm font-semibold">{pesos(o.monto)}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {o.vence ? `Vence ${fechaLarga(o.vence)}` : "Sin fecha"}
                  </p>
                  <Boton
                    variante="borde"
                    onClick={() => marcarPagado(o.id)}
                    className="mt-2 w-full"
                  >
                    Ya lo pagué
                  </Boton>
                </div>
              ))
          ) : (
            <Vacio texto="Nada por pagar registrado." />
          )}
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Gasto por categoría</Etiqueta>
        <div className="mt-3 space-y-2">
          {Object.keys(porCategoria).length ? (
            Object.entries(porCategoria).map(([cat, total]) => (
              <div key={cat} className="flex items-center justify-between py-1.5">
                <span className="text-sm">{cat}</span>
                <span className="font-display text-sm font-semibold">{pesos(total)}</span>
              </div>
            ))
          ) : (
            <Vacio texto="Sin gastos registrados todavía." />
          )}
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Historial</Etiqueta>
        <div className="mt-3">
          {estado.movimientos.length ? (
            <ul className="divide-y divide-border">
              {estado.movimientos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.concepto}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fechaLarga(m.fecha)} · {m.cuenta} · {m.categoria} ·{" "}
                      {m.verificado ? "verificado" : "registrado por voz"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-display text-sm font-semibold ${m.tipo === "ingreso" ? "text-accent" : "text-foreground"}`}
                    >
                      {m.tipo === "ingreso" ? "+" : "−"}
                      {pesos(m.monto)}
                    </span>
                    <button
                      onClick={() =>
                        set((a) => ({
                          ...a,
                          movimientos: a.movimientos.map((x) =>
                            x.id === m.id ? { ...x, verificado: !x.verificado } : x,
                          ),
                        }))
                      }
                      className="block text-[10px] font-semibold text-primary"
                    >
                      {m.verificado ? "Quitar verificación" : "Marcar verificado"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="Aún no hay movimientos." />
          )}
        </div>
      </Tarjeta>
    </AppShell>
  );
}
