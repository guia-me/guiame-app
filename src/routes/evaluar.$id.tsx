import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Chip, Shell } from "@/components/guiame/ui";
import { PhotoUploader, subirFotosComunidad } from "@/components/guiame/PhotoUploader";
import {
  AMBIENTES,
  CON_QUIEN,
  PERSONAS,
  PRESUPUESTOS,
  anonId,
} from "@/lib/guiame";
import { restauranteQuery } from "@/lib/queries";

export const Route = createFileRoute("/evaluar/$id")({
  // This route depends on client state (localStorage/geolocation) or interactive data fetching.
  // Keep the initial request on the SSR shell and render the route on the browser.
  ssr: false,
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
  const [cost, setCost] = useState(20);
  const [ambiente, setAmbiente] = useState<string | null>(null);
  const [conQuien, setConQuien] = useState<string | null>(null);
  const [personas, setPersonas] = useState<string | null>(null);
  const [presupuesto, setPresupuesto] = useState<string | null>(null);
  const [volveria, setVolveria] = useState<"si" | "no" | "tal_vez" | null>(null);
  const [recomendaria, setRecomendaria] = useState<boolean | null>(null);
  const [plato, setPlato] = useState("");
  const [comentario, setComentario] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    setExito(false);
    let fotosSubidas: string[] = [];
    try {
      fotosSubidas = await subirFotosComunidad(fotos, "platos", anonId());
    } catch (uploadError) {
      setEnviando(false);
      setError(uploadError instanceof Error ? uploadError.message : "No pudimos subir las fotos. Intenta de nuevo.");
      return;
    }
    const { error: e } = await supabase.from("evaluaciones").insert({
      restaurante_id: id,
      anon_id: anonId(),
      food,
      decor,
      service,
      cost,
      ambiente,
      con_quien: conQuien,
      personas,
      presupuesto,
      volverias: volveria === "si" ? true : volveria === "no" ? false : null,
      recomendarias: recomendaria,
      plato: plato.trim() || null,
      comentario: comentario.trim() || null,
      fotos: fotosSubidas,
    });
    setEnviando(false);
    if (e) {
      setError("No pudimos guardar tu evaluación. Intenta de nuevo.");
      return;
    }
    setExito(true);
  };

  return (
    <Shell
      titulo={exito ? "Gracias por compartir" : "Tu evaluación"}
      subtitulo={exito ? r?.nombre : r?.nombre}
    >
      {exito ? (
        <section className="mx-auto my-8 max-w-md overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-[#fbf8f1] text-[#1d2825] shadow-sm">
          <div className="h-1 w-full bg-[var(--gold)]" />
          <div className="px-6 py-9 text-center sm:px-9 sm:py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#c5a96b] bg-white shadow-[0_4px_18px_rgba(38,59,50,0.10)]">
              <span aria-hidden="true" className="serif text-3xl text-[#a88a4d]">✓</span>
            </div>
            <p className="mt-7 text-xs font-medium uppercase tracking-[0.24em] text-[#77715f]">
              GUÍA·ME · COMUNIDAD
            </p>
            <h2 className="serif mt-3 text-3xl leading-tight sm:text-4xl">
              Tu experiencia cuenta.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#625f56]">
              Gracias por aportar tu mirada. Tu evaluación quedó registrada y ayuda a otros
              a elegir dónde disfrutar su próxima comida.
            </p>
            <div className="mx-auto my-7 h-px w-16 bg-[var(--gold)]/70" />
            <p className="text-sm text-[#77715f]">Tu visita a</p>
            <p className="serif mt-1 text-xl">{r?.nombre ?? "este restaurante"}</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/restaurante/$id", params: { id } })}
              className="group relative mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full border-2 border-[#c5a96b] bg-[#263b32] px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#fffaf0] shadow-lg transition duration-300 hover:bg-[#314d40] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a96b]" style={{ appearance: "none", WebkitAppearance: "none", backgroundColor: "#263b32", color: "#fffaf0", border: "2px solid #c5a96b", borderRadius: "9999px", minHeight: "56px", width: "100%", fontWeight: 600, letterSpacing: "0.12em", boxShadow: "0 8px 24px rgba(38,59,50,0.22)", cursor: "pointer" }}
            >
              <span aria-hidden="true" className="text-[#e3c985]">✦</span>
              Volver a mi MATCH
              <span aria-hidden="true" className="text-lg text-[#e3c985]">→</span>
            </button>
            <p className="mt-4 text-xs tracking-wide text-[#77715f]">
              GRACIAS POR SER PARTE DE GUÍA·ME
            </p>
          </div>
        </section>
      ) : (
        <>
          <div className="gm-evaluation-form">
            <Escala label="Food" valor={food} onChange={setFood} />
            <Escala label="Decor" valor={decor} onChange={setDecor} />
            <Escala label="Service" valor={service} onChange={setService} />
            <Escala label="Cost" valor={cost} onChange={setCost} />

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

            <PhotoUploader files={fotos} onChange={setFotos} title="Fotos de los platos" help="Comparte fotos de los platos que probaste. Hasta 5 imágenes de 5 MB cada una." />

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
            {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
            <button type="button" onClick={enviar} disabled={enviando} className="btn-primary w-full disabled:opacity-40">
              {enviando ? "Guardando…" : "Enviar evaluación"}
            </button>
          </div>
        </>
      )}
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
