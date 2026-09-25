export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aportes_ficha: {
        Row: {
          anon_id: string
          comentario: string | null
          created_at: string
          id: string
          restaurante_id: string
          tipo: string
          valor: string
        }
        Insert: {
          anon_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          restaurante_id: string
          tipo: string
          valor: string
        }
        Update: {
          anon_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          restaurante_id?: string
          tipo?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "aportes_ficha_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      aportes_restaurantes: {
        Row: {
          anon_id: string
          created_at: string
          estado: string
          id: string
          payload: Json
          restaurante_id: string | null
        }
        Insert: {
          anon_id: string
          created_at?: string
          estado?: string
          id?: string
          payload: Json
          restaurante_id?: string | null
        }
        Update: {
          anon_id?: string
          created_at?: string
          estado?: string
          id?: string
          payload?: Json
          restaurante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aportes_restaurantes_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      ciudades: {
        Row: {
          created_at: string
          id: string
          nombre: string
          pais_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          pais_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          pais_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ciudades_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          ambiente: string | null
          anon_id: string
          comentario: string | null
          con_quien: string | null
          created_at: string
          decor: number
          food: number
          id: string
          personas: string | null
          plato: string | null
          presupuesto: string | null
          recomendaria: boolean | null
          restaurante_id: string
          service: number
          volveria: Database["public"]["Enums"]["tri_respuesta"] | null
        }
        Insert: {
          ambiente?: string | null
          anon_id: string
          comentario?: string | null
          con_quien?: string | null
          created_at?: string
          decor: number
          food: number
          id?: string
          personas?: string | null
          plato?: string | null
          presupuesto?: string | null
          recomendaria?: boolean | null
          restaurante_id: string
          service: number
          volveria?: Database["public"]["Enums"]["tri_respuesta"] | null
        }
        Update: {
          ambiente?: string | null
          anon_id?: string
          comentario?: string | null
          con_quien?: string | null
          created_at?: string
          decor?: number
          food?: number
          id?: string
          personas?: string | null
          plato?: string | null
          presupuesto?: string | null
          recomendaria?: boolean | null
          restaurante_id?: string
          service?: number
          volveria?: Database["public"]["Enums"]["tri_respuesta"] | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          anon_id: string
          created_at: string
          id: string
          restaurante_id: string
        }
        Insert: {
          anon_id: string
          created_at?: string
          id?: string
          restaurante_id: string
        }
        Update: {
          anon_id?: string
          created_at?: string
          id?: string
          restaurante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      paises: {
        Row: {
          codigo: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      restaurantes: {
        Row: {
          ambiente: string[]
          capacidad_max: number | null
          ciudad_id: string
          cocina: string[]
          contexto_scores: Json
          contextos: string[]
          created_at: string
          decor_avg: number | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_info"]
          food_avg: number | null
          fuente: string | null
          horarios: string | null
          id: string
          imagen_url: string | null
          lat: number | null
          lng: number | null
          nombre: string
          num_evaluaciones: number
          pais_id: string
          pct_recomendaria: number | null
          pct_volveria: number | null
          precio_max: number | null
          precio_min: number | null
          service_avg: number | null
          telefono: string | null
          web: string | null
          zona_id: string
        }
        Insert: {
          ambiente?: string[]
          capacidad_max?: number | null
          ciudad_id: string
          cocina?: string[]
          contexto_scores?: Json
          contextos?: string[]
          created_at?: string
          decor_avg?: number | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_info"]
          food_avg?: number | null
          fuente?: string | null
          horarios?: string | null
          id?: string
          imagen_url?: string | null
          lat?: number | null
          lng?: number | null
          nombre: string
          num_evaluaciones?: number
          pais_id: string
          pct_recomendaria?: number | null
          pct_volveria?: number | null
          precio_max?: number | null
          precio_min?: number | null
          service_avg?: number | null
          telefono?: string | null
          web?: string | null
          zona_id: string
        }
        Update: {
          ambiente?: string[]
          capacidad_max?: number | null
          ciudad_id?: string
          cocina?: string[]
          contexto_scores?: Json
          contextos?: string[]
          created_at?: string
          decor_avg?: number | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_info"]
          food_avg?: number | null
          fuente?: string | null
          horarios?: string | null
          id?: string
          imagen_url?: string | null
          lat?: number | null
          lng?: number | null
          nombre?: string
          num_evaluaciones?: number
          pais_id?: string
          pct_recomendaria?: number | null
          pct_volveria?: number | null
          precio_max?: number | null
          precio_min?: number | null
          service_avg?: number | null
          telefono?: string | null
          web?: string | null
          zona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurantes_ciudad_id_fkey"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurantes_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurantes_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      zonas: {
        Row: {
          ciudad_id: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          ciudad_id: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          ciudad_id?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "zonas_ciudad_id_fkey"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "ciudades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_info: "verificado" | "comunidad" | "demo" | "pendiente"
      tri_respuesta: "si" | "no" | "tal_vez"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_info: ["verificado", "comunidad", "demo", "pendiente"],
      tri_respuesta: ["si", "no", "tal_vez"],
    },
  },
} as const
