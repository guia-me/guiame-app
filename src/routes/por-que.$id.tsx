import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shell, Vacio } from "@/components/guiame/ui";
import { calcularMatch, leerContexto, type Contexto } from "@/lib/guiame";
import { restauranteQuery } from "@/lib/queries";

export const Route = createFileRoute("/por-que/$id")({
  head: () => ({
    meta: [
      { title: "Por qué encaja contigo — GUÍA·ME" },
      {
        name: "description",
        content: "El detalle del MATCH: zona, presupuesto, cocina, tipo de salida, ambiente y personas.",
      },
      { property: "og:title", content: "Por qué encaja contigo — GUÍA·ME" },
      { property: "og:description", content: "Así calcula GUÍA·ME tu MATCH." },
    ],
  }),
  component: PorQue,
});

function PorQue() {
  const { id } = Route.useParams();
  const [c, setC] = useState<Contexto | null>(null);
  useEffect(() => setC(leerContexto()), []);
  const { data: r } = useQuery(restauranteQuery(id));

  const res = r && c ? calcularMatch(r, c) : null;

  return (
    <Shell titulo="Encaja contigo porque…" subtitulo={r?.nombre}>
      <div className="py-6">
        {!res && <Vacio>Necesitamos tu contexto para explicar el MATCH.</Vacio>}
        {res && (
          <>
            <p className="eyebrow text-gold">
              MATCH <span className="serif ml-1 text-2xl text-foreground">{res.match}%</span>
            </p>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {res.razones.map((z) => (
                <li key={z.etiqueta} className="flex items-baseline justify-between gap-4 py-4">
                  <div>
                    <p className="eyebrow">{z.etiqueta}</p>
                    <p className="mt-1 text-sm">{z.detalle}</p>
                  </div>
                  <span className="serif whitespace-nowrap text-lg">
                    {z.puntos}
                    <span className="text-xs text-muted-foreground">/{z.de}</span>
                  </span>
                </li>
              ))}
            </ul>
            {res.razones.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Aún no hay suficientes datos de este lugar para explicar el encaje.
              </p>
            )}
            <Link
              to="/restaurante/$id"
              params={{ id }}
              className="btn-outline mt-8 w-full"
            >
              Ver ficha completa
            </Link>
          </>
        )}
      </div>
    </Shell>
  );
}
