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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      locations: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      outings: {
        Row: {
          created_at: string | null
          date_time: string
          description: string | null
          end_date: string | null
          id: string
          location: string
          location_id: string | null
          max_participants: number
          organizer_id: string | null
          outing_type: Database["public"]["Enums"]["outing_type"]
          photos: string[] | null
          reminder_sent: boolean | null
          session_report: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_time: string
          description?: string | null
          end_date?: string | null
          id?: string
          location: string
          location_id?: string | null
          max_participants?: number
          organizer_id?: string | null
          outing_type: Database["public"]["Enums"]["outing_type"]
          photos?: string[] | null
          reminder_sent?: boolean | null
          session_report?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_time?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string
          location_id?: string | null
          max_participants?: number
          organizer_id?: string | null
          outing_type?: Database["public"]["Enums"]["outing_type"]
          photos?: string[] | null
          reminder_sent?: boolean | null
          session_report?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apnea_level: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          member_status: Database["public"]["Enums"]["member_status"] | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          apnea_level?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          member_status?: Database["public"]["Enums"]["member_status"] | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          apnea_level?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          member_status?: Database["public"]["Enums"]["member_status"] | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          cancelled_at: string | null
          carpool_option: Database["public"]["Enums"]["carpool_option"] | null
          carpool_seats: number | null
          created_at: string | null
          id: string
          is_present: boolean | null
          outing_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          carpool_option?: Database["public"]["Enums"]["carpool_option"] | null
          carpool_seats?: number | null
          created_at?: string | null
          id?: string
          is_present?: boolean | null
          outing_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          carpool_option?: Database["public"]["Enums"]["carpool_option"] | null
          carpool_seats?: number | null
          created_at?: string | null
          id?: string
          is_present?: boolean | null
          outing_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_outing_id_fkey"
            columns: ["outing_id"]
            isOneToOne: false
            referencedRelation: "outings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      is_encadrant_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "organizer" | "member"
      booking_status: "confirmé" | "annulé" | "en_attente"
      carpool_option: "none" | "driver" | "passenger"
      member_status: "Membre" | "Encadrant"
      outing_type: "Fosse" | "Mer" | "Piscine" | "Étang" | "Dépollution"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "organizer", "member"],
      booking_status: ["confirmé", "annulé", "en_attente"],
      carpool_option: ["none", "driver", "passenger"],
      member_status: ["Membre", "Encadrant"],
      outing_type: ["Fosse", "Mer", "Piscine", "Étang", "Dépollution"],
    },
  },
} as const
