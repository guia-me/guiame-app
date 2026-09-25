import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shell, TarjetaRestaurante, Vacio } from "@/components/guiame/ui";
import {
  alternarFavorito,
  calcularMatch,
  leerContexto,
  leerFavoritos,
  type Contexto,
} from "@/lib/guiame";
import { buscarRestaurantes } from "@/lib/queries";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Tus 3 lugares — GUÍA·ME" },
      {
        name: "description",
        content: "Los 3 restaurantes que mejor encajan con tu ocasión, tu zona y tu presupuesto.",
      },
      { property: "og:title", content: "Tus 3 lugares — GUÍA·ME" },
      {
        property: "og:description",
        content: "MATCH según zona, presupuesto, cocina, tipo de salida, ambiente y personas.",
      },
    ],
  }),
  component: Matches,
});

function Matches() {
  const [c, setC] = useState<Contexto | null>(null);
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    setC(leerContexto());
    setFavs(leerFavoritos());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["matches", c],
    enabled: !!c,
    queryFn: () => buscarRestaurantes(c!),
  });

  const top = (data ?? [])
    .map((r) => ({ r, ...calcularMatch(r, c!) }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);

  return (
    <Shell titulo="Estos son tus 3 lugares" subtitulo={resumen(c)}>
      <div className="space-y-5 py-6">
        {!c && <Vacio>Primero cuéntanos tu contexto en el inicio.</Vacio>}
        {c && isLoading && <p className="text-sm text-muted-foreground">Buscando…</p>}
        {c && !isLoading && top.length === 0 && (
          <Vacio>
            Todavía no hay restaurantes en esa zona.{" "}
            <Link to="/agregar" className="text-green underline">
              Agrega el que conoces
            </Link>
            .
          </Vacio>
        )}
        {top.map(({ r, match }) => (
          <div key={r.id}>
            <TarjetaRestaurante
              r={r}
              match={match}
              zonaNombre={c?.usarUbicacion ? undefined : c?.zonaNombre}
              favorito={favs.includes(r.id)}
              onFavorito={async () => setFavs(await alternarFavorito(r.id))}
            />
            <Link
              to="/por-que/$id"
              params={{ id: r.id }}
              className="mt-2 inline-block text-[0.65rem] uppercase tracking-[0.18em] text-gold"
            >
              Por qué encaja contigo
            </Link>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function resumen(c: Contexto | null) {
  if (!c) return undefined;
  const partes = [
    c.usarUbicacion ? "Cerca de ti" : c.zonaNombre,
    c.ciudadNombre,
    c.conQuien,
    c.personas ? `${c.personas} personas` : null,
    c.presupuesto,
    c.cocinas.join(", ") || null,
    c.ambientes.join(", ") || null,
  ].filter(Boolean);
  return partes.join(" · ");
}
