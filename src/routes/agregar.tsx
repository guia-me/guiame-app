import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Chip, Shell } from "@/components/guiame/ui";
import { AMBIENTES, COCINAS, CON_QUIEN, PRESUPUESTOS, anonId } from "@/lib/guiame";
import { ciudadesQuery, paisesQuery, zonasQuery } from "@/lib/queries";

type GeoResult = { lat: number; lng: number } | null;

async function geolocalizarRestaurante(args: {
  nombre: string;
  direccion: string;
  zona: string;
  ciudad: string;
  pais: string;
}): Promise<GeoResult> {
  // Never use the contributor's device location as the restaurant location.
  // Only accept a named food venue from OpenStreetMap; otherwise leave it pending.
  const q = [args.nombre, args.direccion, args.zona, args.ciudad, args.pais]
    .filter(Boolean)
    .join(", ");
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("q", q);
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      name?: string;
      class?: string;
      type?: string;
      display_name?: string;
    }>;
    const foodVenueTypes = new Set([
      "restaurant", "fast_food", "cafe", "bar", "pub", "food_court", "ice_cream", "bakery"
    ]);
    const normalize = (value: string) =>
      value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const wantedName = normalize(args.nombre);
    const match = results.find((item) => {
      const namedVenue = item.class === "amenity" && foodVenueTypes.has(item.type ?? "");
      const resultName = normalize(item.name ?? "");
      const displayName = normalize(item.display_name ?? "");
      const nameMatches =
        !!wantedName &&
        (resultName.includes(wantedName) ||
          wantedName.includes(resultName) ||
          displayName.includes(wantedName));
      return namedVenue && nameMatches && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
    });
    if (!match) return null;
    return { lat: Number(match.lat), lng: Number(match.lon) };
  } catch {
    // Geocoding is best-effort; a failed lookup must not block the community contribution.
    return null;
  }
}

export const Route = createFileRoute("/agregar")({
  // This route depends on client state or interactive data fetching.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agregar un restaurante — GUÍA·ME" },
      {
        name: "description",
        content: "Propón un restaurante para que GUÍA·ME lo incorpore tras verificarlo.",
      },
      { property: "og:title", content: "Agregar un restaurante — GUÍA·ME" },
      { property: "og:description", content: "La comunidad construye la base de GUÍA·ME." },
    ],
  }),
  component: Agregar,
});

function Agregar() {
  const [nombre, setNombre] = useState("");
  const [paisId, setPaisId] = useState<string | null>(null);
  const [paisNombre, setPaisNombre] = useState<string | null>(null);
  const [ciudadId, setCiudadId] = useState<string | null>(null);
  const [ciudadNombre, setCiudadNombre] = useState<string | null>(null);
  const [zonaId, setZonaId] = useState<string | null>(null);
  const [zonaNombre, setZonaNombre] = useState<string | null>(null);
  const [direccion, setDireccion] = useState("");
  const [cocinas, setCocinas] = useState<string[]>([]);
  const [presupuesto, setPresupuesto] = useState<string | null>(null);
  const [ambientes, setAmbientes] = useState<string[]>([]);
  const [contextos, setContextos] = useState<string[]>([]);
  const [telefono, setTelefono] = useState("");
  const [web, setWeb] = useState("");
  const [imagen, setImagen] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [ubicacionResultado, setUbicacionResultado] = useState<"encontrada" | "pendiente" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paises = useQuery(paisesQuery);
  const ciudades = useQuery(ciudadesQuery(paisId));
  const zonas = useQuery(zonasQuery(ciudadId));

  const alternar = (l: string[], v: string) =>
    l.includes(v) ? l.filter((x) => x !== v) : [...l, v];

  const puede = !!nombre.trim() && !!paisId && !!ciudadId && !!zonaId;

  const enviar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);

    const coords = await geolocalizarRestaurante({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      zona: zonaNombre ?? "",
      ciudad: ciudadNombre ?? "",
      pais: paisNombre ?? "",
    });
    setUbicacionResultado(coords ? "encontrada" : "pendiente");

    const rango = PRESUPUESTOS.find((p) => p.label === presupuesto);
    const { error: e } = await supabase.from("aportes_restaurantes").insert({
      anon_id: anonId(),
      nombre: nombre.trim(),
      pais: paisNombre,
      ciudad: ciudadNombre,
      zona: zonaNombre,
      direccion: direccion.trim() || null,
      tipo_cocina: cocinas.join(", ") || null,
      rango_precio: rango?.label ?? null,
      ambiente: ambientes.join(", ") || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      contacto: telefono.trim() || web.trim() || null,
      imagen: imagen.trim() || null,
      estado: "pendiente",
      payload: {
        pais_id: paisId,
        ciudad_id: ciudadId,
        zona_id: zonaId,
        cocinas,
        ambientes,
        contextos,
        telefono: telefono.trim() || null,
        web: web.trim() || null,
        comentario: comentario.trim() || null,
        precio_min: rango?.min ?? null,
        precio_max: rango?.max ?? null,
        geolocalizacion: coords ? "automatica" : "pendiente",
      },
    });

    setEnviando(false);
    if (e) {
      setError("No pudimos enviar el restaurante. Intenta de nuevo.");
      return;
    }

    setEnviado(true);
  };

  if (enviado) {
    return (
      <Shell titulo="Restaurante enviado" subtitulo="Gracias por ayudar a construir GUÍA·ME.">
        <div className="py-12 text-center">
          <p className="text-lg">Recibimos <strong>{nombre}</strong>.</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Quedará pendiente de verificación antes de aparecer en las recomendaciones.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {ubicacionResultado === "encontrada"
              ? "Encontramos una ubicación del restaurante automáticamente."
              : "No pudimos confirmar su ubicación automáticamente. El equipo podrá completarla después."}
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="btn-primary mt-8 w-full"
          >
            Volver a GUÍA·ME
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      titulo="Agregar un restaurante"
      subtitulo="La comunidad puede proponer lugares de cualquier ciudad. Intentaremos localizar el restaurante automáticamente; primero verificamos cada aporte."
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
                setPaisNombre(p.nombre);
                setCiudadId(null);
                setCiudadNombre(null);
                setZonaId(null);
                setZonaNombre(null);
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
                  setCiudadNombre(c.nombre);
                  setZonaId(null);
                  setZonaNombre(null);
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
              <Chip key={z.id} activo={zonaId === z.id} onClick={() => { setZonaId(z.id); setZonaNombre(z.nombre); }}>
                {z.nombre}
              </Chip>
            ))}
          </Campo>
        )}

        <section className="py-5">
          <p className="eyebrow">Dirección (opcional, ayuda a encontrarlo)</p>
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
          <textarea className="field mt-3 min-h-24" value={comentario} onChange={(e) => setComentario(e.target.value)} />
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
          {enviando ? "Buscando ubicación y enviando…" : "Enviar restaurante"}
        </button>
      </div>
    </Shell>
  );
}
