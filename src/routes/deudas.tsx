import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, Boton, Campo, Etiqueta, Tarjeta, Vacio } from "@/components/AppShell";
import { hoyISO, id, pesos, saldoDeuda, useStore } from "@/lib/store";

export const Route = createFileRoute("/deudas")({
  head: () => ({
    meta: [
      { title: "Deudas y arriendos · AgenIA-UIB" },
      {
        name: "description",
        content:
          "Controla deudas con abonos parciales y las mensualidades de arriendo, con saldo y estado pendiente, parcial o pagado.",
      },
      { property: "og:title", content: "Deudas y arriendos · AgenIA-UIB" },
      {
        property: "og:description",
        content: "Cada mensualidad de arriendo se conserva aparte, con su saldo y su comprobante.",
      },
    ],
  }),
  component: Deudas,
});

function Deudas() {
  const { estado, set } = useStore();
  const [titulo, setTitulo] = useState("");
  const [total, setTotal] = useState("");
  const [inmueble, setInmueble] = useState("");
  const [mes, setMes] = useState("");
  const [esperado, setEsperado] = useState("");

  const crearDeuda = () => {
    const valor = Number(total);
    if (!titulo.trim() || !Number.isFinite(valor) || valor <= 0) {
      toast.error("Necesito a quién le debes y cuánto.");
      return;
    }
    set((a) => ({
      ...a,
      deudas: [
        {
          id: id(),
          titulo,
          total: valor,
          tipo: "debo" as const,
          abonos: [],
          espacioId: a.espacios[0]?.id ?? "personal",
        },
        ...a.deudas,
      ],
    }));
    setTitulo("");
    setTotal("");
  };

  const abonar = (deudaId: string) => {
    const texto = window.prompt("¿Cuánto abonaste?");
    if (!texto) return;
    const valor = Number(texto.replace(/[^\d]/g, ""));
    if (!valor) {
      toast.error("No entendí el monto del abono.");
      return;
    }
    set((a) => ({
      ...a,
      deudas: a.deudas.map((d) =>
        d.id === deudaId
          ? { ...d, abonos: [...d.abonos, { id: id(), monto: valor, fecha: hoyISO() }] }
          : d,
      ),
    }));
    toast.success("Abono registrado");
  };

  const crearMensualidad = () => {
    const valor = Number(esperado);
    if (!inmueble.trim() || !mes.trim() || !Number.isFinite(valor) || valor <= 0) {
      toast.error("Necesito inmueble, mes y valor esperado.");
      return;
    }
    set((a) => ({
      ...a,
      arriendos: [
        { id: id(), inmueble, mes, esperado: valor, pagado: 0, cuenta: "", comprobante: "" },
        ...a.arriendos,
      ],
    }));
    setInmueble("");
    setMes("");
    setEsperado("");
  };

  const pagarArriendo = (arriendoId: string) => {
    const texto = window.prompt("¿Cuánto pagaste de esta mensualidad?");
    if (!texto) return;
    const valor = Number(texto.replace(/[^\d]/g, ""));
    if (!valor) return;
    set((a) => {
      const arr = a.arriendos.find((x) => x.id === arriendoId);
      if (!arr) return a;
      return {
        ...a,
        arriendos: a.arriendos.map((x) =>
          x.id === arriendoId ? { ...x, pagado: x.pagado + valor } : x,
        ),
        movimientos: [
          {
            id: id(),
            tipo: "gasto" as const,
            concepto: `Arriendo ${arr.inmueble} ${arr.mes}`,
            monto: valor,
            cuenta: arr.cuenta || "Sin cuenta",
            categoria: "Arriendo",
            fecha: hoyISO(),
            verificado: false,
            espacioId: a.espacios[0]?.id ?? "personal",
          },
          ...a.movimientos,
        ],
      };
    });
    toast.success("Pago de arriendo registrado");
  };

  const estadoArriendo = (pagado: number, esperadoValor: number) =>
    pagado <= 0 ? "Pendiente" : pagado < esperadoValor ? "Parcial" : "Pagado";

  return (
    <AppShell
      titulo="Deudas y arriendos al día"
      bajada="Un abono reduce el saldo; nada se marca pagado por sí solo."
    >
      <Tarjeta>
        <Etiqueta>Nueva deuda</Etiqueta>
        <div className="mt-3 space-y-3">
          <Campo
            etiqueta="A quién / concepto"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Abuela, tarjeta, préstamo…"
          />
          <Campo
            etiqueta="Total"
            inputMode="numeric"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="20000"
          />
          <Boton onClick={crearDeuda} className="w-full">
            Guardar deuda
          </Boton>
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Tus deudas</Etiqueta>
        <div className="mt-3 space-y-3">
          {estado.deudas.length ? (
            estado.deudas.map((d) => {
              const saldo = saldoDeuda(d);
              const avance = d.total ? Math.min(100, ((d.total - saldo) / d.total) * 100) : 0;
              return (
                <div key={d.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{d.titulo}</p>
                    <span className="font-display text-base font-semibold">{pesos(saldo)}</span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${avance}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {saldo === 0 ? "Pagada" : `${Math.round(avance)}% pagado de ${pesos(d.total)}`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Boton variante="borde" onClick={() => abonar(d.id)} className="flex-1">
                      Registrar abono
                    </Boton>
                    <Boton
                      variante="borde"
                      onClick={() =>
                        set((a) => ({ ...a, deudas: a.deudas.filter((x) => x.id !== d.id) }))
                      }
                    >
                      Borrar
                    </Boton>
                  </div>
                </div>
              );
            })
          ) : (
            <Vacio texto="No tienes deudas registradas." />
          )}
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Arriendo · nueva mensualidad</Etiqueta>
        <div className="mt-3 space-y-3">
          <Campo
            etiqueta="Inmueble"
            value={inmueble}
            onChange={(e) => setInmueble(e.target.value)}
            placeholder="Apartamento 301"
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Mes"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              placeholder="Septiembre"
            />
            <Campo
              etiqueta="Valor esperado"
              inputMode="numeric"
              value={esperado}
              onChange={(e) => setEsperado(e.target.value)}
              placeholder="1200000"
            />
          </div>
          <Boton onClick={crearMensualidad} className="w-full">
            Guardar mensualidad
          </Boton>
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Mensualidades</Etiqueta>
        <div className="mt-3 space-y-3">
          {estado.arriendos.length ? (
            estado.arriendos.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {a.inmueble} · {a.mes}
                  </p>
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent">
                    {estadoArriendo(a.pagado, a.esperado)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Esperado {pesos(a.esperado)} · pagado {pesos(a.pagado)} · saldo{" "}
                  {pesos(Math.max(0, a.esperado - a.pagado))}
                </p>
                <Boton
                  variante="borde"
                  onClick={() => pagarArriendo(a.id)}
                  className="mt-3 w-full"
                >
                  Registrar pago
                </Boton>
              </div>
            ))
          ) : (
            <Vacio texto="Aún no registras mensualidades de arriendo." />
          )}
        </div>
      </Tarjeta>
    </AppShell>
  );
}
