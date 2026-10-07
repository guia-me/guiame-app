import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Shell, Vacio, MatchBadge, imagenRestaurante } from "@/components/guiame/ui";
import { calcularMatch, leerContexto, rangoPrecio, type Contexto } from "@/lib/guiame";
import { restauranteQuery } from "@/lib/queries";

export const Route = createFileRoute("/por-que/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "¿Por qué te recomiendo este? — GUÍA·ME" }] }),
  component: PorQue,
});

function PorQue() {
  const { id } = Route.useParams();
  const [c, setC] = useState<Contexto | null>(null);
  useEffect(() => setC(leerContexto()), []);
  const { data: r } = useQuery(restauranteQuery(id));
  const res = r && c ? calcularMatch(r, c) : null;

  if (!r || !res) {
    return <Shell titulo="¿Por qué te lo recomiendo?"><Vacio>Necesitamos tu contexto para explicar el MATCH.</Vacio></Shell>;
  }

  const razones = res.razones;
  const total = razones.reduce((sum, x) => sum + x.de, 0) || 1;

  return (
    <div className="gm-app">
      <div className="gm-why-page">
        <div className="gm-why-hero">
          <img src={imagenRestaurante(r)} alt={r.nombre} />
          <Link to="/matches" className="gm-icon-button" style={{position:"absolute",zIndex:4,left:12,top:12}}>
            <ArrowLeft size={18} />
          </Link>
          <div className="gm-match-badge"><strong>{res.match}%</strong><span>MATCH</span></div>
          <div className="gm-why-hero-content">
            <h1>{r.nombre}</h1>
            <p>{r.cocina.join(" · ") || "Gastronomía"} · {rangoPrecio(r)} · {c.zonaNombre || "Cerca de ti"}</p>
          </div>
        </div>

        <div className="gm-why-panel">
          <h2>¿Por qué te lo recomendamos?</h2>
          <p>
            Lo elegimos porque {c.zonaNombre ? "está en " + c.zonaNombre + ", " : ""}
            {r.precio_min != null ? "tiene opciones dentro de tu presupuesto" : "tiene información de precio pendiente"}
            {c.cocinas.length ? " y coincide con tu búsqueda de " + c.cocinas.join(", ").toLowerCase() : ""}
            {c.ambientes.length ? " y encaja con el ambiente que elegiste." : "."}
          </p>

          <div>
            {razones.map(x => {
              const pct = Math.round((x.puntos / x.de) * 100);
              return (
                <div className="gm-reason" key={x.etiqueta}>
                  <label>{x.etiqueta}</label>
                  <div className="gm-reason-bar"><span style={{width: Math.max(4, Math.min(100, pct)) + "%"}} /></div>
                  <strong>{pct}%</strong>
                </div>
              );
            })}
          </div>

          <div style={{marginTop:20,paddingTop:15,borderTop:"1px solid #ebe5db"}}>
            <p className="gm-label">Tu MATCH se basa en</p>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {["Zona","Presupuesto","Cocina","Salida","Ambiente","Personas"].map(x => (
                <span key={x} style={{fontSize:8,padding:"5px 7px",border:"1px solid #d8d0c1",borderRadius:12,color:"#686158"}}>
                  <CheckCircle2 size={10} style={{verticalAlign:"-2px",marginRight:3}} />{x}
                </span>
              ))}
            </div>
          </div>

          <Link to="/restaurante/$id" params={{id}} className="gm-cta" style={{marginTop:16}}>
            VER DETALLES DEL RESTAURANTE →
          </Link>
        </div>
      </div>
      <div style={{height:72}} />
    </div>
  );
}
