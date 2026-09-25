import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Chip, Shell } from "@/components/guiame/ui";
import { anonId } from "@/lib/guiame";
import { restauranteQuery } from "@/lib/queries";

const TIPOS = ["Plato", "Ambiente", "Precio observado", "Característica"] as const;

export const Route = createFileRoute("/completar/$id")({
  head: () => ({
    meta: [
      { title: "Completar ficha — GUÍA·ME" },
      {
        name: "description",
        content: "Aporta platos, ambiente, precio observado o características de un lugar que ya conoces.",
      },
      { property: "og:title", content: "Completar ficha — GUÍA·ME" },
      { property: "og:description", content: "La comunidad completa la información de cada lugar." },
    ],
  }),
  component: Completar,
});

function Completar() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: r } = useQuery(restauranteQuery(id));

  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [valor, setValor] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (!valor.trim()) return;
    setEnviando(true);
    setError(null);
    const { error: e } = await supabase.from("aportes_ficha").insert({
      restaurante_id: id,
      anon_id: anonId(),
      tipo,
      valor: valor.trim(),
      comentario: comentario.trim() || null,
    });
    setEnviando(false);
    if (e) {
      setError("No pudimos guardar tu aporte. Intenta de nuevo.");
      return;
    }
    navigate({ to: "/restaurante/$id", params: { id } });
  };

  return (
    <Shell
      titulo="Completar ficha"
      subtitulo={r ? `${r.nombre} · tu aporte queda registrado como dato de comunidad` : undefined}
    >
      <div className="divide-y divide-border">
        <Campo label="Qué quieres aportar">
          {TIPOS.map((t) => (
            <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)}>
              {t}
            </Chip>
          ))}
        </Campo>

        <section className="py-5">
          <p className="eyebrow">Tu aporte</p>
          <input
            className="field mt-3"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={tipo === "Precio observado" ? "Ej. $28 por persona" : "Escribe aquí"}
          />
        </section>

        <section className="py-5">
          <p className="eyebrow">Comentario</p>
          <textarea
            className="field mt-3 min-h-24"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </section>
      </div>

      <div className="py-8">
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !valor.trim()}
          className="btn-primary w-full disabled:opacity-40"
        >
          {enviando ? "Enviando…" : "Enviar aporte"}
        </button>
      </div>
    </Shell>
  );
}
