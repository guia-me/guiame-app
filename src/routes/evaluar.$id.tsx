import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Chip, Shell } from "@/components/guiame/ui";
import {
  AMBIENTES,
  CON_QUIEN,
  PERSONAS,
  PRESUPUESTOS,
  anonId,
} from "@/lib/guiame";
import { restauranteQuery } from "@/lib/queries";

export const Route = createFileRoute("/evaluar/$id")({
  head: () => ({
    meta: [
      { title: "Evaluar un lugar — GUÍA·ME" },
      {
        name: "description",
        content: "Califica Food, Decor y Service sobre 30 y cuenta tu experiencia para que GUÍA·ME aprenda.",
      },
      { property: "og:title", content: "Evaluar un lugar — GUÍA·ME" },
      { property: "og:description", content: "Tú pruebas. Tú evalúas. GUÍA·ME aprende." },
    ],
  }),
  component: Evaluar,
});

function Evaluar() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: r } = useQuery(restauranteQuery(id));

  const [food, setFood] = useState(20);
  const [decor, setDecor] = useState(20);
  const [service, setService] = useState(20);
  const [ambiente, setAmbiente] = useState<string | null>(null);
  const [conQuien, setConQuien] = useState<string | null>(null);
  const [personas, setPersonas] = useState<string | null>(null);
  const [presupuesto, setPresupuesto] = useState<string | null>(null);
  const [volveria, setVolveria] = useState<"si" | "no" | "tal_vez" | null>(null);
  const [recomendaria, setRecomendaria] = useState<boolean | null>(null);
  const [plato, setPlato] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    const { error: e } = await supabase.from("evaluaciones").insert({
      restaurante_id: id,
      anon_id: anonId(),
      food,
      decor,
      service,
      ambiente,
      con_quien: conQuien,
      personas,
      presupuesto,
      volveria,
      recomendaria,
      plato: plato.trim() || null,
      comentario: comentario.trim() || null,
    });
    setEnviando(false);
    if (e) {
      setError("No pudimos guardar tu evaluación. Intenta de nuevo.");
      return;
    }
    navigate({ to: "/restaurante/$id", params: { id } });
  };

  return (
    <Shell titulo="Tu evaluación" subtitulo={r?.nombre}>
      <div className="divide-y divide-border">
        <Escala label="Food" valor={food} onChange={setFood} />
        <Escala label="Decor" valor={decor} onChange={setDecor} />
        <Escala label="Service" valor={service} onChange={setService} />

        <Campo label="Ambiente">
          {AMBIENTES.map((x) => (
            <Chip key={x} activo={ambiente === x} onClick={() => setAmbiente(x)}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Con quién fuiste">
          {CON_QUIEN.map((x) => (
            <Chip key={x} activo={conQuien === x} onClick={() => setConQuien(x)}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Cuántas personas">
          {PERSONAS.map((x) => (
            <Chip key={x} activo={personas === x} onClick={() => setPersonas(x)}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Presupuesto por persona">
          {PRESUPUESTOS.map((p) => (
            <Chip key={p.label} activo={presupuesto === p.label} onClick={() => setPresupuesto(p.label)}>
              {p.label}
            </Chip>
          ))}
        </Campo>

        <Campo label="¿Volverías?">
          {(["si", "no", "tal_vez"] as const).map((v) => (
            <Chip key={v} activo={volveria === v} onClick={() => setVolveria(v)}>
              {v === "si" ? "Sí" : v === "no" ? "No" : "Tal vez"}
            </Chip>
          ))}
        </Campo>

        <Campo label="¿Lo recomendarías?">
          <Chip activo={recomendaria === true} onClick={() => setRecomendaria(true)}>
            Sí
          </Chip>
          <Chip activo={recomendaria === false} onClick={() => setRecomendaria(false)}>
            No
          </Chip>
        </Campo>

        <section className="py-5">
          <p className="eyebrow">Plato recomendado</p>
          <input
            className="field mt-3"
            value={plato}
            onChange={(e) => setPlato(e.target.value)}
            placeholder="Ej. carimañolas"
          />
        </section>

        <section className="py-5">
          <p className="eyebrow">Comentario</p>
          <textarea
            className="field mt-3 min-h-24"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Cómo fue tu experiencia?"
          />
        </section>
      </div>

      <div className="py-8">
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <button type="button" onClick={enviar} disabled={enviando} className="btn-primary w-full disabled:opacity-40">
          {enviando ? "Guardando…" : "Enviar evaluación"}
        </button>
      </div>
    </Shell>
  );
}

function Escala({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <section className="py-5">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">{label}</p>
        <p className="serif text-xl">
          {valor}
          <span className="text-sm text-muted-foreground">/30</span>
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={30}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--gold)]"
      />
    </section>
  );
}
