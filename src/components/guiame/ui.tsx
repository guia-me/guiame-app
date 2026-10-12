import { Link } from "@tanstack/react-router";
import { Heart, Home, Map, Plus, Star, ArrowRight, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { ETIQUETA_ESTADO, rangoPrecio, type EstadoInfo, type Restaurante } from "@/lib/guiame";

// Placeholder editorial: no sustituir una foto real por una imagen genérica de comida.
const NO_PHOTO_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'%3E%3Crect width='900' height='600' fill='%23f2eee4'/%3E%3Ccircle cx='450' cy='265' r='118' fill='none' stroke='%23c5a45f' stroke-width='4'/%3E%3Ccircle cx='450' cy='265' r='91' fill='none' stroke='%23c5a45f' stroke-width='2'/%3E%3Cpath d='M400 265h100M450 215v100' stroke='%2368725b' stroke-width='2'/%3E%3Ctext x='450' y='445' font-family='Georgia,serif' font-size='25' letter-spacing='5' text-anchor='middle' fill='%2312191b'%3EGU%C3%8DA%C2%B7ME%3C/text%3E%3Ctext x='450' y='482' font-family='Arial,sans-serif' font-size='15' letter-spacing='3' text-anchor='middle' fill='%236e6a61'%3EFOTOGRAF%C3%8DA PENDIENTE%3C/text%3E%3C/svg%3E";

export function imagenRestaurante(r: Restaurante, _index = 0) {
  return r.imagen_url || NO_PHOTO_IMAGE;
}

export function Marca() {
  return (
    <span className="gm-logo">
      GUÍA<span>·</span>ME
      <small>TU GUÍA DE RESTAURANTES</small>
    </span>
  );
}

export function Shell({
  children,
  titulo,
  subtitulo,
  home,
}: {
  children: ReactNode;
  titulo?: string;
  subtitulo?: string;
  home?: boolean;
}) {
  return (
    <div className={home ? "gm-app gm-home-shell" : "gm-app"}>
      <header className={home ? "gm-header gm-header-home" : "gm-header"}>
        <Link to="/" className="gm-header-logo" aria-label="Ir al inicio">
          <Marca />
        </Link>
        <Link to="/mapa" className="gm-header-map" aria-label="Abrir mapa">
          <Map size={20} />
        </Link>
      </header>

      {titulo ? (
        <div className="gm-page-heading">
          <h1>{titulo}</h1>
          {subtitulo ? <p>{subtitulo}</p> : null}
        </div>
      ) : null}

      <main className="gm-main">{children}</main>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="gm-bottom-nav">
      <NavItem to="/" icon={<Home size={19} />} label="Inicio" exact />
      <NavItem to="/mapa" icon={<Map size={19} />} label="Explorar" />
      <NavItem to="/favoritos" icon={<Heart size={19} />} label="Favoritos" />
      <NavItem to="/agregar" icon={<Plus size={19} />} label="Agregar" />
    </nav>
  );
}

function NavItem({
  to,
  icon,
  label,
  exact,
}: {
  to: "/" | "/mapa" | "/favoritos" | "/agregar";
  icon: ReactNode;
  label: string;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeProps={{ className: "gm-nav-item active" }}
      activeOptions={{ exact: !!exact }}
      className="gm-nav-item"
    >
      {icon}
      <span>{label}</span>
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
    <button type="button" onClick={onClick} className={activo ? "gm-chip active" : "gm-chip"}>
      {children}
    </button>
  );
}

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="gm-filter-section">
      <p className="gm-label">{label}</p>
      <div className="gm-chips">{children}</div>
    </section>
  );
}

export function EstadoBadge({ estado }: { estado: EstadoInfo }) {
  return <span className="gm-status">{ETIQUETA_ESTADO[estado]}</span>;
}

export function MatchBadge({ match }: { match: number }) {
  return (
    <div className="gm-match-badge">
      <strong>{match}%</strong>
      <span>MATCH</span>
    </div>
  );
}

export function Zagat({ r }: { r: Restaurante }) {
  const item = (label: string, value: number | null) => (
    <div>
      <span>{label}</span>
      <strong>{value != null ? value : "—"}</strong>
      <small>{value != null ? "/30" : ""}</small>
    </div>
  );
  return (
    <div className="gm-score-grid">
      {item("Comida", r.food_avg)}
      {item("Decoración", r.decor_avg)}
      {item("Servicio", r.service_avg)}
    </div>
  );
}

export function TarjetaRestaurante({
  r,
  match,
  zonaNombre,
  favorito,
  onFavorito,
  index = 0,
}: {
  r: Restaurante;
  match?: number;
  zonaNombre?: string;
  favorito?: boolean;
  onFavorito?: () => void;
  index?: number;
}) {
  return (
    <article className="gm-result-card">
      <Link to="/restaurante/$id" params={{ id: r.id }} className="gm-card-photo">
        <img src={imagenRestaurante(r, index)} alt={r.nombre} />
        {match != null ? <MatchBadge match={match} /> : null}
      </Link>

      <div className="gm-card-body">
        <div className="gm-card-title-row">
          <div>
            <Link to="/restaurante/$id" params={{ id: r.id }}>
              <h2>{r.nombre}</h2>
            </Link>
            <p className="gm-card-meta">
              {r.cocina.join(" · ") || "Gastronomía"} · {rangoPrecio(r)}
            </p>
            {zonaNombre ? (
              <p className="gm-card-zone">
                <MapPin size={12} /> {zonaNombre}
              </p>
            ) : null}
          </div>
          {onFavorito ? (
            <button
              type="button"
              className={favorito ? "gm-heart active" : "gm-heart"}
              onClick={onFavorito}
              aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Heart size={20} fill={favorito ? "currentColor" : "none"} />
            </button>
          ) : null}
        </div>
        <Zagat r={r} />
        <div className="gm-card-footer">
          <EstadoBadge estado={r.estado} />
          <Link to="/por-que/$id" params={{ id: r.id }} className="gm-text-link">
            ¿Por qué? <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <div className="gm-empty">
      <Star size={20} />
      <p>{children}</p>
    </div>
  );
}
