import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import MapView from "@/components/guiame/MapView";
import { imagenRestaurante, MatchBadge } from "@/components/guiame/ui";
import { calcularMatch, leerContexto, rangoPrecio, type Contexto } from "@/lib/guiame";
import { mapaQuery } from "@/lib/queries";

export const Route = createFileRoute("/mapa")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mapa — GUÍA·ME" }] }),
  component: Mapa,
});

function Mapa() {
  const [c, setC] = useState<Contexto | null>(null);
  useEffect(() => setC(leerContexto()), []);
  const { data } = useQuery(
    mapaQuery(c?.ciudadId ?? null, c?.zonaId ?? null, c?.lat ?? null, c?.lng ?? null, c?.usarUbicacion ?? false),
  );

  const lugares = data ?? [];
  const first = lugares[0];
  const center: [number, number] = c?.lat != null && c?.lng != null
    ? [c.lat, c.lng]
    : first?.lat != null && first?.lng != null
      ? [first.lat, first.lng]
      : [8.9824, -79.5199];

  return (
    <div className="gm-app">
      <div className="gm-map-page">
        <div className="gm-map-overlay">
          <div className="gm-map-search"><MapPin size={12} style={{verticalAlign:"-2px",marginRight:5}} /> {c?.zonaNombre || "Tu zona"}</div>
          <div className="gm-map-count">{lugares.length} lugares</div>
        </div>

        <div className="gm-map-frame">
          <MapView restaurantes={lugares} centro={center} zoom={c?.usarUbicacion ? 12 : 14} alto={window.innerHeight - 140} />
        </div>

        {first ? (
          <Link to="/restaurante/$id" params={{id:first.id}} className="gm-map-card" style={{textDecoration:"none",color:"inherit"}}>
            <img src={imagenRestaurante(first)} alt="" />
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                <div>
                  <h3>{first.nombre}</h3>
                  <p>{first.cocina.join(" · ")} · {rangoPrecio(first)}</p>
                </div>
                <MatchBadge match={c ? calcularMatch(first,c).match : 0} />
              </div>
            </div>
          </Link>
        ) : null}
      </div>
      <div style={{height:72}} />
    </div>
  );
}
