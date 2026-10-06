import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";
import { Campo, Chip, Shell } from "@/components/guiame/ui";
import {
  AMBIENTES,
  COCINAS,
  CON_QUIEN,
  PERSONAS,
  PRESUPUESTOS,
  contextoVacio,
  guardarContexto,
  leerContexto,
  type Contexto,
} from "@/lib/guiame";
import type { Pais, Ciudad, Zona } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GUÍA·ME — Tu guía para comer, construida por quienes comen" },
      {
        name: "description",
        content:
          "Cuéntanos con quién sales, tu presupuesto y tu zona: GUÍA·ME te da los 3 lugares que mejor encajan contigo.",
      },
      { property: "og:title", content: "GUÍA·ME — Guía gastronómica personalizada" },
      {
        property: "og:description",
        content: "Tú pruebas. Tú evalúas. GUÍA·ME aprende.",
      },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const navigate = useNavigate();
  const [c, setC] = useState<Contexto>(contextoVacio);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const guardado = leerContexto();
    if (guardado) {
      setC(guardado);
      setModoBusqueda(guardado.usarUbicacion ? "ubicacion" : guardado.zonaId ? "zona" : null);
    }
    setListo(true);
  }, []);

  const [paises, setPaises] = useState<Pais[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [modoBusqueda, setModoBusqueda] = useState<"zona" | "ubicacion" | null>(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  // Cargamos toda la geografía una sola vez. Después, cambiar País/Ciudad
  // es sólo estado local: ningún click vuelve a disparar una consulta.
  useEffect(() => {
    let activo = true;

    const cargarGeografia = async () => {
      try {
        const [paisesResult, ciudadesResult, zonasResult] = await Promise.all([
          supabase.from("paises").select("id, nombre, codigo_iso2").order("nombre"),
          supabase.from("ciudades").select("id, nombre, pais_id").order("nombre"),
          supabase.from("zonas").select("id, nombre, ciudad_id").order("nombre"),
        ]);

        if (!activo) return;

        const error = paisesResult.error || ciudadesResult.error || zonasResult.error;
        if (error) {
          setGeoError(`No se pudo cargar la geografía: ${error.message}`);
          return;
        }

        setPaises((paisesResult.data ?? []) as Pais[]);
        setCiudades((ciudadesResult.data ?? []) as Ciudad[]);
        setZonas((zonasResult.data ?? []) as Zona[]);
      } catch (error) {
        if (activo) {
          setGeoError(
            `No se pudo cargar la geografía: ${error instanceof Error ? error.message : "error de conexión"}`,
          );
        }
      }
    };

    void cargarGeografia();
    return () => {
      activo = false;
    };
  }, []);

  const ciudadesVisibles = c.paisId
    ? ciudades.filter((ci) => ci.pais_id === c.paisId)
    : [];

  const zonasVisibles = c.ciudadId
    ? zonas.filter((z) => z.ciudad_id === c.ciudadId)
    : [];

  const set = (parcial: Partial<Contexto>) => setC((prev) => ({ ...prev, ...parcial }));

  const alternar = (lista: string[], valor: string) =>
    lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

  const pedirUbicacion = () => {
    setModoBusqueda("ubicacion");
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setObteniendoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObteniendoUbicacion(false);
        set({
          usarUbicacion: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          paisId: null,
          paisNombre: undefined,
          ciudadId: null,
          ciudadNombre: undefined,
          zonaId: null,
          zonaNombre: undefined,
        });
      },
      () => {
        setObteniendoUbicacion(false);
        set({ usarUbicacion: false, lat: null, lng: null });
        setGeoError("No pudimos obtener tu ubicación. Puedes elegir una zona manualmente.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const elegirZona = () => {
    setModoBusqueda("zona");
    setGeoError(null);
    set({ usarUbicacion: false, lat: null, lng: null });
  };

  const puede = modoBusqueda === "ubicacion"
    ? c.usarUbicacion && c.lat !== null && c.lng !== null
    : !!c.paisId && !!c.ciudadId && !!c.zonaId;

  const buscar = () => {
    guardarContexto(c);
    navigate({ to: "/matches" });
  };

  if (!listo) return <Shell>{null}</Shell>;

  return (
    <Shell
      titulo="¿Dónde deberías comer hoy?"
      subtitulo="Tú pruebas. Tú evalúas. GUÍA·ME aprende."
    >
      {geoError && <div className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{geoError}</div>}

      <div className="grid gap-3 py-6">
        <button type="button" onClick={elegirZona} className={"w-full rounded-xl border px-5 py-4 text-left transition " + (modoBusqueda === "zona" ? "border-primary bg-primary/5" : "border-border bg-background")}>
          <div className="font-semibold">Elegir una zona</div>
          <div className="mt-1 text-sm text-muted-foreground">País → Ciudad → Zona</div>
        </button>
        <button type="button" onClick={pedirUbicacion} disabled={obteniendoUbicacion} className={"w-full rounded-xl border px-5 py-4 text-left transition " + (modoBusqueda === "ubicacion" ? "border-primary bg-primary/5" : "border-border bg-background") + " disabled:opacity-60"}>
          <div className="flex items-center gap-2 font-semibold"><MapPin size={18} /> {obteniendoUbicacion ? "Obteniendo tu ubicación…" : "Usar mi ubicación"}</div>
          <div className="mt-1 text-sm text-muted-foreground">Encuentra opciones cerca de donde estás</div>
        </button>
      </div>

      <div className="divide-y divide-border">
        {modoBusqueda === "zona" && (
          <>
        <Campo label="País">
          {paises.map((p) => (
            <Chip
              key={p.id}
              activo={c.paisId === p.id}
              onClick={() =>
                set({
                  paisId: p.id,
                  paisNombre: p.nombre,
                  ciudadId: null,
                  ciudadNombre: undefined,
                  zonaId: null,
                  zonaNombre: undefined,
                })
              }
            >
              {p.nombre}
            </Chip>
          ))}
        </Campo>

        {c.paisId && (
          <Campo label="Ciudad">
            {ciudadesVisibles.map((ci) => (
              <Chip
                key={ci.id}
                activo={c.ciudadId === ci.id}
                onClick={() =>
                  set({
                    ciudadId: ci.id,
                    ciudadNombre: ci.nombre,
                    zonaId: null,
                    zonaNombre: undefined,
                  })
                }
              >
                {ci.nombre}
              </Chip>
            ))}
          </Campo>
        )}

        {c.ciudadId && modoBusqueda === "zona" && (
          <Campo label="Zona">
            {zonasVisibles.map((z) => (
              <Chip
                key={z.id}
                activo={c.zonaId === z.id}
                onClick={() => set({ zonaId: z.id, zonaNombre: z.nombre })}
              >
                {z.nombre}
              </Chip>
            ))}
          </Campo>
        )}
        </>
        )}

        <Campo label="Con quién">
          {CON_QUIEN.map((x) => (
            <Chip key={x} activo={c.conQuien === x} onClick={() => set({ conQuien: x })}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Cuántas personas">
          {PERSONAS.map((x) => (
            <Chip key={x} activo={c.personas === x} onClick={() => set({ personas: x })}>
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Presupuesto por persona">
          {PRESUPUESTOS.map((p) => (
            <Chip
              key={p.label}
              activo={c.presupuesto === p.label}
              onClick={() => set({ presupuesto: p.label })}
            >
              {p.label}
            </Chip>
          ))}
        </Campo>

        <Campo label="Tipo de cocina">
          {COCINAS.map((x) => (
            <Chip
              key={x}
              activo={c.cocinas.includes(x)}
              onClick={() => set({ cocinas: alternar(c.cocinas, x) })}
            >
              {x}
            </Chip>
          ))}
        </Campo>

        <Campo label="Ambiente">
          {AMBIENTES.map((x) => (
            <Chip
              key={x}
              activo={c.ambientes.includes(x)}
              onClick={() => set({ ambientes: alternar(c.ambientes, x) })}
            >
              {x}
            </Chip>
          ))}
        </Campo>
      </div>

      <div className="py-8">
        <button type="button" disabled={!puede} onClick={buscar} className="btn-primary w-full disabled:opacity-40">
          Encontrar mi lugar
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {modoBusqueda === "ubicacion"
            ? "Usaremos tu ubicación actual para encontrar tus mejores opciones."
            : "Elige una zona o usa tu ubicación para empezar."}
        </p>
      </div>
    </Shell>
  );
}
