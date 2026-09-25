import { Link } from "@tanstack/react-router";
import { Heart, Home, Map as MapIcon, PlusCircle, Star } from "lucide-react";
import type { ReactNode } from "react";
import {
  ETIQUETA_ESTADO,
  rangoPrecio,
  type EstadoInfo,
  type Restaurante,
} from "@/lib/guiame";

export function Marca() {
  return (
    <span className="serif text-[1.4rem] tracking-tight">
      GUÍA<span className="text-gold">·</span>ME
    </span>
  );
}

export function Shell({
  children,
  titulo,
  subtitulo,
}: {
  children: ReactNode;
  titulo?: string | undefined;
  subtitulo?: string | undefined;
}) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between px-5 py-4">
          <Link to="/">
            <Marca />
          </Link>
          <span className="eyebrow">Guía gastronómica</span>
        </div>
      </header>

      {titulo && (
        <div className="mx-auto max-w-3xl px-5 pt-8">
          <h1 className="text-[2rem] leading-[1.1]">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>}
          <div className="rule-gold mt-5" />
        </div>
      )}

      <main className="mx-auto max-w-3xl px-5">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-around px-4 py-2.5">
          <NavItem to="/" icon={<Home size={18} />} label="Inicio" />
          <NavItem to="/mapa" icon={<MapIcon size={18} />} label="Mapa" />
          <NavItem to="/favoritos" icon={<Heart size={18} />} label="Favoritos" />
          <NavItem to="/agregar" icon={<PlusCircle size={18} />} label="Agregar" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: "/" | "/mapa" | "/favoritos" | "/agregar";
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground"
      activeProps={{ className: "text-foreground" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      <span className="text-[0.62rem] uppercase tracking-[0.14em]">{label}</span>
    </Link>
  );
}

export function Chip({
  activo,
  children,
  onClick,
}: {
  activo?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={activo ? "chip-base chip-active" : "chip-base"}>
      {children}
    </button>
  );
}

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="py-5">
      <p className="eyebrow">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function EstadoBadge({ estado }: { estado: EstadoInfo }) {
  const tono =
    estado === "verificado"
      ? "border-green text-green"
      : estado === "comunidad"
        ? "border-gold text-gold"
        : "border-border text-muted-foreground";
  return (
    <span
      className={`inline-block border px-2 py-[2px] text-[0.6rem] uppercase tracking-[0.18em] ${tono}`}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export function Zagat({ r }: { r: Restaurante }) {
  const item = (etiqueta: string, valor: number | null) => (
    <div className="flex-1">
      <p className="eyebrow">{etiqueta}</p>
      <p className="serif mt-1 text-xl">
        {valor != null ? valor : "—"}
        <span className="text-sm text-muted-foreground">/30</span>
      </p>
    </div>
  );
  return (
    <div className="flex gap-4">
      {item("Food", r.food_avg)}
      {item("Decor", r.decor_avg)}
      {item("Service", r.service_avg)}
    </div>
  );
}

export function TarjetaRestaurante({
  r,
  match,
  zonaNombre,
  favorito,
  onFavorito,
}: {
  r: Restaurante;
  match?: number | undefined;
  zonaNombre?: string | undefined;
  favorito?: boolean | undefined;
  onFavorito?: (() => void) | undefined;
}) {
  return (
    <article className="border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          {match != null && (
            <p className="eyebrow text-gold">
              MATCH <span className="serif ml-1 text-lg text-foreground">{match}%</span>
            </p>
          )}
          <Link to="/restaurante/$id" params={{ id: r.id }}>
            <h3 className="mt-1 text-xl leading-snug">{r.nombre}</h3>
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {zonaNombre ? `${zonaNombre} · ` : ""}
            {r.cocina.join(" · ") || "Cocina pendiente"} · {rangoPrecio(r)}
          </p>
        </div>
        <button
          type="button"
          onClick={onFavorito}
          aria-label="Favorito"
          className={favorito ? "text-gold" : "text-muted-foreground"}
        >
          <Heart size={20} fill={favorito ? "currentColor" : "none"} />
        </button>
      </div>

      {r.imagen_url ? (
        <img src={r.imagen_url} alt={r.nombre} className="h-40 w-full object-cover" />
      ) : null}

      <div className="px-4 py-4">
        <Zagat r={r} />
        <div className="mt-4 flex items-center justify-between">
          <EstadoBadge estado={r.estado} />
          <Link
            to="/restaurante/$id"
            params={{ id: r.id }}
            className="text-[0.65rem] uppercase tracking-[0.18em] text-green"
          >
            Ver ficha
          </Link>
        </div>
      </div>
    </article>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-border px-5 py-10 text-center">
      <Star size={18} className="mx-auto text-gold" />
      <p className="mt-3 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
