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
      carpool_passengers: {
        Row: {
          carpool_id: string
          created_at: string
          id: string
          passenger_id: string
        }
        Insert: {
          carpool_id: string
          created_at?: string
          id?: string
          passenger_id: string
        }
        Update: {
          carpool_id?: string
          created_at?: string
          id?: string
          passenger_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpool_passengers_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "carpools"
            referencedColumns: ["id"]
          },
        ]
      }
      carpools: {
        Row: {
          available_seats: number
          created_at: string
          departure_time: string
          driver_id: string
          id: string
          maps_link: string | null
          meeting_point: string
          notes: string | null
          outing_id: string
          updated_at: string
        }
        Insert: {
          available_seats: number
          created_at?: string
          departure_time: string
          driver_id: string
          id?: string
          maps_link?: string | null
          meeting_point: string
          notes?: string | null
          outing_id: string
          updated_at?: string
        }
        Update: {
          available_seats?: number
          created_at?: string
          departure_time?: string
          driver_id?: string
          id?: string
          maps_link?: string | null
          meeting_point?: string
          notes?: string | null
          outing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpools_outing_id_fkey"
            columns: ["outing_id"]
            isOneToOne: false
            referencedRelation: "outings"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members_directory: {
        Row: {
          address: string | null
          apnea_level: string | null
          birth_date: string | null
          board_role: string | null
          buddies_charter_signed: boolean
          created_at: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          fsgt_insurance_ok: boolean
          gender: string | null
          id: string
          is_encadrant: boolean
          joined_at: string | null
          last_name: string
          medical_certificate_ok: boolean
          member_id: string
          notes: string | null
          payment_status: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          apnea_level?: string | null
          birth_date?: string | null
          board_role?: string | null
          buddies_charter_signed?: boolean
          created_at?: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          fsgt_insurance_ok?: boolean
          gender?: string | null
          id?: string
          is_encadrant?: boolean
          joined_at?: string | null
          last_name: string
          medical_certificate_ok?: boolean
          member_id: string
          notes?: string | null
          payment_status?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          apnea_level?: string | null
          birth_date?: string | null
          board_role?: string | null
          buddies_charter_signed?: boolean
          created_at?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          fsgt_insurance_ok?: boolean
          gender?: string | null
          id?: string
          is_encadrant?: boolean
          joined_at?: string | null
          last_name?: string
          medical_certificate_ok?: boolean
          member_id?: string
          notes?: string | null
          payment_status?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_catalog: {
        Row: {
          created_at: string
          description: string | null
          estimated_value: number | null
          id: string
          name: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          name: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_history: {
        Row: {
          action_type: string
          created_at: string
          created_by: string
          from_user_id: string | null
          id: string
          inventory_id: string
          new_status: Database["public"]["Enums"]["equipment_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["equipment_status"] | null
          to_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by: string
          from_user_id?: string | null
          id?: string
          inventory_id: string
          new_status?: Database["public"]["Enums"]["equipment_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["equipment_status"] | null
          to_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string
          from_user_id?: string | null
          id?: string
          inventory_id?: string
          new_status?: Database["public"]["Enums"]["equipment_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["equipment_status"] | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_history_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "equipment_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inventory: {
        Row: {
          acquired_at: string
          catalog_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          photo_url: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          unique_code: string
          updated_at: string
        }
        Insert: {
          acquired_at?: string
          catalog_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          unique_code: string
          updated_at?: string
        }
        Update: {
          acquired_at?: string
          catalog_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          unique_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inventory_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inventory_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_outing_participants: {
        Row: {
          created_at: string
          id: string
          member_id: string
          outing_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          outing_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          outing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_outing_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "club_members_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_outing_participants_outing_id_fkey"
            columns: ["outing_id"]
            isOneToOne: false
            referencedRelation: "outings"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          comments: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          max_depth: number | null
          name: string
          photo_url: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          max_depth?: number | null
          name: string
          photo_url?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          max_depth?: number | null
          name?: string
          photo_url?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      membership_yearly_status: {
        Row: {
          buddies_charter_signed: boolean
          created_at: string
          fsgt_insurance_ok: boolean
          id: string
          medical_certificate_ok: boolean
          member_id: string
          payment_status: boolean
          season_year: number
          updated_at: string
        }
        Insert: {
          buddies_charter_signed?: boolean
          created_at?: string
          fsgt_insurance_ok?: boolean
          id?: string
          medical_certificate_ok?: boolean
          member_id: string
          payment_status?: boolean
          season_year: number
          updated_at?: string
        }
        Update: {
          buddies_charter_signed?: boolean
          created_at?: string
          fsgt_insurance_ok?: boolean
          id?: string
          medical_certificate_ok?: boolean
          member_id?: string
          payment_status?: boolean
          season_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_yearly_status_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "club_members_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      outings: {
        Row: {
          created_at: string | null
          date_time: string
          description: string | null
          end_date: string | null
          id: string
          is_archived: boolean
          is_deleted: boolean
          is_staff_only: boolean
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
          is_archived?: boolean
          is_deleted?: boolean
          is_staff_only?: boolean
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
          is_archived?: boolean
          is_deleted?: boolean
          is_staff_only?: boolean
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
          member_code: string | null
          member_status: Database["public"]["Enums"]["member_status"] | null
          phone: string | null
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
          member_code?: string | null
          member_status?: Database["public"]["Enums"]["member_status"] | null
          phone?: string | null
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
          member_code?: string | null
          member_status?: Database["public"]["Enums"]["member_status"] | null
          phone?: string | null
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
      can_view_member_details: {
        Args: { _member_email: string }
        Returns: boolean
      }
      get_club_stats: { Args: { p_year?: number }; Returns: Json }
      get_outing_confirmed_count: {
        Args: { outing_uuid: string }
        Returns: number
      }
      get_outing_participants: {
        Args: { outing_uuid: string }
        Returns: {
          avatar_url: string
          first_name: string
          id: string
          last_name: string
          member_status: string
        }[]
      }
      get_trombinoscope_members: {
        Args: never
        Returns: {
          apnea_level: string
          avatar_url: string
          board_role: string
          email: string
          first_name: string
          id: string
          is_encadrant: boolean
          last_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_encadrant: { Args: never; Returns: boolean }
      is_encadrant_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "organizer" | "member"
      booking_status: "confirmé" | "annulé" | "en_attente"
      carpool_option: "none" | "driver" | "passenger"
      equipment_status: "disponible" | "prêté" | "perdu" | "cassé" | "rebuté"
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
      equipment_status: ["disponible", "prêté", "perdu", "cassé", "rebuté"],
      member_status: ["Membre", "Encadrant"],
      outing_type: ["Fosse", "Mer", "Piscine", "Étang", "Dépollution"],
    },
  },
} as const
