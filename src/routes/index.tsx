import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Chip, Campo, Shell } from "@/components/guiame/ui";
import { supabase } from "@/integrations/supabase/client";
import {
  AMBIENTES, COCINAS, CON_QUIEN, PERSONAS, PRESUPUESTOS,
  contextoVacio, guardarContexto, leerContexto, type Contexto,
} from "@/lib/guiame";
import type { Pais, Ciudad, Zona } from "@/lib/queries";

const PANAMA_HERO = "https://images.unsplash.com/photo-1587759301533-ae42d7065a80?auto=format&fit=crop&w=1400&q=86";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GUÍA·ME — Tu guía de restaurantes" },
      { name: "description", content: "Dinos qué buscas y encuentra los restaurantes que mejor encajan contigo." },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const navigate = useNavigate();
  const [c, setC] = useState<Contexto>(contextoVacio);
  const [listo, setListo] = useState(false);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [modo, setModo] = useState<"zona" | "ubicacion" | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mostrarUbicacion, setMostrarUbicacion] = useState(false);

  useEffect(() => {
    const saved = leerContexto();
    if (saved) {
      setC(saved);
      setModo(saved.usarUbicacion ? "ubicacion" : saved.zonaId ? "zona" : null);
    }
    Promise.all([
      supabase.from("paises").select("id,nombre,codigo_iso2").order("nombre"),
      supabase.from("ciudades").select("id,nombre,pais_id").order("nombre"),
      supabase.from("zonas").select("id,nombre,ciudad_id").order("nombre"),
    ]).then(([p, ci, z]) => {
      if (!p.error && !ci.error && !z.error) {
        setPaises((p.data ?? []) as Pais[]);
        setCiudades((ci.data ?? []) as Ciudad[]);
        setZonas((z.data ?? []) as Zona[]);
      } else {
        setGeoError("No pudimos cargar las opciones de ubicación.");
      }
      setListo(true);
    }).catch(() => {
      setGeoError("No pudimos conectar con GUÍA·ME.");
      setListo(true);
    });
  }, []);

  const set = (patch: Partial<Contexto>) => setC(prev => ({ ...prev, ...patch }));
  const ciudadesVisibles = c.paisId ? ciudades.filter(x => x.pais_id === c.paisId) : [];
  const zonasVisibles = c.ciudadId ? zonas.filter(x => x.ciudad_id === c.ciudadId) : [];

  const usarUbicacion = () => {
    setModo("ubicacion");
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no permite usar la ubicación.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLoading(false);
        const patch: Partial<Contexto> = {
          usarUbicacion: true, lat: pos.coords.latitude, lng: pos.coords.longitude,
          paisId: null, ciudadId: null, zonaId: null,
          paisNombre: undefined, ciudadNombre: undefined, zonaNombre: undefined,
        };
        set(patch);
        guardarContexto({ ...c, ...patch });
      },
      () => {
        setGeoLoading(false);
        set({ usarUbicacion: false, lat: null, lng: null });
        setGeoError("No pudimos obtener tu ubicación. Puedes elegir una zona.");
        setModo("zona");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const elegirZona = () => {
    setModo("zona");
    setMostrarUbicacion(true);
    set({ usarUbicacion: false, lat: null, lng: null });
  };

  const puede = modo === "ubicacion"
    ? c.usarUbicacion && c.lat != null && c.lng != null
    : !!c.paisId && !!c.ciudadId && !!c.zonaId;

  const buscar = () => {
    guardarContexto(c);
    navigate({ to: "/matches" });
  };

  if (!listo) {
    return (
      <div className="gm-processing">
        <div className="gm-processing-logo"><span className="gm-logo">GUÍA<span>·</span>ME<small>TU GUÍA DE RESTAURANTES</small></span></div>
        <p>Cargando tu guía gastronómica…</p>
      </div>
    );
  }

  return (
    <Shell home>
      <section className="gm-home-hero">
        <img src={PANAMA_HERO} alt="" />
        <div className="gm-home-copy">
          <div className="gm-kicker">TU GUÍA GASTRONÓMICA PERSONAL</div>
          <h1>Buena comida,<br />mejores momentos.</h1>
          <p>Cuéntanos qué buscas y te recomendamos los lugares que mejor encajan contigo.</p>
        </div>
      </section>

      <section className="gm-home-panel">
        {geoError && <div className="gm-error">{geoError}</div>}

        <div className="gm-location-card">
          <div>
            <strong>
              {c.zonaNombre || (c.usarUbicacion ? "Tu ubicación actual" : "¿Dónde quieres comer?")}
            </strong>
            <small>
              {c.usarUbicacion ? "Buscando cerca de ti" : c.ciudadNombre ? c.ciudadNombre : "Selecciona una zona"}
            </small>
          </div>
          <button type="button" onClick={() => setMostrarUbicacion(v => !v)}>
            {mostrarUbicacion ? "CERRAR" : "CAMBIAR"}
          </button>
        </div>

        <div className="gm-mode-grid">
          <button type="button" className={modo === "zona" ? "gm-mode-btn active" : "gm-mode-btn"} onClick={elegirZona}>
            ZONA
          </button>
          <button type="button" className={modo === "ubicacion" ? "gm-mode-btn active" : "gm-mode-btn"} onClick={usarUbicacion}>
            <Navigation size={12} style={{verticalAlign:"-2px",marginRight:4}} />
            MI UBICACIÓN
          </button>
        </div>

        {(mostrarUbicacion || modo === "zona") && (
          <div>
            <Campo label="País">
              {paises.map(p => (
                <Chip key={p.id} activo={!c.usarUbicacion && c.paisId === p.id} onClick={() => {
                  set({paisId:p.id,paisNombre:p.nombre,ciudadId:null,ciudadNombre:undefined,zonaId:null,zonaNombre:undefined,usarUbicacion:false,lat:null,lng:null});
                  setModo("zona");
                }}>{p.nombre}</Chip>
              ))}
            </Campo>

            {c.paisId && (
              <Campo label="Ciudad">
                {ciudadesVisibles.map(x => (
                  <Chip key={x.id} activo={c.ciudadId === x.id} onClick={() => set({ciudadId:x.id,ciudadNombre:x.nombre,zonaId:null,zonaNombre:undefined})}>
                    {x.nombre}
                  </Chip>
                ))}
              </Campo>
            )}

            {c.ciudadId && (
              <Campo label="Zona">
                {zonasVisibles.map(x => (
                  <Chip key={x.id} activo={c.zonaId === x.id} onClick={() => set({zonaId:x.id,zonaNombre:x.nombre})}>
                    {x.nombre}
                  </Chip>
                ))}
              </Campo>
            )}
          </div>
        )}

        <div className="gm-filter-section">
          <p className="gm-label">Con quién</p>
          <div className="gm-chips">{CON_QUIEN.map(x => <Chip key={x} activo={c.conQuien===x} onClick={() => set({conQuien:x})}>{x}</Chip>)}</div>
        </div>
        <div className="gm-filter-section">
          <p className="gm-label">Personas</p>
          <div className="gm-chips">{PERSONAS.map(x => <Chip key={x} activo={c.personas===x} onClick={() => set({personas:x})}>{x}</Chip>)}</div>
        </div>
        <div className="gm-filter-section">
          <p className="gm-label">Presupuesto por persona</p>
          <div className="gm-chips">{PRESUPUESTOS.map(x => <Chip key={x.label} activo={c.presupuesto===x.label} onClick={() => set({presupuesto:x.label})}>{x.label}</Chip>)}</div>
        </div>
        <div className="gm-filter-section">
          <p className="gm-label">Tipo de cocina</p>
          <div className="gm-chips">{COCINAS.map(x => <Chip key={x} activo={c.cocinas.includes(x)} onClick={() => set({cocinas:c.cocinas.includes(x)?c.cocinas.filter(v=>v!==x):[...c.cocinas,x]})}>{x}</Chip>)}</div>
        </div>
        <div className="gm-filter-section">
          <p className="gm-label">Ambiente</p>
          <div className="gm-chips">{AMBIENTES.map(x => <Chip key={x} activo={c.ambientes.includes(x)} onClick={() => set({ambientes:c.ambientes.includes(x)?c.ambientes.filter(v=>v!==x):[...c.ambientes,x]})}>{x}</Chip>)}</div>
        </div>

        <button className="gm-primary" disabled={!puede || geoLoading} onClick={buscar}>
          {geoLoading ? "OBTENIENDO UBICACIÓN…" : "ENCONTRAR MI MATCH  →"}
        </button>
        <p style={{textAlign:"center",fontSize:9,color:"#898279",margin:"9px 0 0"}}>
          {modo === "ubicacion" ? "Usaremos tu ubicación para encontrar opciones cercanas." : "País → Ciudad → Zona. Tu elección se guarda en este dispositivo."}
        </p>
      </section>
    </Shell>
  );
}
