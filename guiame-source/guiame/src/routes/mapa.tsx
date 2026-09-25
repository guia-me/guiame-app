import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { Shell, Vacio } from "@/components/guiame/ui";
import { leerContexto, type Contexto } from "@/lib/guiame";
import { mapaQuery } from "@/lib/queries";

const MapView = lazy(() => import("@/components/guiame/MapView"));

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa gastronómico — GUÍA·ME" },
      { name: "description", content: "Los lugares de tu ciudad ubicados en el mapa." },
      { property: "og:title", content: "Mapa gastronómico — GUÍA·ME" },
      { property: "og:description", content: "Explora los restaurantes de tu ciudad en el mapa." },
    ],
  }),
  component: Mapa,
});

function Mapa() {
  const [c, setC] = useState<Contexto | null>(null);
  useEffect(() => setC(leerContexto()), []);
  const { data } = useQuery(mapaQuery(c?.ciudadId ?? null));

  const conCoords = (data ?? []).filter((r) => r.lat != null && r.lng != null);
  const centro: [number, number] =
    c?.usarUbicacion && c.lat != null && c.lng != null
      ? [c.lat, c.lng]
      : conCoords.length > 0
        ? [conCoords[0]!.lat!, conCoords[0]!.lng!]
        : [8.98, -79.52];

  return (
    <Shell titulo="Mapa" subtitulo={c?.ciudadNombre ?? "Selecciona tu ciudad en el inicio."}>
      <div className="py-6">
        {conCoords.length === 0 ? (
          <Vacio>Todavía no hay lugares con ubicación para mostrar.</Vacio>
        ) : (
          <div className="border border-border">
            <ClientOnly fallback={<div className="h-[420px] bg-muted" />}>
              <Suspense fallback={<div className="h-[420px] bg-muted" />}>
                <MapView restaurantes={conCoords} centro={centro} />
              </Suspense>
            </ClientOnly>
          </div>
        )}
      </div>
    </Shell>
  );
}
