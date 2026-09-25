// Núcleo de dominio GUÍA·ME: contexto de usuario, MATCH V6.1 y utilidades.
import { supabase } from "@/integrations/supabase/client";

export type EstadoInfo = "verificado" | "comunidad" | "demo" | "pendiente";

export type Restaurante = {
  id: string;
  nombre: string;
  pais_id: string;
  ciudad_id: string;
  zona_id: string;
  direccion: string | null;
  cocina: string[];
  precio_min: number | null;
  precio_max: number | null;
  ambiente: string[];
  contextos: string[];
  lat: number | null;
  lng: number | null;
  telefono: string | null;
  web: string | null;
  horarios: string | null;
  capacidad_max: number | null;
  imagen_url: string | null;
  fuente: string | null;
  estado: EstadoInfo;
  food_avg: number | null;
  decor_avg: number | null;
  service_avg: number | null;
  num_evaluaciones: number;
  contexto_scores: Record<string, number> | null;
  pct_volveria: number | null;
  pct_recomendaria: number | null;
};

export const CON_QUIEN = ["Familia", "Pareja", "Amigos", "Trabajo", "Solo"] as const;
export const PERSONAS = ["1", "2", "3–4", "5–6", "7+"] as const;
export const AMBIENTES = [
  "Relajado",
  "Elegante",
  "Romántico",
  "Familiar",
  "Casual",
  "Animado",
  "Tranquilo",
] as const;
export const COCINAS = [
  "Panameña",
  "Criolla",
  "Mariscos",
  "Italiana",
  "Japonesa",
  "Asiática",
  "Parrilla",
  "Argentina",
  "Internacional",
  "Fusión",
  "Vegetariana",
  "Saludable",
  "Café",
  "Desayunos",
] as const;
export const PRESUPUESTOS = [
  { label: "$10–20", min: 10, max: 20 },
  { label: "$20–30", min: 20, max: 30 },
  { label: "$25–40", min: 25, max: 40 },
  { label: "$40–60", min: 40, max: 60 },
  { label: "$60+", min: 60, max: 120 },
] as const;

export type Contexto = {
  conQuien: string | null;
  personas: string | null;
  paisId: string | null;
  ciudadId: string | null;
  zonaId: string | null;
  cocinas: string[];
  presupuesto: string | null;
  ambientes: string[];
  usarUbicacion: boolean;
  lat: number | null;
  lng: number | null;
  paisNombre?: string | undefined;
  ciudadNombre?: string | undefined;
  zonaNombre?: string | undefined;
};

export const contextoVacio: Contexto = {
  conQuien: null,
  personas: null,
  paisId: null,
  ciudadId: null,
  zonaId: null,
  cocinas: [],
  presupuesto: null,
  ambientes: [],
  usarUbicacion: false,
  lat: null,
  lng: null,
};

const CTX_KEY = "guiame.contexto.v1";
const ANON_KEY = "guiame.anonId.v1";
const FAV_KEY = "guiame.favoritos.v1";

export function guardarContexto(c: Contexto) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CTX_KEY, JSON.stringify(c));
}

export function leerContexto(): Contexto | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CTX_KEY);
  if (!raw) return null;
  try {
    return { ...contextoVacio, ...(JSON.parse(raw) as Contexto) };
  } catch {
    return null;
  }
}

export function anonId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

// Favoritos: localStorage como fuente principal, backend best-effort.
export function leerFavoritos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export async function alternarFavorito(id: string): Promise<string[]> {
  const actuales = leerFavoritos();
  const activo = actuales.includes(id);
  const siguientes = activo ? actuales.filter((x) => x !== id) : [...actuales, id];
  localStorage.setItem(FAV_KEY, JSON.stringify(siguientes));
  try {
    if (activo) {
      await supabase.from("favoritos").delete().eq("anon_id", anonId()).eq("restaurante_id", id);
    } else {
      await supabase.from("favoritos").insert({ anon_id: anonId(), restaurante_id: id });
    }
  } catch {
    // sincronización best-effort
  }
  return siguientes;
}

export function rangoPrecio(r: Pick<Restaurante, "precio_min" | "precio_max">) {
  if (r.precio_min == null && r.precio_max == null) return "Precio pendiente";
  if (r.precio_min != null && r.precio_max != null) return `$${r.precio_min}–${r.precio_max}`;
  return `$${r.precio_min ?? r.precio_max}`;
}

export function distanciaKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ─────────────────────────────────────────────────────────────
// MATCH V6.1 — pesos fijos. No modificar sin aprobación.
// Zona 30 · Presupuesto 20 · Cocina 20 · Tipo de salida 15 · Ambiente 10 · Personas 5
// ─────────────────────────────────────────────────────────────
export const PESOS_MATCH = {
  zona: 30,
  presupuesto: 20,
  cocina: 20,
  salida: 15,
  ambiente: 10,
  personas: 5,
} as const;

export type Razon = { etiqueta: string; detalle: string; puntos: number; de: number };
export type ResultadoMatch = { match: number; razones: Razon[]; distanciaKm: number | null };

function capacidadMinima(personas: string | null): number {
  switch (personas) {
    case "1":
      return 1;
    case "2":
      return 2;
    case "3–4":
      return 4;
    case "5–6":
      return 6;
    case "7+":
      return 8;
    default:
      return 1;
  }
}

export function calcularMatch(r: Restaurante, c: Contexto): ResultadoMatch {
  const razones: Razon[] = [];
  let total = 0;
  let dist: number | null = null;

  // Geografía (30). Zona ya viene filtrada en la consulta; la ubicación afina el puntaje.
  let geo = 0;
  if (c.usarUbicacion && c.lat != null && c.lng != null && r.lat != null && r.lng != null) {
    dist = distanciaKm(c.lat, c.lng, r.lat, r.lng);
    const cercania = Math.max(0, 1 - Math.min(dist, 10) / 10);
    geo = PESOS_MATCH.zona * (0.5 + 0.5 * cercania);
    razones.push({
      etiqueta: "Ubicación",
      detalle: `Está a ${dist.toFixed(1)} km de ti`,
      puntos: Math.round(geo),
      de: PESOS_MATCH.zona,
    });
  } else if (c.zonaId && r.zona_id === c.zonaId) {
    geo = PESOS_MATCH.zona;
    razones.push({
      etiqueta: "Zona",
      detalle: `Está en ${c.zonaNombre ?? "la zona que elegiste"}`,
      puntos: geo,
      de: PESOS_MATCH.zona,
    });
  }
  total += geo;

  // Presupuesto (20)
  const presu = PRESUPUESTOS.find((p) => p.label === c.presupuesto);
  let pPresu = 0;
  if (!presu) {
    pPresu = PESOS_MATCH.presupuesto * 0.5;
  } else if (r.precio_min != null && r.precio_max != null) {
    const solape =
      Math.min(presu.max, r.precio_max) - Math.max(presu.min, r.precio_min);
    const rango = Math.max(1, presu.max - presu.min);
    pPresu = PESOS_MATCH.presupuesto * Math.max(0, Math.min(1, solape / rango));
    razones.push({
      etiqueta: "Presupuesto",
      detalle:
        pPresu > 0
          ? `Tu rango ${presu.label} encaja con ${rangoPrecio(r)}`
          : `Su rango es ${rangoPrecio(r)}, fuera de ${presu.label}`,
      puntos: Math.round(pPresu),
      de: PESOS_MATCH.presupuesto,
    });
  }
  total += pPresu;

  // Cocina (20)
  let pCocina = 0;
  if (c.cocinas.length === 0) {
    pCocina = PESOS_MATCH.cocina * 0.5;
  } else {
    const coincidencias = r.cocina.filter((x) => c.cocinas.includes(x));
    pCocina = coincidencias.length > 0 ? PESOS_MATCH.cocina : 0;
    if (coincidencias.length > 0) {
      razones.push({
        etiqueta: "Cocina",
        detalle: `Buscas ${coincidencias.join(", ")}`,
        puntos: pCocina,
        de: PESOS_MATCH.cocina,
      });
    }
  }
  total += pCocina;

  // Tipo de salida (15) — combina el dato de ficha con la señal de comunidad.
  let pSalida = 0;
  if (c.conQuien) {
    const enFicha = r.contextos.includes(c.conQuien);
    const señal = r.contexto_scores?.[c.conQuien];
    if (enFicha) pSalida += PESOS_MATCH.salida * 0.7;
    if (typeof señal === "number") pSalida += PESOS_MATCH.salida * 0.3 * (señal / 100);
    pSalida = Math.min(PESOS_MATCH.salida, pSalida);
    if (pSalida > 0) {
      razones.push({
        etiqueta: "Tipo de salida",
        detalle:
          typeof señal === "number"
            ? `Vas con ${c.conQuien.toLowerCase()} · la comunidad lo señala para ${c.conQuien.toLowerCase()} (${señal}%)`
            : `Vas con ${c.conQuien.toLowerCase()}`,
        puntos: Math.round(pSalida),
        de: PESOS_MATCH.salida,
      });
    }
  } else {
    pSalida = PESOS_MATCH.salida * 0.5;
  }
  total += pSalida;

  // Ambiente (10)
  let pAmb = 0;
  if (c.ambientes.length === 0) {
    pAmb = PESOS_MATCH.ambiente * 0.5;
  } else {
    const coincidencias = r.ambiente.filter((x) => c.ambientes.includes(x));
    pAmb = coincidencias.length > 0 ? PESOS_MATCH.ambiente : 0;
    if (coincidencias.length > 0) {
      razones.push({
        etiqueta: "Ambiente",
        detalle: `Elegiste ambiente ${coincidencias.join(", ").toLowerCase()}`,
        puntos: pAmb,
        de: PESOS_MATCH.ambiente,
      });
    }
  }
  total += pAmb;

  // Personas / capacidad (5)
  let pPer = 0;
  const minCap = capacidadMinima(c.personas);
  if (r.capacidad_max == null) {
    pPer = PESOS_MATCH.personas * 0.5;
  } else if (r.capacidad_max >= minCap) {
    pPer = PESOS_MATCH.personas;
    razones.push({
      etiqueta: "Personas",
      detalle: `Recibe grupos de ${c.personas ?? minCap}`,
      puntos: pPer,
      de: PESOS_MATCH.personas,
    });
  }
  total += pPer;

  return { match: Math.max(0, Math.min(100, Math.round(total))), razones, distanciaKm: dist };
}

export const ETIQUETA_ESTADO: Record<EstadoInfo, string> = {
  verificado: "VERIFICADO",
  comunidad: "COMUNIDAD",
  demo: "DEMO",
  pendiente: "PENDIENTE",
};
