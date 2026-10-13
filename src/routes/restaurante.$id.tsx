import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, MapPin, Star } from "lucide-react";
import { MatchBadge, Zagat, Vacio, imagenRestaurante } from "@/components/guiame/ui";
import { alternarFavorito, calcularMatch, leerContexto, leerFavoritos, rangoPrecio, type Contexto } from "@/lib/guiame";
import { aportesFichaQuery, evaluacionesQuery, restauranteQuery } from "@/lib/queries";

export const Route = createFileRoute("/restaurante/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Ficha del restaurante — GUÍA·ME" }] }),
  component: Restaurante,
});

function Restaurante() {
  const { id } = Route.useParams();
  const [c, setC] = useState<Contexto | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"resumen" | "menu" | "opiniones">("resumen");
  useEffect(() => { setC(leerContexto()); setFavs(leerFavoritos()); }, []);

  const { data: r } = useQuery(restauranteQuery(id));
  const { data: evaluaciones } = useQuery(evaluacionesQuery(id));
  const { data: aportes } = useQuery(aportesFichaQuery(id));

  if (!r || !c) return <div className="gm-empty"><p>Cargando ficha…</p></div>;

  const match = calcularMatch(r, c).match;
  const latestComment = (evaluaciones ?? []).find((x:any) => String(x.comentario ?? "").trim())?.comentario;
  const dishes = (evaluaciones ?? []).map((x:any) => String(x.plato ?? "").trim()).filter(Boolean).slice(0,5);
  const favorite = favs.includes(r.id);

  return (
    <div className="gm-app">
      <div className="gm-detail">
        <div className="gm-detail-hero">
          <img src={imagenRestaurante(r)} alt={r.nombre} />
          <div className="gm-detail-topbar">
            <Link to="/matches" className="gm-icon-button" aria-label="Volver"><ArrowLeft size={18} /></Link>
            <button className="gm-icon-button" onClick={async () => setFavs(await alternarFavorito(r.id))} aria-label="Guardar">
              <Heart size={18} fill={favorite ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="gm-detail-copy">
            <div className="gm-match-badge"><strong>{match}%</strong><span>MATCH</span></div>
            <h1>{r.nombre}</h1>
            <p>{r.cocina.join(" · ") || "Gastronomía"} · {rangoPrecio(r)}</p>
            <p><MapPin size={11} style={{verticalAlign:"-2px",marginRight:3}} /> {c.zonaNombre || "Cerca de ti"}</p>
          </div>
        </div>

        <div className="gm-tabs" role="tablist" aria-label="Información del restaurante">
          {(["resumen", "menu", "opiniones"] as const).map(tab => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab}
              className={activeTab === tab ? "gm-tab active" : "gm-tab"}
              onClick={() => setActiveTab(tab)}>
              {tab === "resumen" ? "Resumen" : tab === "menu" ? "Menú" : "Opiniones"}
            </button>
          ))}
        </div>

        {activeTab === "resumen" && (
          <>
            <section className="gm-detail-highlight">
              <p className="gm-label">¿POR QUÉ TE LO RECOMENDAMOS?</p>
              <p>{r.descripcion || "Una recomendación construida con la información disponible y la experiencia de la comunidad GUÍA·ME."}</p>
              {r.contextos?.length ? <p style={{marginBottom:0}}>Ideal para: {r.contextos.join(", ").toLowerCase()}.</p> : null}
            </section>
            <section className="gm-detail-section">
              <h2>Valoración GUÍA·ME</h2>
              <Zagat r={r} />
              <p style={{fontSize:9,marginTop:10}}>Puntuaciones sobre 30. Precio por persona: <strong>{rangoPrecio(r)}</strong>.</p>
            </section>
            <section className="gm-detail-section">
              <h2>Servicios y ubicación</h2>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {r.ambiente?.slice(0,4).map(x => <span key={x} style={{fontSize:9,padding:"9px",border:"1px solid #e1dacf"}}>＋ {x}</span>)}
              </div>
              <p style={{marginTop:12}}>{r.direccion || "Dirección pendiente"}</p>
            </section>
          </>
        )}
        {activeTab === "menu" && (
          <section className="gm-detail-section">
            <h2>Menú y platos recomendados</h2>
            {dishes.length > 0 ? <p>{dishes.map((dish,i) => <span key={i}><strong>{dish}</strong>{i < dishes.length - 1 ? " · " : ""}</span>)}</p> : <p>La comunidad todavía no ha compartido platos de este restaurante.</p>}
            <p className="gm-card-meta">Los platos aparecerán aquí a medida que los usuarios compartan sus experiencias.</p>
          </section>
        )}
        {activeTab === "opiniones" && (
          <section className="gm-detail-section">
            <h2>Opiniones de la comunidad</h2>
            {latestComment ? <blockquote className="gm-review-quote">“{latestComment}”</blockquote> : <p>Todavía no hay opiniones escritas para este restaurante.</p>}
            <p style={{fontSize:9,color:"#898279"}}>{evaluaciones?.length ?? 0} evaluaciones · {aportes?.length ?? 0} aportes de ficha</p>
            <Link className="gm-cta" to="/evaluar/$id" params={{id}}>DEJAR MI OPINIÓN</Link>
          </section>
        )}

        <div className="gm-detail-actions">
          <a className="gm-secondary" href={r.lat != null && r.lng != null ? "https://www.google.com/maps/dir/?api=1&destination=" + r.lat + "," + r.lng : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(r.direccion || r.nombre)} target="_blank" rel="noreferrer">CÓMO LLEGAR</a>
          <Link className="gm-cta" to="/evaluar/$id" params={{id}}>EVALUAR ESTE LUGAR</Link>
        </div>
      </div>
      <div style={{height:72}} />
    </div>
  );
}
