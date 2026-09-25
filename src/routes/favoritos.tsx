import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shell, TarjetaRestaurante, Vacio } from "@/components/guiame/ui";
import { alternarFavorito, leerFavoritos } from "@/lib/guiame";
import { porIdsQuery } from "@/lib/queries";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Tus favoritos — GUÍA·ME" },
      { name: "description", content: "Los lugares que guardaste para volver." },
      { property: "og:title", content: "Tus favoritos — GUÍA·ME" },
      { property: "og:description", content: "Tu lista personal de lugares guardados." },
    ],
  }),
  component: Favoritos,
});

function Favoritos() {
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => setFavs(leerFavoritos()), []);
  const { data } = useQuery(porIdsQuery(favs));

  return (
    <Shell titulo="Favoritos" subtitulo="Guardados en este dispositivo.">
      <div className="space-y-5 py-6">
        {favs.length === 0 && <Vacio>Todavía no has guardado ningún lugar.</Vacio>}
        {(data ?? []).map((r) => (
          <TarjetaRestaurante
            key={r.id}
            r={r}
            favorito
            onFavorito={async () => setFavs(await alternarFavorito(r.id))}
          />
        ))}
      </div>
    </Shell>
  );
}
