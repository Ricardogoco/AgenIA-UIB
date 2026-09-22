import { createFileRoute } from "@tanstack/react-router";

import { AppShell, Etiqueta, Tarjeta, Vacio } from "@/components/AppShell";
import { fechaLarga, hoyISO, pesos, saldoDeuda, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoy · AgenIA-UIB, tu asistente personal por voz" },
      {
        name: "description",
        content:
          "AgenIA-UIB reúne tus pendientes, pagos, deudas, compras y reuniones en una sola pantalla, con captura por voz.",
      },
      { property: "og:title", content: "Hoy · AgenIA-UIB" },
      {
        property: "og:description",
        content:
          "Dicta lo que pasó y AgenIA-UIB lo guarda donde corresponde: agenda, dinero, deudas, compras y notas.",
      },
    ],
  }),
  component: Hoy,
});

function Hoy() {
  const { estado } = useStore();
  const hoy = hoyISO();

  const ingresos = estado.movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((s, m) => s + m.monto, 0);
  const gastos = estado.movimientos
    .filter((m) => m.tipo === "gasto")
    .reduce((s, m) => s + m.monto, 0);

  const proximasCitas = [...estado.citas]
    .filter((c) => !c.fecha || c.fecha >= hoy)
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  const siguiente = proximasCitas[0];

  const porPagar = estado.obligaciones
    .filter((o) => o.estado === "pendiente")
    .sort((a, b) => a.vence.localeCompare(b.vence));

  const pendientes = estado.tareas.filter((t) => !t.hecho);
  const deudaTotal = estado.deudas
    .filter((d) => d.tipo === "debo")
    .reduce((s, d) => s + saldoDeuda(d), 0);
  const porComprar = estado.compras.reduce(
    (s, l) => s + l.items.filter((i) => !i.comprado).length,
    0,
  );

  return (
    <AppShell
      titulo={siguiente ? `Lo próximo: ${siguiente.titulo}` : "Cuéntame qué tienes por hacer"}
      bajada={
        siguiente
          ? `${fechaLarga(siguiente.fecha)} · ${siguiente.hora || "sin hora"}${siguiente.lugar ? ` · ${siguiente.lugar}` : ""}`
          : "Usa el botón de voz de abajo: una sola frase puede crear una cita, un pago y un pendiente."
      }
    >
      <Tarjeta>
        <div className="flex items-center justify-between rounded-2xl bg-foreground px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
              Saldo registrado
            </p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-primary-foreground">
              {pesos(ingresos - gastos)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-primary-foreground/70">Gastos</p>
            <p className="font-display text-lg text-primary-foreground">{pesos(gastos)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Deuda por pagar
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-caution">
              {pesos(deudaTotal)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Productos por comprar
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-accent">{porComprar}</p>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Próximos pagos</Etiqueta>
        <div className="mt-3 space-y-2">
          {porPagar.length ? (
            porPagar.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="grid size-9 place-items-center rounded-lg bg-caution/15 text-[10px] font-bold text-foreground">
                  {o.vence ? o.vence.slice(8, 10) : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{o.concepto}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {o.vence ? `Vence ${fechaLarga(o.vence)}` : "Sin fecha"}
                  </p>
                </div>
                <span className="font-display text-sm font-semibold">{pesos(o.monto)}</span>
              </div>
            ))
          ) : (
            <Vacio texto="No tienes pagos pendientes registrados." />
          )}
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Pendientes</Etiqueta>
        <div className="mt-3 space-y-2">
          {pendientes.length ? (
            pendientes.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm font-medium">{t.titulo}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t.fecha ? fechaLarga(t.fecha) : "Sin fecha"}
                  {t.hora ? ` · ${t.hora}` : ""}
                </p>
              </div>
            ))
          ) : (
            <Vacio texto="Sin pendientes por ahora." />
          )}
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Agenda próxima</Etiqueta>
        <div className="mt-3">
          {proximasCitas.length ? (
            <ul className="divide-y divide-border">
              {proximasCitas.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">{c.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    {fechaLarga(c.fecha)} {c.hora}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio texto="Aún no hay citas guardadas." />
          )}
        </div>
      </Tarjeta>
    </AppShell>
  );
}
