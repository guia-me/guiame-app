import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { ciudadesQuery, paisesQuery, zonasQuery } from "@/lib/queries";

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
    if (guardado) setC(guardado);
    setListo(true);
  }, []);

  const paises = useQuery(paisesQuery);
  const ciudades = useQuery(ciudadesQuery(c.paisId));
  const zonas = useQuery(zonasQuery(c.ciudadId));

  const set = (parcial: Partial<Contexto>) => setC((prev) => ({ ...prev, ...parcial }));

  const alternar = (lista: string[], valor: string) =>
    lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

  const pedirUbicacion = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        set({
          usarUbicacion: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => set({ usarUbicacion: false, lat: null, lng: null }),
    );
  };

  const puede = !!c.paisId && !!c.ciudadId && (!!c.zonaId || c.usarUbicacion);

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
      <div className="divide-y divide-border">
        <Campo label="País">
          {(paises.data ?? []).map((p) => (
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
            {(ciudades.data ?? []).map((ci) => (
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

        {c.ciudadId && (
          <Campo label="Zona">
            {(zonas.data ?? []).map((z) => (
              <Chip
                key={z.id}
                activo={c.zonaId === z.id}
                onClick={() => set({ zonaId: z.id, zonaNombre: z.nombre })}
              >
                {z.nombre}
              </Chip>
            ))}
            <Chip activo={c.usarUbicacion} onClick={pedirUbicacion}>
              <MapPin size={14} className="mr-1.5" /> Usar mi ubicación
            </Chip>
          </Campo>
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
          Elige país, ciudad y zona (o tu ubicación) para empezar.
        </p>
      </div>
    </Shell>
  );
}
