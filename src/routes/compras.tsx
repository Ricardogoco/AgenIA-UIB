import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, Boton, Campo, Etiqueta, Tarjeta, Vacio } from "@/components/AppShell";
import { leerEnVozAlta } from "@/hooks/useVoz";
import { id, useStore } from "@/lib/store";

export const Route = createFileRoute("/compras")({
  head: () => ({
    meta: [
      { title: "Compras · AgenIA-UIB" },
      {
        name: "description",
        content:
          "Listas de compras por establecimiento con cantidades, marcado de productos y lectura en voz alta.",
      },
      { property: "og:title", content: "Compras · AgenIA-UIB" },
      {
        property: "og:description",
        content: "Pregunta qué te falta comprar y escucha la lista antes de entrar a la tienda.",
      },
    ],
  }),
  component: Compras;
});

function Compras() {
  const { estado, set } = useStore();
  const [tienda, setTienda] = useState("");
  const [nuevoItem, setNuevoItem] = useState<Record<string, string>>({});

  const crearLista = () => {
    if (!tienda.trim()) return;
    set((a) => ({
      ...a,
      compras: [{ id: id(), tienda, items: [] }, ...a.compras],
    }));
    setTienda("");
  };

  const agregarItem = (listaId: string) => {
    const texto = (nuevoItem[listaId] ?? "").trim();
    if (!texto) return;
    const coincide = texto.match(/^([\d.,]+\s*\w*)\s+(.*)$/);
    const cantidad = coincide?.[1]?.trim() ?? "1";
    const nombre = coincide?.[2]?.trim() ?? texto;
    set((a) => ({
      ...a,
      compras: a.compras.map((l) =>
        l.id === listaId
          ? { ...l, items: [...l.items, { id: id(), nombre, cantidad, comprado: false }] }
          : l,
      ),
    }));
    setNuevoItem((s) => ({ ...s, [listaId]: "" }));
  };

  const alternar = (listaId: string, itemId: string) =>
    set((a) => ({
      ...a,
      compras: a.compras.map((l) =>
        l.id === listaId
          ? {
              ...l,
              items: l.items.map((i) => (i.id === itemId ? { ...i, comprado: !i.comprado } : i)),
            }
          : l,
      ),
    }));

  return (
    <AppShell
      titulo="Lo que necesitas comprar"
      bajada="Dicta los productos y revisa o escucha la lista cuando llegues al negocio."
    >
      <Tarjeta>
        <Etiqueta>Nueva lista</Etiqueta>
        <div className="mt-3 space-y-3">
          <Campo
            etiqueta="Establecimiento"
            value={tienda}
            onChange={(e) => setTienda(e.target.value)}
            placeholder="Legumbrera, supermercado, farmacia…"
          />
          <Boton onClick={crearLista} className="w-full">
            Crear lista
          </Boton>
        </div>
      </Tarjeta>

      {estado.compras.length ? (
        estado.compras.map((l) => {
          const faltan = l.items.filter((i) => !i.comprado);
          return (
            <Tarjeta key={l.id}>
              <div className="flex items-center justify-between">
                <p className="font-display text-xl italic">{l.tienda}</p>
                <span className="text-xs text-muted-foreground">
                  {faltan.length} por comprar
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                {l.items.length ? (
                  l.items.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => alternar(l.id, i.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left"
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-md border ${i.comprado ? "border-accent bg-accent text-[10px] text-accent-foreground" : "border-input"}`}
                      >
                        {i.comprado ? "✓" : ""}
                      </span>
                      <span
                        className={`flex-1 text-sm ${i.comprado ? "text-muted-foreground line-through" : "font-medium"}`}
                      >
                        {i.cantidad} {i.nombre}
                      </span>
                    </button>
                  ))
                ) : (
                  <Vacio texto="Lista vacía. Agrega productos abajo o dicta con el botón de voz." />
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={nuevoItem[l.id] ?? ""}
                  onChange={(e) => setNuevoItem((s) => ({ ...s, [l.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") agregarItem(l.id);
                  }}
                  placeholder="2 kilos de papa"
                  className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
                />
                <Boton onClick={() => agregarItem(l.id)}>Añadir</Boton>
              </div>

              <div className="mt-2 flex gap-2">
                <Boton
                  variante="borde"
                  className="flex-1"
                  onClick={() => {
                    const texto = faltan.length
                      ? `En ${l.tienda} te falta: ${faltan.map((i) => `${i.cantidad} ${i.nombre}`).join(", ")}`
                      : `Ya compraste todo en ${l.tienda}`;
                    if (!leerEnVozAlta(texto)) toast.error("Este equipo no puede leer en voz alta.");
                  }}
                >
                  Léeme la lista
                </Boton>
                <Boton
                  variante="borde"
                  onClick={() =>
                    set((a) => ({ ...a, compras: a.compras.filter((x) => x.id !== l.id) }))
                  }
                >
                  Borrar
                </Boton>
              </div>
            </Tarjeta>
          );
        })
      ) : (
        <Tarjeta>
          <Vacio texto="Aún no tienes listas. Crea una o dicta: «Necesito dos kilos de papa y tres aguacates en la legumbrera»." />
        </Tarjeta>
      )}
    </AppShell>
  );
}
