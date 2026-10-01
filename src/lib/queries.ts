// Consultas a la base de datos. La geografía SIEMPRE se filtra en el servidor.
import { supabase } from "@/integrations/supabase/client";
import type { Contexto, Restaurante } from "./guiame";

export type Pais = { id: string; nombre: string; codigo_iso2: string | null };
export type Ciudad = { id: string; nombre: string; pais_id: string };
export type Zona = { id: string; nombre: string; ciudad_id: string };

export const paisesQuery = {
  queryKey: ["paises"],
  queryFn: async (): Promise<Pais[]> => {
    const { data, error } = await supabase.from("paises").select("id, nombre, codigo_iso2").order("nombre");
    if (error) throw error;
    return data ?? [];
  },
};

export const ciudadesQuery = (paisId: string | null) => ({
  queryKey: ["ciudades", paisId],
  enabled: !!paisId,
  queryFn: async (): Promise<Ciudad[]> => {
    const { data, error } = await supabase
      .from("ciudades")
      .select("id, nombre, pais_id")
      .eq("pais_id", paisId!)
      .order("nombre");
    if (error) throw error;
    return data ?? [];
  },
});

export const zonasQuery = (ciudadId: string | null) => ({
  queryKey: ["zonas", ciudadId],
  enabled: !!ciudadId,
  queryFn: async (): Promise<Zona[]> => {
    const { data, error } = await supabase
      .from("zonas")
      .select("id, nombre, ciudad_id")
      .eq("ciudad_id", ciudadId!)
      .order("nombre");
    if (error) throw error;
    return data ?? [];
  },
});

const CAMPOS = "*";

/**
 * Filtro geográfico ESTRICTO: país + ciudad + zona se aplican en la consulta.
 * Con "usar mi ubicación" se mantiene país (y ciudad si existe) y se acota por caja de coordenadas.
 */
export async function buscarRestaurantes(c: Contexto): Promise<Restaurante[]> {
  // La geografía canónica vive en pais_id/ciudad_id/zona_id. La consulta
  // siempre filtra en Supabase; el filtro local solo protege contra datos
  // inconsistentes que pudieran llegar desde una fuente externa.
  let q = supabase.from("restaurantes").select(CAMPOS).limit(60);

  // A missing geography value is intentionally treated as "unknown", not "wrong".
  // This keeps imported/community restaurants visible until their geography is enriched.
  if (c.paisId) q = q.or(`pais_id.is.null,pais_id.eq.undefined`);
  if (c.ciudadId) q = q.or(`ciudad_id.is.null,ciudad_id.eq.undefined`);

  if (c.usarUbicacion && c.lat != null && c.lng != null) {
    const dLat = 0.18;
    const dLng = 0.18;
    q = q
      .gte("lat", c.lat - dLat)
      .lte("lat", c.lat + dLat)
      .gte("lng", c.lng - dLng)
      .lte("lng", c.lng + dLng);
  } else if (c.zonaId) {
    q = q.or(`zona_id.is.null,zona_id.eq.undefined`);
  }

  const { data, error } = await q;
  if (error) throw error;
  const filas = (data ?? []) as unknown as Restaurante[];

  return filas.filter((r) => {
    if (c.paisId && r.pais_id !== c.paisId) return false;
    if (c.ciudadId && r.ciudad_id !== c.ciudadId) return false;
    if (!c.usarUbicacion && c.zonaId && r.zona_id !== c.zonaId) return false;
    return true;
  });
}

export const restauranteQuery = (id: string) => ({
  queryKey: ["restaurante", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("restaurantes").select(CAMPOS).eq("id", id).single();
    if (error) throw error;
    return data as unknown as Restaurante;
  },
});

export const evaluacionesQuery = (id: string) => ({
  queryKey: ["evaluaciones", id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("restaurante_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  },
});

export const aportesFichaQuery = (id: string) => ({
  queryKey: ["aportes_ficha", id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("aportes_ficha")
      .select("*")
      .eq("restaurante_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  },
});

export const porIdsQuery = (ids: string[]) => ({
  queryKey: ["restaurantes", "ids", ids.join(",")],
  enabled: ids.length > 0,
  queryFn: async (): Promise<Restaurante[]> => {
    const { data, error } = await supabase.from("restaurantes").select(CAMPOS).in("id", ids);
    if (error) throw error;
    return (data ?? []) as unknown as Restaurante[];
  },
});

export const mapaQuery = (ciudadId: string | null) => ({
  queryKey: ["mapa", ciudadId],
  queryFn: async (): Promise<Restaurante[]> => {
    let q = supabase.from("restaurantes").select(CAMPOS).not("lat", "is", null).limit(300);
    if (ciudadId) q = q.eq("ciudad_id", ciudadId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Restaurante[];
  },
});
