import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, Boton, Campo, Etiqueta, Tarjeta, Vacio } from "@/components/AppShell";
import { leerEnVozAlta } from "@/hooks/useVoz";
import { id, useStore } from "@/lib/store";

export const Route = createFileRoute("/notas")({
  head: () => ({
    meta: [
      { title: "Notas · AgenIA-UIB" },
      {
        name: "description",
        content:
          "Bloc de notas con texto libre, listas de chequeo, notas fijadas y lectura en voz alta.",
      },
      { property: "og:title", content: "Notas · AgenIA-UIB" },
      {
        property: "og:description",
        content: "Escribe o dicta una nota y conviértela en lista de chequeo cuando la necesites.",
      },
    ],
  }),
  component: Notas,
});

function Notas() {
  const { estado, set } = useStore();
  const [titulo, setTitulo] = useState("");
  const [nuevoPunto, setNuevoPunto] = useState<Record<string, string>>({});

  const crear = () => {
    if (!titulo.trim()) return;
    set((a) => ({
      ...a,
      notas: [
        {
          id: id(),
          titulo,
          texto: "",
          items: [],
          espacioId: a.espacios[0]?.id ?? "personal",
          fijada: false,
        },
        ...a.notas,
      ],
    }));
    setTitulo("");
  };

  const notasOrdenadas = [...estado.notas].sort(
    (a, b) => Number(b.fijada) - Number(a.fijada),
  );

  return (
    <AppShell
      titulo="Tu bloc de notas"
      bajada="Texto libre y listas con casillas, todo guardado en este equipo."
    >
      <Tarjeta>
        <Etiqueta>Nueva nota</Etiqueta>
        <div className="mt-3 space-y-3">
          <Campo
            etiqueta="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ideas para la JAC"
          />
          <Boton onClick={crear} className="w-full">
            Crear nota
          </Boton>
        </div>
      </Tarjeta>

      {notasOrdenadas.length ? (
        notasOrdenadas.map((n) => (
          <Tarjeta key={n.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-xl italic">{n.titulo}</p>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() =>
                    set((a) => ({
                      ...a,
                      notas: a.notas.map((x) =>
                        x.id === n.id ? { ...x, fijada: !x.fijada } : x,
                      ),
                    }))
                  }
                  className="text-[11px] font-semibold text-primary"
                >
                  {n.fijada ? "Quitar fijado" : "Fijar"}
                </button>
                <button
                  onClick={() =>
                    set((a) => ({ ...a, notas: a.notas.filter((x) => x.id !== n.id) }))
                  }
                  className="text-[11px] font-semibold text-muted-foreground"
                >
                  Borrar
                </button>
              </div>
            </div>

            <textarea
              value={n.texto}
              rows={3}
              onChange={(e) =>
                set((a) => ({
                  ...a,
                  notas: a.notas.map((x) =>
                    x.id === n.id ? { ...x, texto: e.target.value } : x,
                  ),
                }))
              }
              placeholder="Escribe o dicta aquí…"
              className="mt-3 w-full rounded-2xl border border-input bg-background p-3 text-base outline-none focus:border-primary"
            />

            <div className="mt-3 space-y-1.5">
              {n.items.map((i) => (
                <button
                  key={i.id}
                  onClick={() =>
                    set((a) => ({
                      ...a,
                      notas: a.notas.map((x) =>
                        x.id === n.id
                          ? {
                              ...x,
                              items: x.items.map((it) =>
                                it.id === i.id ? { ...it, hecho: !it.hecho } : it,
                              ),
                            }
                          : x,
                      ),
                    }))
                  }
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left"
                >
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-md border ${i.hecho ? "border-accent bg-accent text-[10px] text-accent-foreground" : "border-input"}`}
                  >
                    {i.hecho ? "✓" : ""}
                  </span>
                  <span className={`text-sm ${i.hecho ? "text-muted-foreground line-through" : ""}`}>
                    {i.texto}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={nuevoPunto[n.id] ?? ""}
                onChange={(e) => setNuevoPunto((s) => ({ ...s, [n.id]: e.target.value }))}
                placeholder="Añadir casilla"
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
              />
              <Boton
                onClick={() => {
                  const texto = (nuevoPunto[n.id] ?? "").trim();
                  if (!texto) return;
                  set((a) => ({
                    ...a,
                    notas: a.notas.map((x) =>
                      x.id === n.id
                        ? { ...x, items: [...x.items, { id: id(), texto, hecho: false }] }
                        : x,
                    ),
                  }));
                  setNuevoPunto((s) => ({ ...s, [n.id]: "" }));
                }}
              >
                Añadir
              </Boton>
            </div>

            <div className="mt-2 flex gap-2">
              <Boton
                variante="borde"
                className="flex-1"
                onClick={() => {
                  const texto = `${n.titulo}. ${n.texto}. ${n.items.filter((i) => !i.hecho).map((i) => i.texto).join(". ")}`;
                  if (!leerEnVozAlta(texto)) toast.error("Este equipo no puede leer en voz alta.");
                }}
              >
                Leer en voz alta
              </Boton>
              <Boton
                variante="borde"
                className="flex-1"
                onClick={() => {
                  if (!n.texto.trim()) {
                    toast.error("La nota no tiene texto para convertir.");
                    return;
                  }
                  set((a) => ({
                    ...a,
                    tareas: [
                      {
                        id: id(),
                        titulo: n.texto.slice(0, 120),
                        espacioId: n.espacioId,
                        hecho: false,
                        fecha: "",
                        hora: "",
                        avisoMin: 30,
                        origen: "nota",
                      },
                      ...a.tareas,
                    ],
                  }));
                  toast.success("Pendiente creado desde la nota");
                }}
              >
                Pasar a pendiente
              </Boton>
            </div>
          </Tarjeta>
        ))
      ) : (
        <Tarjeta>
          <Vacio texto="Todavía no tienes notas." />
        </Tarjeta>
      )}
    </AppShell>
  );
}
