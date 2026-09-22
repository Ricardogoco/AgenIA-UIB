import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { VoiceDock } from "./VoiceDock";

const secciones = [
  { to: "/", etiqueta: "Hoy" },
  { to: "/dinero", etiqueta: "Dinero" },
  { to: "/deudas", etiqueta: "Deudas" },
  { to: "/compras", etiqueta: "Compras" },
  { to: "/notas", etiqueta: "Notas" },
  { to: "/agenda", etiqueta: "Agenda" },
  { to: "/reuniones", etiqueta: "Reuniones" },
] as const;

export function AppShell({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[430px] pb-4">
        <header className="px-5 pt-6">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-lg italic text-muted-foreground">AgenIA-UIB</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tu asistente
            </p>
          </div>

          <nav className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {secciones.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="shrink-0 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-transform active:scale-95"
                activeOptions={{ exact: s.to === "/" }}
                activeProps={{
                  className:
                    "shrink-0 rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent",
                }}
              >
                {s.etiqueta}
              </Link>
            ))}
          </nav>

          <h1 className="mt-6 font-display text-[28px] italic leading-tight text-balance">
            {titulo}
          </h1>
          {bajada ? <p className="mt-1 text-sm text-muted-foreground">{bajada}</p> : null}
        </header>

        <main className="px-5 pt-4">{children}</main>
      </div>

      <VoiceDock />
    </div>
  );
}

export function Tarjeta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-warm rise-in mt-4 ${className}`}>{children}</section>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
      {texto}
    </p>
  );
}

export function Boton({
  children,
  onClick,
  variante = "principal",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: "principal" | "suave" | "borde";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const estilos = {
    principal: "bg-primary text-primary-foreground",
    suave: "bg-foreground text-primary-foreground",
    borde: "border border-border bg-background text-foreground",
  }[variante];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50 ${estilos} ${className}`}
    >
      {children}
    </button>
  );
}

export function Campo({
  etiqueta,
  ...props
}: { etiqueta: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {etiqueta}
      </span>
      <input
        {...props}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
