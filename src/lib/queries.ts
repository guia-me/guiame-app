// Consultas a la base de datos. La geografía SIEMPRE se filtra en el servidor.
import { supabase } from "@/integrations/supabase/client";
import type { Contexto, Restaurante } from "./guiame";

export type Pais = { id: string; nombre: string; codigo: string };
export type Ciudad = { id: string; nombre: string; pais_id: string };
export type Zona = { id: string; nombre: string; ciudad_id: string };

export const paisesQuery = {
  queryKey: ["paises"],
  queryFn: async (): Promise<Pais[]> => {
    const { data, error } = await supabase.from("paises").select("id, nombre, codigo").order("nombre");
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
  let q = supabase.from("restaurantes").select(CAMPOS).limit(60);

  if (c.paisId) q = q.eq("pais_id", c.paisId);
  if (c.ciudadId) q = q.eq("ciudad_id", c.ciudadId);

  if (c.usarUbicacion && c.lat != null && c.lng != null) {
    const dLat = 0.18; // ~20 km
    const dLng = 0.18;
    q = q
      .gte("lat", c.lat - dLat)
      .lte("lat", c.lat + dLat)
      .gte("lng", c.lng - dLng)
      .lte("lng", c.lng + dLng);
  } else if (c.zonaId) {
    q = q.eq("zona_id", c.zonaId);
  }

  const { data, error } = await q;
  if (error) throw error;
  const filas = (data ?? []) as unknown as Restaurante[];

  // Segunda validación en el frontend: nunca mostrar otra zona/ciudad/país.
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
