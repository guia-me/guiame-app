import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Chip, Shell } from "@/components/guiame/ui";
import { AMBIENTES, COCINAS, CON_QUIEN, PRESUPUESTOS, anonId } from "@/lib/guiame";
import { ciudadesQuery, paisesQuery, zonasQuery } from "@/lib/queries";

export const Route = createFileRoute("/agregar")({
  head: () => ({
    meta: [
      { title: "Agregar un restaurante — GUÍA·ME" },
      {
        name: "description",
        content: "¿No encuentras un lugar? Agrégalo: queda pendiente de verificar y la comunidad lo enriquece.",
      },
      { property: "og:title", content: "Agregar un restaurante — GUÍA·ME" },
      { property: "og:description", content: "La comunidad construye la base de GUÍA·ME." },
    ],
  }),
  component: Agregar,
});

function Agregar() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [paisId, setPaisId] = useState<string | null>(null);
  const [ciudadId, setCiudadId] = useState<string | null>(null);
  const [zonaId, setZonaId] = useState<string | null>(null);
  const [direccion, setDireccion] = useState("");
  const [cocinas, setCocinas] = useState<string[]>([]);
  const [presupuesto, setPresupuesto] = useState<string | null>(null);
  const [ambientes, setAmbientes] = useState<string[]>([]);
  const [contextos, setContextos] = useState<string[]>([]);
  const [telefono, setTelefono] = useState("");
  const [web, setWeb] = useState("");
  const [imagen, setImagen] = useState("");
  const [comentario, setComentario] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paises = useQuery(paisesQuery);
  const ciudades = useQuery(ciudadesQuery(paisId));
  const zonas = useQuery(zonasQuery(ciudadId));

  const alternar = (l: string[], v: string) =>
    l.includes(v) ? l.filter((x) => x !== v) : [...l, v];

  const puede = !!nombre.trim() && !!paisId && !!ciudadId && !!zonaId;

  const ubicar = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((p) =>
      setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
    );
  };

  const enviar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);
    const rango = PRESUPUESTOS.find((p) => p.label === presupuesto);
    const { data, error: e } = await supabase
      .from("restaurantes")
      .insert({
        nombre: nombre.trim(),
        pais_id: paisId!,
        ciudad_id: ciudadId!,
        zona_id: zonaId!,
        direccion: direccion.trim() || null,
        cocina: cocinas,
        ambiente: ambientes,
        contextos,
        precio_min: rango?.min ?? null,
        precio_max: rango?.max ?? null,
        telefono: telefono.trim() || null,
        web: web.trim() || null,
        imagen_url: imagen.trim() || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        fuente: "Aporte de comunidad",
        estado: "pendiente" as const,
      })
      .select("id")
      .single();

    if (e || !data) {
      setEnviando(false);
      setError("No pudimos guardar el lugar. Intenta de nuevo.");
      return;
    }

    await supabase.from("aportes_restaurantes").insert({
      anon_id: anonId(),
      restaurante_id: data.id,
      payload: { nombre: nombre.trim(), comentario: comentario.trim() || null },
    });

    setEnviando(false);
    navigate({ to: "/restaurante/$id", params: { id: data.id } });
  };

  return (
    <Shell
      titulo="Agregar un restaurante"
      subtitulo="Quedará como PENDIENTE de verificar hasta que la comunidad lo confirme."
    >
      <div className="divide-y divide-border">
        <section className="py-5">
          <p className="eyebrow">Nombre</p>
          <input className="field mt-3" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </section>

        <Campo label="País">
          {(paises.data ?? []).map((p) => (
            <Chip
              key={p.id}
              activo={paisId === p.id}
              onClick={() => {
                setPaisId(p.id);
                setCiudadId(null);
                setZonaId(null);
              }}
            >
              {p.nombre}
            </Chip>
          ))}
        </Campo>

        {paisId && (
          <Campo label="Ciudad">
            {(ciudades.data ?? []).map((c) => (
              <Chip
                key={c.id}
                activo={ciudadId === c.id}
                onClick={() => {
                  setCiudadId(c.id);
                  setZonaId(null);
                }}
              >
                {c.nombre}
              </Chip>
            ))}
          </Campo>
        )}

        {ciudadId && (
          <Campo label="Zona">
            {(zonas.data ?? []).map((z) => (
              <Chip key={z.id} activo={zonaId === z.id} onClick={() => setZonaId(z.id)}>
                {z.nombre}
              </Chip>
            ))}
          </Campo>
        )}

        <section className="py-5">
          <p className="eyebrow">Dirección</p>
          <input className="field mt-3" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </section>

        <Campo label="Cocina">
          {COCINAS.map((x) => (
            <Chip key={x} activo={cocinas.includes(x)} onClick={() => setCocinas(alternar(cocinas, x))}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Rango de precio">
          {PRESUPUESTOS.map((p) => (
            <Chip key={p.label} activo={presupuesto === p.label} onClick={() => setPresupuesto(p.label)}>
              {p.label}
            </Chip>
          ))}
        </Campo>

        <Campo label="Ambiente">
          {AMBIENTES.map((x) => (
            <Chip key={x} activo={ambientes.includes(x)} onClick={() => setAmbientes(alternar(ambientes, x))}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Bueno para">
          {CON_QUIEN.map((x) => (
            <Chip key={x} activo={contextos.includes(x)} onClick={() => setContextos(alternar(contextos, x))}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Ubicación">
          <Chip activo={!!coords} onClick={ubicar}>
            <MapPin size={14} className="mr-1.5" />
            {coords ? "Ubicación tomada" : "Usar mi ubicación actual"}
          </Chip>
        </Campo>

        <section className="py-5">
          <p className="eyebrow">Teléfono</p>
          <input className="field mt-3" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </section>

        <section className="py-5">
          <p className="eyebrow">Web</p>
          <input className="field mt-3" value={web} onChange={(e) => setWeb(e.target.value)} />
        </section>

        <section className="py-5">
          <p className="eyebrow">Foto (enlace)</p>
          <input className="field mt-3" value={imagen} onChange={(e) => setImagen(e.target.value)} />
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
          disabled={!puede || enviando}
          className="btn-primary w-full disabled:opacity-40"
        >
          {enviando ? "Enviando…" : "Agregar restaurante"}
        </button>
      </div>
    </Shell>
  );
}
