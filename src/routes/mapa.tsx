import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import MapView from "@/components/guiame/MapView";
import { imagenRestaurante, MatchBadge } from "@/components/guiame/ui";
import { calcularMatch, coincideCocina, contextoVacio, guardarContexto, leerContexto, rangoPrecio, type Contexto } from "@/lib/guiame";
import { buscarRestaurantes } from "@/lib/queries";

export const Route = createFileRoute("/mapa")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mapa — GUÍA·ME" }] }),
  component: Mapa,
});

function Mapa() {
  const [c, setC] = useState<Contexto | null>(null);
  const [geoStatus, setGeoStatus] = useState<"loading" | "ready" | "manual">("loading");

  // Explorar significa "cerca de mí": nunca reutilizar la zona manual anterior
  // (por ejemplo, Casco Antiguo) como si fuera la ubicación actual.
  useEffect(() => {
    let cancelled = false;
    const saved = leerContexto() ?? contextoVacio;
    if (!navigator.geolocation) {
      setGeoStatus("manual");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const next: Contexto = {
          ...saved,
          usarUbicacion: true,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          paisId: null,
          ciudadId: null,
          zonaId: null,
          paisNombre: undefined,
          ciudadNombre: undefined,
          zonaNombre: "Cerca de ti",
        };
        guardarContexto(next);
        setC(next);
        setGeoStatus("ready");
      },
      () => {
        if (cancelled) return;
        setC(null);
        setGeoStatus("manual");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
    return () => { cancelled = true; };
  }, []);
  // El mapa comparte la búsqueda y los filtros de los resultados MATCH.
  // Evita mostrar restaurantes de otra zona o de una cocina distinta.
  const { data } = useQuery({
    queryKey: ["matches", c],
    enabled: !!c,
    queryFn: () => buscarRestaurantes(c!),
  });

  const compatibles = (data ?? []).filter((r) => {
    const categorias = r.cocina.map(x => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase());
    if (categorias.some(x => ["cultural", "museo", "teatro", "atraccion", "atracciones"].includes(x))) return false;
    return !c || c.cocinas.length === 0 ||
      c.cocinas.some(buscada => r.cocina.some(actual => coincideCocina(actual, buscada)));
  });
  const lugares = compatibles.filter((r) => r.lat != null && r.lng != null);
  const first = lugares[0];
  // Solo centrar en la geolocalización del usuario si este eligió expresamente ese modo.
  // En una búsqueda por zona, el mapa se encuadra alrededor de los restaurantes encontrados.
  const center: [number, number] = c?.usarUbicacion && c.lat != null && c.lng != null
    ? [c.lat, c.lng]
    : first?.lat != null && first?.lng != null
      ? [first.lat, first.lng]
      : [8.9824, -79.5199];

  return (
    <div className="gm-app">
      <div className="gm-map-page">
        <div className="gm-map-overlay">
          <div className="gm-map-search"><MapPin size={12} style={{verticalAlign:"-2px",marginRight:5}} /> {geoStatus === "loading" ? "Detectando tu ubicación…" : c?.usarUbicacion ? "Cerca de ti" : "Ubicación no disponible"}</div>
          <div className="gm-map-count">{lugares.length} lugares</div>
        </div>

        <div className="gm-map-frame">
          <MapView restaurantes={lugares} centro={center} zoom={c?.usarUbicacion ? 12 : 14} alto={window.innerHeight - 140} />
        </div>

        {lugares.length > 0 ? (
          <div className="gm-map-cards" aria-label="Restaurantes visibles en el mapa">
            {lugares.map((restaurante) => (
              <Link
                key={restaurante.id}
                to="/restaurante/$id"
                params={{ id: restaurante.id }}
                className="gm-map-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img src={imagenRestaurante(restaurante)} alt="" loading="lazy" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <h3>{restaurante.nombre}</h3>
                      <p>{restaurante.cocina.join(" · ") || "Cocina pendiente"} · {rangoPrecio(restaurante)}</p>
                    </div>
                    <MatchBadge match={c ? calcularMatch(restaurante, c).match : 0} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="gm-map-empty">
            {geoStatus === "loading" ? "Estamos detectando tu ubicación para mostrar restaurantes cercanos…" : geoStatus === "manual" ? <>No pudimos acceder a tu ubicación. No te enviaremos a Casco Antiguo automáticamente. <Link to="/" style={{display:"inline-block",marginTop:12,fontWeight:700,color:"inherit"}}>Buscar en otra zona →</Link></> : "No encontramos restaurantes con ubicación registrada cerca de ti. Prueba más tarde o elige otra zona."}
          </div>
        )}
      </div>
      <div style={{height:72}} />
    </div>
  );
}
