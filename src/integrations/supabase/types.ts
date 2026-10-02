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
      article_fetch_log: {
        Row: {
          category: string | null
          duplicate_count: number
          error: string | null
          id: string
          inserted_count: number
          provider: string | null
          ran_at: string
          rate_limited: boolean
          status: string
        }
        Insert: {
          category?: string | null
          duplicate_count?: number
          error?: string | null
          id?: string
          inserted_count?: number
          provider?: string | null
          ran_at?: string
          rate_limited?: boolean
          status?: string
        }
        Update: {
          category?: string | null
          duplicate_count?: number
          error?: string | null
          id?: string
          inserted_count?: number
          provider?: string | null
          ran_at?: string
          rate_limited?: boolean
          status?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          ai_categorized_as: string | null
          ai_meta_description: string | null
          ai_summary: string | null
          ai_takeaways: string[] | null
          author: string | null
          category: string
          content: string | null
          country: string | null
          created_at: string
          description: string | null
          external_id: string
          fetched_at: string
          id: string
          image_url: string | null
          is_breaking: boolean
          is_editors_pick: boolean
          is_featured: boolean
          is_original: boolean
          keywords: string[] | null
          language: string | null
          provider: string
          published_at: string | null
          reading_time_minutes: number | null
          search_vector: unknown
          slug: string
          source_id: string | null
          source_name: string | null
          status: string
          title: string
          updated_at: string
          url: string | null
          view_count: number
        }
        Insert: {
          ai_categorized_as?: string | null
          ai_meta_description?: string | null
          ai_summary?: string | null
          ai_takeaways?: string[] | null
          author?: string | null
          category: string
          content?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          external_id: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          is_breaking?: boolean
          is_editors_pick?: boolean
          is_featured?: boolean
          is_original?: boolean
          keywords?: string[] | null
          language?: string | null
          provider?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          search_vector?: unknown
          slug: string
          source_id?: string | null
          source_name?: string | null
          status?: string
          title: string
          updated_at?: string
          url?: string | null
          view_count?: number
        }
        Update: {
          ai_categorized_as?: string | null
          ai_meta_description?: string | null
          ai_summary?: string | null
          ai_takeaways?: string[] | null
          author?: string | null
          category?: string
          content?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          external_id?: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          is_breaking?: boolean
          is_editors_pick?: boolean
          is_featured?: boolean
          is_original?: boolean
          keywords?: string[] | null
          language?: string | null
          provider?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          search_vector?: unknown
          slug?: string
          source_id?: string | null
          source_name?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
          view_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
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
      app_role: ["admin", "editor", "user"],
    },
  },
} as const
