import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PlanCaptura } from "./ai.functions";

/* ---------------------------------- Tipos --------------------------------- */

export type Espacio = { id: string; nombre: string };

export type Tarea = {
  id: string;
  titulo: string;
  espacioId: string;
  hecho: boolean;
  fecha: string;
  hora: string;
  avisoMin: number;
  origen: string;
};

export type Cita = {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  avisoMin: number;
  lugar: string;
  espacioId: string;
};

export type Movimiento = {
  id: string;
  tipo: "gasto" | "ingreso";
  concepto: string;
  monto: number;
  cuenta: string;
  categoria: string;
  fecha: string;
  verificado: boolean;
  espacioId: string;
};

export type Obligacion = {
  id: string;
  concepto: string;
  monto: number;
  vence: string;
  estado: "pendiente" | "pagado";
  cuenta: string;
  espacioId: string;
};

export type Abono = { id: string; monto: number; fecha: string };

export type Deuda = {
  id: string;
  titulo: string;
  total: number;
  tipo: "debo" | "meDeben";
  abonos: Abono[];
  espacioId: string;
};

export type Arriendo = {
  id: string;
  inmueble: string;
  mes: string;
  esperado: number;
  pagado: number;
  cuenta: string;
  comprobante: string;
};

export type ItemCompra = {
  id: string;
  nombre: string;
  cantidad: string;
  comprado: boolean;
};

export type ListaCompra = { id: string; tienda: string; items: ItemCompra[] };

export type ItemNota = { id: string; texto: string; hecho: boolean };

export type Nota = {
  id: string;
  titulo: string;
  texto: string;
  items: ItemNota[];
  espacioId: string;
  fijada: boolean;
};

export type Compromiso = { titulo: string; responsable: string; fecha: string };

export type Reunion = {
  id: string;
  titulo: string;
  espacioId: string;
  fecha: string;
  duracionSeg: number;
  transcripcion: string;
  resumen: string;
  temas: { titulo: string; puntos: string[] }[];
  decisiones: string[];
  pendientes: string[];
  compromisos: Compromiso[];
  mapa: { centro: string; ramas: { titulo: string; hijos: string[] }[] };
  acta: string;
};

export type Estado = {
  espacios: Espacio[];
  tareas: Tarea[];
  citas: Cita[];
  movimientos: Movimiento[];
  obligaciones: Obligacion[];
  deudas: Deuda[];
  arriendos: Arriendo[];
  compras: ListaCompra[];
  notas: Nota[];
  reuniones: Reunion[];
};

const CLAVE = "agenia-uib-v1";

export const estadoInicial: Estado = {
  espacios: [
    { id: "personal", nombre: "Personal" },
    { id: "jac", nombre: "JAC" },
    { id: "fundacion", nombre: "Fundación" },
  ],
  tareas: [],
  citas: [],
  movimientos: [],
  obligaciones: [],
  deudas: [],
  arriendos: [],
  compras: [],
  notas: [],
  reuniones: [],
};

export const id = () => Math.random().toString(36).slice(2, 10);

/* -------------------------------- Contexto -------------------------------- */

type Ctx = {
  estado: Estado;
  listo: boolean;
  set: (actualizar: (anterior: Estado) => Estado) => void;
  aplicarPlan: (plan: PlanCaptura) => string[];
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado) setEstado({ ...estadoInicial, ...JSON.parse(guardado) });
    } catch {
      /* si el respaldo local está dañado empezamos en limpio */
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }, [estado, listo]);

  const set = useCallback((actualizar: (anterior: Estado) => Estado) => {
    setEstado((anterior) => actualizar(anterior));
  }, []);

  const aplicarPlan = useCallback(
    (plan: PlanCaptura) => {
      const creados: string[] = [];
      setEstado((anterior) => {
        const espacio =
          anterior.espacios.find(
            (e) => e.nombre.toLowerCase() === (plan.espacio || "").toLowerCase(),
          ) ?? anterior.espacios[0];
        const espacioId = espacio?.id ?? "personal";
        const siguiente: Estado = { ...anterior };

        if (plan.tareas.length) {
          siguiente.tareas = [
            ...plan.tareas.map((t) => ({
              id: id(),
              titulo: t.titulo,
              espacioId,
              hecho: false,
              fecha: t.fecha,
              hora: t.hora,
              avisoMin: t.avisoMin || 30,
              origen: "voz",
            })),
            ...anterior.tareas,
          ];
          creados.push(`${plan.tareas.length} pendiente(s)`);
        }

        if (plan.citas.length) {
          siguiente.citas = [
            ...plan.citas.map((c) => ({
              id: id(),
              titulo: c.titulo,
              fecha: c.fecha,
              hora: c.hora,
              avisoMin: c.avisoMin || 30,
              lugar: c.lugar,
              espacioId,
            })),
            ...anterior.citas,
          ];
          creados.push(`${plan.citas.length} cita(s) en la agenda`);
        }

        if (plan.movimientos.length) {
          siguiente.movimientos = [
            ...plan.movimientos.map((m) => ({
              id: id(),
              tipo: m.tipo === "ingreso" ? ("ingreso" as const) : ("gasto" as const),
              concepto: m.concepto,
              monto: m.monto,
              cuenta: m.cuenta || "Sin cuenta",
              categoria: m.categoria || "Sin categoría",
              fecha: m.fecha,
              verificado: false,
              espacioId,
            })),
            ...anterior.movimientos,
          ];
          creados.push(`${plan.movimientos.length} movimiento(s) de dinero`);
        }

        if (plan.obligaciones.length) {
          siguiente.obligaciones = [
            ...plan.obligaciones.map((o) => ({
              id: id(),
              concepto: o.concepto,
              monto: o.monto,
              vence: o.vence,
              estado: "pendiente" as const,
              cuenta: "",
              espacioId,
            })),
            ...anterior.obligaciones,
          ];
          creados.push(`${plan.obligaciones.length} pago(s) por pagar`);
        }

        if (plan.deudas.length) {
          siguiente.deudas = [
            ...plan.deudas.map((d) => ({
              id: id(),
              titulo: d.titulo,
              total: d.total,
              tipo: d.tipo === "meDeben" ? ("meDeben" as const) : ("debo" as const),
              abonos: [],
              espacioId,
            })),
            ...anterior.deudas,
          ];
          creados.push(`${plan.deudas.length} deuda(s)`);
        }

        if (plan.arriendos.length) {
          siguiente.arriendos = [
            ...plan.arriendos.map((a) => ({
              id: id(),
              inmueble: a.inmueble,
              mes: a.mes,
              esperado: a.esperado,
              pagado: a.pagado,
              cuenta: a.cuenta,
              comprobante: "",
            })),
            ...anterior.arriendos,
          ];
          creados.push(`${plan.arriendos.length} mensualidad(es) de arriendo`);
        }

        if (plan.compras.length) {
          let listas = [...anterior.compras];
          for (const c of plan.compras) {
            const tienda = c.tienda || "Compras";
            const existente = listas.find(
              (l) => l.tienda.toLowerCase() === tienda.toLowerCase(),
            );
            const nuevos = c.items.map((i) => ({
              id: id(),
              nombre: i.nombre,
              cantidad: i.cantidad,
              comprado: false,
            }));
            if (existente) {
              listas = listas.map((l) =>
                l.id === existente.id ? { ...l, items: [...l.items, ...nuevos] } : l,
              );
            } else {
              listas = [{ id: id(), tienda, items: nuevos }, ...listas];
            }
          }
          siguiente.compras = listas;
          const total = plan.compras.reduce((s, c) => s + c.items.length, 0);
          creados.push(`${total} producto(s) en compras`);
        }

        if (plan.notas.length) {
          siguiente.notas = [
            ...plan.notas.map((n) => ({
              id: id(),
              titulo: n.titulo,
              texto: n.texto,
              items: [],
              espacioId,
              fijada: false,
            })),
            ...anterior.notas,
          ];
          creados.push(`${plan.notas.length} nota(s)`);
        }

        return siguiente;
      });
      return creados;
    },
    [],
  );

  const valor = useMemo(() => ({ estado, listo, set, aplicarPlan }), [estado, listo, set, aplicarPlan]);

  return <StoreCtx.Provider value={valor}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

/* -------------------------------- Utilidades ------------------------------- */

export const pesos = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(valor) ? valor : 0);

export const hoyISO = () => new Date().toISOString().slice(0, 10);

export const fechaLarga = (iso: string) => {
  if (!iso) return "Sin fecha";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
};

export const saldoDeuda = (d: Deuda) =>
  Math.max(0, d.total - d.abonos.reduce((s, a) => s + a.monto, 0));

export function contextoParaAsistente(estado: Estado) {
  const linea = (t: string) => `- ${t}`;
  return [
    "MOVIMIENTOS:",
    ...estado.movimientos.map((m) =>
      linea(`${m.fecha} ${m.tipo} ${m.concepto} ${m.monto} cuenta:${m.cuenta} cat:${m.categoria}`),
    ),
    "POR PAGAR:",
    ...estado.obligaciones.map((o) => linea(`${o.concepto} ${o.monto} vence ${o.vence} ${o.estado}`)),
    "DEUDAS:",
    ...estado.deudas.map((d) => linea(`${d.titulo} total ${d.total} saldo ${saldoDeuda(d)} (${d.tipo})`)),
    "ARRIENDOS:",
    ...estado.arriendos.map((a) =>
      linea(`${a.inmueble} ${a.mes} esperado ${a.esperado} pagado ${a.pagado}`),
    ),
    "AGENDA:",
    ...estado.citas.map((c) => linea(`${c.fecha} ${c.hora} ${c.titulo} ${c.lugar}`)),
    "PENDIENTES:",
    ...estado.tareas.map((t) => linea(`${t.titulo} ${t.hecho ? "hecho" : "pendiente"} ${t.fecha}`)),
    "COMPRAS:",
    ...estado.compras.map((l) =>
      linea(
        `${l.tienda}: ${l.items.map((i) => `${i.cantidad} ${i.nombre}${i.comprado ? " (comprado)" : ""}`).join(", ")}`,
      ),
    ),
    "REUNIONES:",
    ...estado.reuniones.map((r) => linea(`${r.fecha} ${r.titulo}: ${r.resumen}`)),
  ].join("\n");
}
