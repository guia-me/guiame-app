import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { EstadoBadge, Shell, Vacio, Zagat } from "@/components/guiame/ui";
import { alternarFavorito, leerFavoritos, rangoPrecio } from "@/lib/guiame";
import { aportesFichaQuery, evaluacionesQuery, restauranteQuery } from "@/lib/queries";

const MapView = lazy(() => import("@/components/guiame/MapView"));

export const Route = createFileRoute("/restaurante/$id")({
  head: () => ({
    meta: [
      { title: "Ficha del restaurante — GUÍA·ME" },
      {
        name: "description",
        content: "Food, Decor y Service sobre 30, precio, platos recomendados y lo que dice la comunidad.",
      },
      { property: "og:title", content: "Ficha del restaurante — GUÍA·ME" },
      { property: "og:description", content: "Datos objetivos y datos de comunidad, siempre diferenciados." },
    ],
  }),
  component: Detalle,
});

function Detalle() {
  const { id } = Route.useParams();
  const { data: r, isLoading } = useQuery(restauranteQuery(id));
  const { data: evals } = useQuery(evaluacionesQuery(id));
  const { data: aportes } = useQuery(aportesFichaQuery(id));
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => setFavs(leerFavoritos()), []);

  if (isLoading) return <Shell titulo="Cargando…">{null}</Shell>;
  if (!r) return <Shell titulo="No encontramos esa ficha">{<Vacio>Intenta desde el inicio.</Vacio>}</Shell>;

  const platos = mencionados((evals ?? []).map((e) => e.plato));
  const ambientes = mencionados((evals ?? []).map((e) => e.ambiente));
  const contextos = mencionados((evals ?? []).map((e) => e.con_quien));
  const favorito = favs.includes(r.id);

  return (
    <Shell>
      {r.imagen_url ? (
        <img src={r.imagen_url} alt={r.nombre} className="mt-6 h-52 w-full object-cover" />
      ) : null}

      <div className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[2rem] leading-[1.1]">{r.nombre}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {r.cocina.join(" · ") || "Cocina pendiente"} · {rangoPrecio(r)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Favorito"
            onClick={async () => setFavs(await alternarFavorito(r.id))}
            className={favorito ? "text-gold" : "text-muted-foreground"}
          >
            <Heart size={22} fill={favorito ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="mt-4">
          <EstadoBadge estado={r.estado} />
        </div>
        <div className="rule-gold mt-5" />
      </div>

      <section className="border-b border-border py-6">
        <p className="eyebrow">Valoración de comunidad</p>
        <div className="mt-3">
          <Zagat r={r} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {r.num_evaluaciones} evaluaciones de comunidad
          {r.pct_volveria != null ? ` · ${r.pct_volveria}% volvería` : ""}
          {r.pct_recomendaria != null ? ` · ${r.pct_recomendaria}% recomendaría` : ""}
        </p>
      </section>

      <section className="border-b border-border py-6">
        <p className="eyebrow">Información objetiva</p>
        <dl className="mt-3 space-y-2 text-sm">
          <Dato k="Dirección" v={r.direccion} />
          <Dato k="Horarios" v={r.horarios} />
          <Dato k="Teléfono" v={r.telefono} />
          <Dato k="Web" v={r.web} />
          <Dato k="Capacidad" v={r.capacidad_max ? `Hasta ${r.capacidad_max} personas` : null} />
          <Dato k="Fuente" v={r.fuente} />
        </dl>
      </section>

      <section className="border-b border-border py-6">
        <p className="eyebrow">La comunidad dice…</p>
        {platos.length + ambientes.length + contextos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aún no hay aportes de comunidad para este lugar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {platos.map(([v, n]) => (
              <li key={`p-${v}`}>Excelente plato: {v} <span className="text-muted-foreground">({n})</span></li>
            ))}
            {ambientes.map(([v, n]) => (
              <li key={`a-${v}`}>Ambiente {v.toLowerCase()} <span className="text-muted-foreground">({n})</span></li>
            ))}
            {contextos.map(([v, n]) => (
              <li key={`c-${v}`}>Muy bueno para ir con {v.toLowerCase()} <span className="text-muted-foreground">({n})</span></li>
            ))}
          </ul>
        )}
        {(aportes ?? []).length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            {(aportes ?? []).map((a) => (
              <li key={a.id}>
                <span className="eyebrow">{a.tipo}</span> — {a.valor}
                {a.comentario ? <span className="text-muted-foreground"> · {a.comentario}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-b border-border py-6">
        <p className="eyebrow">Comentarios de comunidad</p>
        <ul className="mt-3 space-y-4">
          {(evals ?? []).filter((e) => e.comentario).length === 0 && (
            <li className="text-sm text-muted-foreground">Todavía no hay comentarios.</li>
          )}
          {(evals ?? [])
            .filter((e) => e.comentario)
            .map((e) => (
              <li key={e.id} className="border-l border-gold pl-3 text-sm">
                <p>{e.comentario}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Food {e.food}/30 · Decor {e.decor}/30 · Service {e.service}/30
                  {e.con_quien ? ` · ${e.con_quien}` : ""}
                </p>
              </li>
            ))}
        </ul>
      </section>

      {r.lat != null && r.lng != null && (
        <section className="border-b border-border py-6">
          <p className="eyebrow">Ubicación</p>
          <div className="mt-3 border border-border">
            <ClientOnly fallback={<div className="h-[260px] bg-muted" />}>
              <Suspense fallback={<div className="h-[260px] bg-muted" />}>
                <MapView restaurantes={[r]} centro={[r.lat, r.lng]} zoom={15} alto={260} />
              </Suspense>
            </ClientOnly>
          </div>
        </section>
      )}

      <div className="grid gap-3 py-8 sm:grid-cols-2">
        <Link to="/evaluar/$id" params={{ id: r.id }} className="btn-primary w-full">
          Evaluar este lugar
        </Link>
        <Link to="/completar/$id" params={{ id: r.id }} className="btn-outline w-full">
          Completar ficha
        </Link>
      </div>
    </Shell>
  );
}

function Dato({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v ?? "Pendiente"}</dd>
    </div>
  );
}

function mencionados(valores: (string | null)[]): [string, number][] {
  const mapa = new Map<string, number>();
  for (const v of valores) {
    const s = (v ?? "").trim();
    if (!s) continue;
    mapa.set(s, (mapa.get(s) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}
