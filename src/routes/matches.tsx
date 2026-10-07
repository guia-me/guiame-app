import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Shell, TarjetaRestaurante, Vacio, Marca } from "@/components/guiame/ui";
import { alternarFavorito, calcularMatch, leerContexto, leerFavoritos, type Contexto } from "@/lib/guiame";
import { buscarRestaurantes } from "@/lib/queries";

export const Route = createFileRoute("/matches")({
  ssr: false,
  head: () => ({ meta: [{ title: "Tu MATCH inteligente — GUÍA·ME" }] }),
  component: Matches,
});

function Matches() {
  const [c, setC] = useState<Contexto | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [procesando, setProcesando] = useState(true);

  useEffect(() => {
    const saved = leerContexto();
    setC(saved);
    setFavs(leerFavoritos());
    if (saved) {
      const t = window.setTimeout(() => setProcesando(false), 950);
      return () => window.clearTimeout(t);
    }
    setProcesando(false);
  }, []);

  const query = useQuery({
    queryKey: ["matches", c],
    enabled: !!c,
    queryFn: () => buscarRestaurantes(c!),
  });

  if (procesando) {
    return (
      <div className="gm-processing">
        <div className="gm-processing-logo"><Marca /></div>
        <div className="gm-processing-map"><MapPin className="gm-processing-pin" size={38} /></div>
        <h2>Analizando tus preferencias</h2>
        <p>Estamos cruzando zona, presupuesto y tus preferencias con la mejor información disponible…</p>
        <div className="gm-progress"><span /></div>
        <p style={{marginTop:14}}>Casi listo…</p>
      </div>
    );
  }

  const top = (query.data ?? [])
    .map(r => ({ r, ...calcularMatch(r, c!) }))
    .sort((a,b) => b.match - a.match)
    .slice(0, 3);

  return (
    <Shell titulo="Tu MATCH inteligente" subtitulo={resumen(c)}>
      <div className="gm-results">
        {!c && <Vacio>Primero cuéntanos qué buscas en el inicio.</Vacio>}
        {c && query.isLoading && <p className="gm-card-meta">Buscando tus mejores opciones…</p>}
        {c && query.error && <Vacio>No pudimos consultar los restaurantes. Intenta de nuevo.</Vacio>}
        {c && !query.isLoading && !query.error && top.length === 0 && (
          <Vacio>
            Todavía no hay restaurantes en esta zona.{" "}
            <Link to="/agregar" className="gm-text-link">Agrega el que conoces.</Link>
          </Vacio>
        )}

        {c && top.length > 0 && (
          <>
            <div className="gm-results-summary">
              <div>
                <h1>Los 3 lugares que<br />mejor encajan contigo.</h1>
                <p>{c.usarUbicacion ? "Cerca de ti" : c.zonaNombre} · {query.data?.length ?? 0} opciones encontradas</p>
              </div>
              <span className="gm-summary-pill">{c.personas ? c.personas + " personas" : "Tu grupo"}</span>
            </div>

            <div className="gm-result-list">
              {top.map(({r,match}, index) => (
                <div key={r.id}>
                  <TarjetaRestaurante
                    r={r}
                    match={match}
                    zonaNombre={c.usarUbicacion ? undefined : c.zonaNombre}
                    favorito={favs.includes(r.id)}
                    onFavorito={async () => setFavs(await alternarFavorito(r.id))}
                    index={index}
                  />
                </div>
              ))}
            </div>

            <Link to="/mapa" className="gm-secondary" style={{display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",marginTop:14}}>
              VER ESTOS LUGARES EN EL MAPA →
            </Link>

            {(query.data ?? []).length > 3 && (
              <p style={{textAlign:"center",margin:"14px 0 0",fontSize:9,color:"#777168"}}>
                Hay {(query.data ?? []).length - 3} opciones adicionales en esta zona.
              </p>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function resumen(c: Contexto | null) {
  if (!c) return undefined;
  const partes = [
    c.usarUbicacion ? "Cerca de ti" : c.zonaNombre,
    c.ciudadNombre,
    c.personas ? c.personas + " personas" : null,
    c.presupuesto,
  ].filter(Boolean);
  return partes.join("  ·  ");
}
