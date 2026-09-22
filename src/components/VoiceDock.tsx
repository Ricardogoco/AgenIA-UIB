import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { useVoz } from "@/hooks/useVoz";
import { consultarAsistente, interpretarCaptura, type PlanCaptura } from "@/lib/ai.functions";
import { contextoParaAsistente, hoyISO, pesos, useStore } from "@/lib/store";

import { Boton } from "./AppShell";

type Modo = "capturar" | "preguntar";

export function VoiceDock() {
  const { estado, aplicarPlan } = useStore();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>("capturar");
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [plan, setPlan] = useState<PlanCaptura | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const { soportado, escuchando, iniciar, detener } = useVoz(setTexto);

  const interpretar = useServerFn(interpretarCaptura);
  const consultar = useServerFn(consultarAsistente);

  const cerrar = () => {
    detener();
    setAbierto(false);
    setPlan(null);
    setRespuesta("");
    setTexto("");
  };

  const enviar = async () => {
    if (!texto.trim()) return;
    detener();
    setCargando(true);
    try {
      if (modo === "capturar") {
        const resultado = await interpretar({
          data: {
            texto,
            espacios: estado.espacios.map((e) => e.nombre),
            hoy: hoyISO(),
          },
        });
        setPlan(resultado);
      } else {
        const resultado = await consultar({
          data: { pregunta: texto, contexto: contextoParaAsistente(estado) },
        });
        setRespuesta(resultado);
      }
    } catch {
      toast.error("No pude procesar eso. Tu texto sigue aquí para reintentar.");
    } finally {
      setCargando(false);
    }
  };

  const guardar = () => {
    if (!plan) return;
    const creados = aplicarPlan(plan);
    toast.success(creados.length ? `Guardado: ${creados.join(", ")}` : "Nada que guardar");
    cerrar();
  };

  return (
    <>
      <div className="sticky bottom-0 mt-6 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[390px] items-center gap-4 rounded-[28px] bg-foreground p-3 ring-hair">
          <button
            onClick={() => {
              setAbierto(true);
              setModo("capturar");
              if (soportado) iniciar(texto);
            }}
            aria-label="Hablar para anotar"
            className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-primary"
          >
            <span className="absolute inset-0 animate-[listen_2s_var(--ease-soft)_infinite] rounded-full bg-primary" />
            <span className="relative flex items-center gap-1">
              <span className="block h-3 w-1 rounded-full bg-primary-foreground" />
              <span className="block h-5 w-1 rounded-full bg-primary-foreground" />
              <span className="block h-3 w-1 rounded-full bg-primary-foreground" />
            </span>
          </button>
          <button
            onClick={() => {
              setAbierto(true);
              setModo("capturar");
            }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
              Cuéntame qué pasó
            </p>
            <p className="truncate text-sm font-medium italic text-primary-foreground">
              «Pagué el arriendo de septiembre desde ahorros»
            </p>
          </button>
          <button
            onClick={() => {
              setAbierto(true);
              setModo("preguntar");
            }}
            aria-label="Preguntar al asistente"
            className="mr-1 grid size-9 shrink-0 place-items-center rounded-full border border-primary-foreground/20 text-sm font-semibold text-primary-foreground/70"
          >
            ?
          </button>
        </div>
      </div>

      {abierto ? (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/40 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-background p-5 pb-8">
            <div className="mx-auto max-w-[390px]">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setModo("capturar")}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${modo === "capturar" ? "bg-foreground text-primary-foreground" : "border border-border bg-surface"}`}
                  >
                    Anotar
                  </button>
                  <button
                    onClick={() => setModo("preguntar")}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${modo === "preguntar" ? "bg-foreground text-primary-foreground" : "border border-border bg-surface"}`}
                  >
                    Preguntar
                  </button>
                </div>
                <button onClick={cerrar} className="text-sm font-semibold text-muted-foreground">
                  Cerrar
                </button>
              </div>

              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                placeholder={
                  modo === "capturar"
                    ? "Dicta o escribe: «Anota en personal que debo visitar a mi abuela y pagarle los 20 mil que le debo»"
                    : "¿Pagué el arriendo de septiembre? ¿Qué me falta comprar?"
                }
                className="mt-4 w-full rounded-2xl border border-input bg-surface p-4 text-base outline-none focus:border-primary"
              />

              <div className="mt-3 flex gap-2">
                {soportado ? (
                  <Boton
                    variante={escuchando ? "principal" : "borde"}
                    onClick={() => (escuchando ? detener() : iniciar(texto))}
                    className="flex-1"
                  >
                    {escuchando ? "Detener dictado" : "Dictar con la voz"}
                  </Boton>
                ) : null}
                <Boton variante="suave" onClick={enviar} disabled={cargando} className="flex-1">
                  {cargando ? "Procesando…" : modo === "capturar" ? "Revisar" : "Preguntar"}
                </Boton>
              </div>

              {!soportado ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Este navegador no permite dictado. Puedes escribirlo y funciona igual.
                </p>
              ) : null}

              {respuesta ? (
                <div className="mt-4 rounded-2xl bg-accent-soft p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                    Respuesta
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{respuesta}</p>
                </div>
              ) : null}

              {plan ? <RevisionPlan plan={plan} onGuardar={guardar} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Fila({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm font-medium">{titulo}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{detalle}</span>
    </li>
  );
}

function RevisionPlan({ plan, onGuardar }: { plan: PlanCaptura; onGuardar: () => void }) {
  const nada =
    !plan.tareas.length &&
    !plan.citas.length &&
    !plan.movimientos.length &&
    !plan.obligaciones.length &&
    !plan.deudas.length &&
    !plan.arriendos.length &&
    !plan.compras.length &&
    !plan.notas.length;

  return (
    <div className="mt-4 rounded-[24px] bg-surface p-4 ring-hair">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        Revisa antes de guardar
      </p>
      <p className="mt-2 font-display text-lg italic leading-snug">{plan.entendido}</p>
      <p className="mt-1 text-xs text-muted-foreground">Espacio: {plan.espacio || "Personal"}</p>

      <ul className="mt-3">
        {plan.citas.map((c, i) => (
          <Fila
            key={`c${i}`}
            titulo={`Agenda · ${c.titulo}`}
            detalle={`${c.fecha || "sin fecha"} ${c.hora || ""} · aviso ${c.avisoMin || 30} min`}
          />
        ))}
        {plan.tareas.map((t, i) => (
          <Fila key={`t${i}`} titulo={`Pendiente · ${t.titulo}`} detalle={t.fecha || "sin fecha"} />
        ))}
        {plan.movimientos.map((m, i) => (
          <Fila
            key={`m${i}`}
            titulo={`${m.tipo === "ingreso" ? "Ingreso" : "Pago realizado"} · ${m.concepto}`}
            detalle={`${pesos(m.monto)} · ${m.cuenta || "sin cuenta"}`}
          />
        ))}
        {plan.obligaciones.map((o, i) => (
          <Fila
            key={`o${i}`}
            titulo={`Por pagar · ${o.concepto}`}
            detalle={`${pesos(o.monto)} · vence ${o.vence || "sin fecha"}`}
          />
        ))}
        {plan.deudas.map((d, i) => (
          <Fila
            key={`d${i}`}
            titulo={`${d.tipo === "meDeben" ? "Me deben" : "Debo"} · ${d.titulo}`}
            detalle={pesos(d.total)}
          />
        ))}
        {plan.arriendos.map((a, i) => (
          <Fila
            key={`a${i}`}
            titulo={`Arriendo · ${a.inmueble} ${a.mes}`}
            detalle={`esperado ${pesos(a.esperado)} · pagado ${pesos(a.pagado)}`}
          />
        ))}
        {plan.compras.map((c, i) => (
          <Fila
            key={`s${i}`}
            titulo={`Compras · ${c.tienda}`}
            detalle={c.items.map((it) => `${it.cantidad} ${it.nombre}`).join(", ")}
          />
        ))}
        {plan.notas.map((n, i) => (
          <Fila key={`n${i}`} titulo={`Nota · ${n.titulo}`} detalle="guardada" />
        ))}
      </ul>

      {plan.preguntas.length ? (
        <div className="mt-3 rounded-2xl bg-caution-soft p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
            Falta confirmar
          </p>
          <ul className="mt-1 list-disc pl-4 text-sm">
            {plan.preguntas.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {nada ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No entendí un registro concreto. Ajusta la frase e inténtalo otra vez.
        </p>
      ) : (
        <Boton variante="principal" onClick={onGuardar} className="mt-4 w-full">
          Guardar todo
        </Boton>
      )}
    </div>
  );
}
