import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Chip, Shell } from "@/components/guiame/ui";
import { AMBIENTES, COCINAS, CON_QUIEN, PRESUPUESTOS, anonId } from "@/lib/guiame";
import { ciudadesQuery, paisesQuery, zonasQuery } from "@/lib/queries";

export const Route = createFileRoute("/agregar")({
  // This route depends on client state (localStorage/geolocation) or interactive data fetching.
  // Keep the initial request on the SSR shell and render the route on the browser.
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paises = useQuery(paisesQuery);
  const ciudades = useQuery(ciudadesQuery(paisId));
  const zonas = useQuery(zonasQuery(ciudadId));

  const alternar = (l: string[], v: string) =>
    l.includes(v) ? l.filter((x) => x !== v) : [...l, v];

  const puede = !!nombre.trim() && !!paisId && !!ciudadId && !!zonaId;

  const ubicar = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("No pudimos obtener tu ubicación. Puedes continuar sin ella."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const enviar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);

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
      subtitulo="La comunidad puede proponer lugares de cualquier ciudad. Primero los verificamos; después entran al motor de MATCH."
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
          {enviando ? "Enviando…" : "Enviar restaurante"}
        </button>
      </div>
    </Shell>
  );
}
