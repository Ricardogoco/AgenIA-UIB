import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell, Boton, Campo, Etiqueta, Tarjeta, Vacio } from "@/components/AppShell";
import { fechaLarga, id, useStore } from "@/lib/store";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · AgenIA-UIB" },
      {
        name: "description",
        content:
          "Citas con fecha, hora, lugar y aviso previo configurable, más los pendientes que puedes marcar como hechos.",
      },
      { property: "og:title", content: "Agenda · AgenIA-UIB" },
      {
        property: "og:description",
        content: "Programa una cita con su aviso previo y recibe el recordatorio a tiempo.",
      },
    ],
  }),
  component: Agenda,
});

function Agenda() {
  const { estado, set } = useStore();
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [avisoMin, setAvisoMin] = useState("30");
  const avisados = useRef<Set<string>>(new Set());

  // Aviso previo mientras la app está abierta.
  useEffect(() => {
    const revisar = () => {
      const ahora = Date.now();
      for (const c of estado.citas) {
        if (!c.fecha || !c.hora || avisados.current.has(c.id)) continue;
        const inicio = new Date(`${c.fecha}T${c.hora}`).getTime();
        if (Number.isNaN(inicio)) continue;
        const aviso = inicio - (c.avisoMin || 30) * 60000;
        if (ahora >= aviso && ahora < inicio) {
          avisados.current.add(c.id);
          toast(`Falta poco: ${c.titulo}`, {
            description: `${fechaLarga(c.fecha)} · ${c.hora}${c.lugar ? ` · ${c.lugar}` : ""}`,
          });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("AgenIA-UIB", { body: `Falta poco: ${c.titulo}` });
          }
        }
      }
    };
    revisar();
    const reloj = window.setInterval(revisar, 30000);
    return () => window.clearInterval(reloj);
  }, [estado.citas]);

  const crear = () => {
    if (!titulo.trim() || !fecha) {
      toast.error("Necesito al menos el título y la fecha.");
      return;
    }
    set((a) => ({
      ...a,
      citas: [
        {
          id: id(),
          titulo,
          fecha,
          hora,
          lugar,
          avisoMin: Number(avisoMin) || 30,
          espacioId: a.espacios[0]?.id ?? "personal",
        },
        ...a.citas,
      ],
    }));
    setTitulo("");
    setHora("");
    setLugar("");
    toast.success("Cita guardada con su aviso previo");
  };

  const citas = [...estado.citas].sort((a, b) =>
    `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`),
  );

  return (
    <AppShell
      titulo="Agenda y recordatorios"
      bajada="Fecha, hora y aviso previo. Los avisos llegan con la app abierta."
    >
      <Tarjeta>
        <Etiqueta>Nueva cita</Etiqueta>
        <div className="mt-3 space-y-3">
          <Campo
            etiqueta="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Reunión con Luisa"
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <Campo etiqueta="Hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <Campo etiqueta="Lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} />
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Avisarme antes
            </span>
            <select
              value={avisoMin}
              onChange={(e) => setAvisoMin(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
            >
              <option value="10">10 minutos antes</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
              <option value="1440">1 día antes</option>
            </select>
          </label>
          <Boton onClick={crear} className="w-full">
            Guardar cita
          </Boton>
          <Boton
            variante="borde"
            className="w-full"
            onClick={() => {
              if (typeof Notification === "undefined") {
                toast.error("Este equipo no permite avisos del navegador.");
                return;
              }
              void Notification.requestPermission().then((p) =>
                p === "granted"
                  ? toast.success("Avisos activados")
                  : toast.error("No autorizaste los avisos"),
              );
            }}
          >
            Activar avisos en este equipo
          </Boton>
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Citas guardadas</Etiqueta>
        <div className="mt-3 space-y-2">
          {citas.length ? (
            citas.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{c.titulo}</p>
                  <button
                    onClick={() =>
                      set((a) => ({ ...a, citas: a.citas.filter((x) => x.id !== c.id) }))
                    }
                    className="text-[11px] font-semibold text-muted-foreground"
                  >
                    Borrar
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {fechaLarga(c.fecha)} {c.hora} · aviso {c.avisoMin} min antes
                  {c.lugar ? ` · ${c.lugar}` : ""}
                </p>
              </div>
            ))
          ) : (
            <Vacio texto="No tienes citas guardadas." />
          )}
        </div>
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Pendientes</Etiqueta>
        <div className="mt-3 space-y-1.5">
          {estado.tareas.length ? (
            estado.tareas.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  set((a) => ({
                    ...a,
                    tareas: a.tareas.map((x) => (x.id === t.id ? { ...x, hecho: !x.hecho } : x)),
                  }))
                }
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left"
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-md border ${t.hecho ? "border-accent bg-accent text-[10px] text-accent-foreground" : "border-input"}`}
                >
                  {t.hecho ? "✓" : ""}
                </span>
                <span className="flex-1">
                  <span className={`block text-sm ${t.hecho ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {t.titulo}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {t.fecha ? fechaLarga(t.fecha) : "Sin fecha"}
                    {t.hora ? ` · ${t.hora}` : ""}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <Vacio texto="Sin pendientes registrados." />
          )}
        </div>
      </Tarjeta>
    </AppShell>
  );
}
