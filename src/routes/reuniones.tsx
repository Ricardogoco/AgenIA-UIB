import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, Boton, Campo, Etiqueta, Tarjeta, Vacio } from "@/components/AppShell";
import { useVoz } from "@/hooks/useVoz";
import { analizarReunion } from "@/lib/ai.functions";
import { fechaLarga, hoyISO, id, useStore, type Reunion } from "@/lib/store";

export const Route = createFileRoute("/reuniones")({
  head: () => ({
    meta: [
      { title: "Reuniones · AgenIA-UIB" },
      {
        name: "description",
        content:
          "Graba o importa una reunión y obtén transcripción, resumen, borrador de acta, compromisos y mapa mental.",
      },
      { property: "og:title", content: "Reuniones · AgenIA-UIB" },
      {
        property: "og:description",
        content:
          "De la grabación a los apuntes: temas, decisiones, pendientes y compromisos listos para tu agenda.",
      },
    ],
  }),
  component: Reuniones,
});

const pestanas = ["Resumen", "Transcripción", "Compromisos", "Mapa", "Acta"] as const;

function Reuniones() {
  const { estado, set } = useStore();
  const [titulo, setTitulo] = useState("");
  const [transcripcion, setTranscripcion] = useState("");
  const [segundos, setSegundos] = useState(0);
  const [analizando, setAnalizando] = useState(false);
  const { soportado, escuchando, iniciar, detener } = useVoz(setTranscripcion);
  const analizar = useServerFn(analizarReunion);

  useEffect(() => {
    if (!escuchando) return;
    const reloj = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(reloj);
  }, [escuchando]);

  const reloj = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  const procesar = async () => {
    if (!transcripcion.trim()) {
      toast.error("Primero graba o pega la transcripción de la reunión.");
      return;
    }
    detener();
    setAnalizando(true);
    try {
      const analisis = await analizar({ data: { transcripcion, titulo } });
      const reunion: Reunion = {
        id: id(),
        titulo: titulo || analisis.titulo,
        espacioId: estado.espacios[0]?.id ?? "personal",
        fecha: hoyISO(),
        duracionSeg: segundos,
        transcripcion,
        resumen: analisis.resumen,
        temas: analisis.temas,
        decisiones: analisis.decisiones,
        pendientes: analisis.pendientes,
        compromisos: analisis.compromisos,
        mapa: analisis.mapa,
        acta: analisis.acta,
      };
      set((a) => ({ ...a, reuniones: [reunion, ...a.reuniones] }));
      setTranscripcion("");
      setTitulo("");
      setSegundos(0);
      toast.success("Reunión procesada: resumen, compromisos y mapa listos");
    } catch {
      toast.error("No pude procesar la reunión. La transcripción sigue aquí.");
    } finally {
      setAnalizando(false);
    }
  };

  return (
    <AppShell
      titulo="Reuniones en apuntes"
      bajada="Graba la reunión o pega una transcripción; el resumen es un borrador que debes revisar."
    >
      <Tarjeta>
        <div className="flex items-center justify-between">
          <Etiqueta>Nueva reunión</Etiqueta>
          {escuchando ? (
            <span className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <span className="size-2 animate-pulse rounded-full bg-primary" /> {reloj}
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-3">
          <Campo
            etiqueta="Tema"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Asamblea JAC · presupuesto del parque"
          />
          <textarea
            value={transcripcion}
            onChange={(e) => setTranscripcion(e.target.value)}
            rows={6}
            placeholder="Aquí aparece lo que se va dictando, o pega una transcripción que ya tengas."
            className="w-full rounded-2xl border border-input bg-background p-3 text-base outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            {soportado ? (
              <Boton
                variante={escuchando ? "principal" : "borde"}
                className="flex-1"
                onClick={() => (escuchando ? detener() : iniciar(transcripcion))}
              >
                {escuchando ? "Detener grabación" : "Grabar reunión"}
              </Boton>
            ) : null}
            <Boton variante="suave" className="flex-1" onClick={procesar} disabled={analizando}>
              {analizando ? "Procesando…" : "Generar apuntes"}
            </Boton>
          </div>
          <p className="text-xs text-muted-foreground">
            La transcripción en vivo necesita la app abierta y la pantalla encendida. Para grabar con
            la pantalla bloqueada hace falta la versión instalable en el teléfono.
          </p>
        </div>
      </Tarjeta>

      {estado.reuniones.length ? (
        estado.reuniones.map((r) => <FichaReunion key={r.id} reunion={r} />)
      ) : (
        <Tarjeta>
          <Vacio texto="Todavía no tienes reuniones procesadas." />
        </Tarjeta>
      )}
    </AppShell>
  );
}

function FichaReunion({ reunion }: { reunion: Reunion }) {
  const { set } = useStore();
  const [pestana, setPestana] = useState<(typeof pestanas)[number]>("Resumen");

  const pasarAAgenda = (titulo: string, fecha: string) => {
    set((a) => ({
      ...a,
      tareas: [
        {
          id: id(),
          titulo,
          espacioId: reunion.espacioId,
          hecho: false,
          fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : "",
          hora: "",
          avisoMin: 30,
          origen: "reunión",
        },
        ...a.tareas,
      ],
    }));
    toast.success("Compromiso guardado en pendientes");
  };

  return (
    <Tarjeta>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl italic leading-snug">{reunion.titulo}</p>
          <p className="text-[11px] text-muted-foreground">
            {fechaLarga(reunion.fecha)} · {Math.round(reunion.duracionSeg / 60)} min
          </p>
        </div>
        <button
          onClick={() =>
            set((a) => ({ ...a, reuniones: a.reuniones.filter((x) => x.id !== reunion.id) }))
          }
          className="shrink-0 text-[11px] font-semibold text-muted-foreground"
        >
          Borrar
        </button>
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pestanas.map((p) => (
          <button
            key={p}
            onClick={() => setPestana(p)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${pestana === p ? "bg-foreground text-primary-foreground" : "border border-border bg-background"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {pestana === "Resumen" ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-accent-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Resumen
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{reunion.resumen}</p>
            </div>
            {reunion.temas.map((t, i) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">{t.titulo}</p>
                <ul className="mt-1.5 list-disc pl-4 text-sm text-muted-foreground">
                  {t.puntos.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
            {reunion.decisiones.length ? (
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">Decisiones</p>
                <ul className="mt-1.5 list-disc pl-4 text-sm">
                  {reunion.decisiones.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {reunion.pendientes.length ? (
              <div className="rounded-2xl bg-caution-soft p-4">
                <p className="text-sm font-semibold">Quedó pendiente</p>
                <ul className="mt-1.5 list-disc pl-4 text-sm">
                  {reunion.pendientes.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {pestana === "Transcripción" ? (
          <p className="whitespace-pre-wrap rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed">
            {reunion.transcripcion}
          </p>
        ) : null}

        {pestana === "Compromisos" ? (
          <div className="space-y-2">
            {reunion.compromisos.length ? (
              reunion.compromisos.map((c, i) => (
                <div key={i} className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">{c.titulo}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.responsable || "Sin responsable indicado"} ·{" "}
                    {c.fecha || "sin fecha indicada"}
                  </p>
                  <Boton
                    variante="borde"
                    className="mt-2 w-full"
                    onClick={() => pasarAAgenda(c.titulo, c.fecha)}
                  >
                    Pasar a pendientes
                  </Boton>
                </div>
              ))
            ) : (
              <Vacio texto="No se identificaron compromisos explícitos en el audio." />
            )}
          </div>
        ) : null}

        {pestana === "Mapa" ? (
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-center font-display text-lg italic">{reunion.mapa.centro}</p>
            <div className="mt-3 space-y-2">
              {reunion.mapa.ramas.map((rama, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-surface p-3"
                  style={{ animation: `nod 0.4s var(--ease-soft) ${0.1 * i}s both` }}
                >
                  <p className="text-sm font-semibold text-primary">{rama.titulo}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {rama.hijos.map((h, j) => (
                      <span
                        key={j}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {pestana === "Acta" ? (
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-caution">
              Borrador pendiente de revisión
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{reunion.acta}</p>
          </div>
        ) : null}
      </div>
    </Tarjeta>
  );
}
