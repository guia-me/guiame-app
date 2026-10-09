// Núcleo de dominio GUÍA·ME: contexto de usuario, MATCH V6.1 y utilidades.
export type EstadoInfo = "verificado" | "comunidad" | "demo" | "pendiente";

export type Restaurante = {
  id: string;
  nombre: string;
  pais_id: string;
  ciudad_id: string;
  zona_id: string;
  direccion: string | null;
  cocina: string[];
  especialidades?: string[];
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
  cost_avg?: number | null;
  descripcion?: string | null;
  platos_recomendados?: string | null;
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
export const ANTOJOS = [
  "Hamburguesas","Tacos","Pizza","Sushi","BBQ","Steak","Pasta","Ceviche","Ramen","Pollo","Mariscos","Brunch","Café","Postres","Alitas","Sandwiches","Burritos","Empanadas","Arepas","Poke","Helados",
] as const;
export const COCINAS = [
  "Panameña",
  "Criolla",
  "Mexicana",
  "Peruana",
  "Venezolana",
  "Española",
  "Árabe",
  "Mariscos",
  "Italiana",
  "Japonesa",
  "Asiática",
  "Parrilla",
  "BBQ",
  "Argentina",
  "Internacional",
  "Carnes",
  "Fusión",
  "Vegetariana",
  "Saludable",
  "Café",
  "Cafetería",
  "Desayunos",
  "China",
  "Tailandesa",
  "India",
  "Francesa",
  "Mediterránea",
  "Vegana",
] as const;
export const PRESUPUESTOS = [
  { label: "$10–20", min: 10, max: 20 },
  { label: "$20–30", min: 20, max: 30 },
  { label: "$30–40", min: 30, max: 40 },
  { label: "$40–60", min: 40, max: 60 },
  { label: "$60+", min: 60, max: 120 },
] as const;

export type Contexto = {
  modoBusqueda: "restaurante" | "antojo";
  conQuien: string | null;
  personas: string | null;
  paisId: string | null;
  ciudadId: string | null;
  zonaId: string | null;
  cocinas: string[];
  presupuesto: string | null;
  ambientes: string[];
  antojos: string[];
  usarUbicacion: boolean;
  lat: number | null;
  lng: number | null;
  paisNombre?: string | undefined;
  ciudadNombre?: string | undefined;
  zonaNombre?: string | undefined;
};

export const contextoVacio: Contexto = {
  modoBusqueda: "restaurante",
  conQuien: null,
  personas: null,
  paisId: null,
  ciudadId: null,
  zonaId: null,
  cocinas: [],
  presupuesto: null,
  ambientes: [],
  antojos: [],
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
  // Los favoritos son locales por diseño: la pantalla ya los presenta como
  // "guardados en este dispositivo". No dependemos de autenticación Supabase.
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
  cocina: 10,
  antojo: 10,
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

/** Convierte campos de listas de Supabase a arrays seguros. Acepta arrays, JSON serializado o texto separado por comas/punto y coma/barra. */
export function normalizarLista(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string").map(x => x.trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  const raw = value.trim();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string").map(x => x.trim()).filter(Boolean);
  } catch {
    // El dato también puede venir como texto simple, no JSON.
  }
  return raw.split(/[,;|]/).map(x => x.trim()).filter(Boolean);
}

/** Normaliza los campos de lista de un restaurante antes de usarlos en la interfaz o en MATCH. */
export function normalizarRestaurante(value: unknown): Restaurante {
  const r = (value ?? {}) as Record<string, unknown>;
  return {
    ...(r as unknown as Restaurante),
    cocina: normalizarLista(r.cocina),
    especialidades: normalizarLista(r.especialidades),
    ambiente: normalizarLista(r.ambiente),
    contextos: normalizarLista(r.contextos),
  };
}

/** Coincidencia estricta de cocina para evitar mezclar categorías gastronómicas. */
export function coincideCocina(restaurante: string, buscada: string): boolean {
  const normalizar = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const a = normalizar(restaurante);
  const b = normalizar(buscada);
  if (!a || !b) return false;
  const grupos: Record<string, string[]> = {
    china: ["china", "chinese", "comida china", "cantonesa", "sichuan", "szechuan"],
    japonesa: ["japonesa", "japanese", "japon", "nikkei"],
    italiana: ["italiana", "italian", "italy"],
    mexicana: ["mexicana", "mexican", "mexico"],
    mariscos: ["mariscos", "seafood", "frutos del mar"],
    carnes: ["carnes", "carne", "meat", "steak", "steakhouse", "parrilla", "bbq", "barbecue", "barbacoa", "grill", "asado", "asados"],
    carne: ["carnes", "carne", "meat", "steak", "steakhouse", "parrilla", "bbq", "barbecue", "barbacoa", "grill", "asado", "asados"],
    steak: ["carnes", "carne", "meat", "steak", "steakhouse", "parrilla", "bbq", "barbecue", "barbacoa", "grill", "asado", "asados"],
    parrilla: ["carnes", "carne", "meat", "steak", "steakhouse", "parrilla", "bbq", "barbecue", "barbacoa", "grill", "asado", "asados"],
    bbq: ["carnes", "carne", "meat", "steak", "steakhouse", "parrilla", "bbq", "barbecue", "barbacoa", "grill", "asado", "asados"],
    espanola: ["espanola", "spanish"],
    peruana: ["peruana", "peruvian"],
    asiatica: ["asiatica", "asian"],
    tailandesa: ["tailandesa", "thai"],
    india: ["india", "indian"],
    arabe: ["arabe", "arab", "libanesa"],
    cafe: ["cafe", "cafeteria", "coffee"],
    cafeteria: ["cafe", "cafeteria", "coffee"],
    brunch: ["brunch", "desayunos", "desayuno", "cafe", "cafeteria"],
    desayunos: ["desayunos", "desayuno", "brunch", "cafe", "cafeteria"],
  };
  const opciones = grupos[b] ?? [b];
  const valores = a.split(/[\/;,|]+/).map(x => x.trim()).filter(Boolean);
  return valores.some(valor => opciones.includes(valor));
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

  // Cocina (10)
  let pCocina = 0;
  if (c.cocinas.length === 0) {
    pCocina = PESOS_MATCH.cocina * 0.5;
  } else {
    const coincidencias = normalizarLista(r.cocina).filter((x) => c.cocinas.some((buscada) => coincideCocina(x, buscada)));
    pCocina = coincidencias.length > 0 ? PESOS_MATCH.cocina : 0;
    if (c.cocinas.length > 0) {
      razones.push({
        etiqueta: "Cocina",
        detalle: coincidencias.length > 0 ? `Buscas ${coincidencias.join(", ")}` : `No coincide con ${c.cocinas.join(" / ")}`,
        puntos: pCocina,
        de: PESOS_MATCH.cocina,
      });
    }
  }
  total += pCocina;

  // Antojo / especialidad (10). No mezcla identidades gastronómicas: busca lo que quieres comer.
  let pAntojo = 0;
  if (!c.antojos || c.antojos.length === 0) {
    pAntojo = PESOS_MATCH.antojo * 0.5;
  } else {
    const normalizarAntojo = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const aliases: Record<string, string[]> = {
      hamburguesas: ["hamburguesa", "hamburguesas", "burger", "burgers"],
      tacos: ["taco", "tacos"], pizza: ["pizza"], sushi: ["sushi"],
      bbq: ["bbq", "barbecue", "barbacoa"], steak: ["steak", "steakhouse", "carne"],
      pasta: ["pasta"], ceviche: ["ceviche"], ramen: ["ramen"], pollo: ["pollo"],
      mariscos: ["mariscos", "seafood"], brunch: ["brunch"], cafe: ["cafe", "café"],
      postres: ["postre", "postres", "dessert", "desserts"], alitas: ["alitas", "wings"],
      sandwiches: ["sandwich", "sandwiches", "sándwich"], burritos: ["burrito", "burritos"],
      empanadas: ["empanada", "empanadas"], arepas: ["arepa", "arepas"], poke: ["poke"], helados: ["helado", "helados", "ice cream"],
    };
    const coincideAntojo = (rest: string, buscada: string) => {
      const a = normalizarAntojo(rest), b = normalizarAntojo(buscada);
      if (a === b || a.includes(b) || b.includes(a)) return true;
      return !!aliases[b]?.some(x => a === x || a.includes(x) || x.includes(a));
    };
    const disponibles = [...normalizarLista(r.especialidades), r.platos_recomendados ?? ""].filter(Boolean);
    const hits = c.antojos.filter(a => disponibles.some(x => coincideAntojo(x, a)));
    pAntojo = hits.length ? PESOS_MATCH.antojo : 0;
    if (hits.length) razones.push({ etiqueta: "Antojo", detalle: `Buscas ${hits.join(", ")}`, puntos: pAntojo, de: PESOS_MATCH.antojo });
  }
  total += pAntojo;

  // Tipo de salida (15) — combina el dato de ficha con la señal de comunidad.
  let pSalida = 0;
  if (c.conQuien) {
    const enFicha = normalizarLista(r.contextos).includes(c.conQuien);
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
    const coincidencias = normalizarLista(r.ambiente).filter((x) => c.ambientes.includes(x));
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
