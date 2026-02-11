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
      activity_logs: {
        Row: {
          action: string
          after_state: string | null
          before_state: string | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          timestamp: string
          user_email: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          after_state?: string | null
          before_state?: string | null
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          timestamp?: string
          user_email?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          after_state?: string | null
          before_state?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          timestamp?: string
          user_email?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      agreements: {
        Row: {
          agreed_price_per_kg: number | null
          created_at: string
          credit_days: number | null
          delivery_slot: string | null
          distribution_partner: string | null
          esign_status: string | null
          expected_first_order_date: string | null
          expected_weekly_volume_kg: number | null
          id: string
          mail_id: string | null
          other_cities: string[] | null
          other_skus: string[] | null
          outlets_in_bangalore: number | null
          payment_type: string | null
          pricing_type: string | null
          quality_feedback: boolean | null
          quality_remarks: string | null
          remarks: string | null
          sample_order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agreed_price_per_kg?: number | null
          created_at?: string
          credit_days?: number | null
          delivery_slot?: string | null
          distribution_partner?: string | null
          esign_status?: string | null
          expected_first_order_date?: string | null
          expected_weekly_volume_kg?: number | null
          id?: string
          mail_id?: string | null
          other_cities?: string[] | null
          other_skus?: string[] | null
          outlets_in_bangalore?: number | null
          payment_type?: string | null
          pricing_type?: string | null
          quality_feedback?: boolean | null
          quality_remarks?: string | null
          remarks?: string | null
          sample_order_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agreed_price_per_kg?: number | null
          created_at?: string
          credit_days?: number | null
          delivery_slot?: string | null
          distribution_partner?: string | null
          esign_status?: string | null
          expected_first_order_date?: string | null
          expected_weekly_volume_kg?: number | null
          id?: string
          mail_id?: string | null
          other_cities?: string[] | null
          other_skus?: string[] | null
          outlets_in_bangalore?: number | null
          payment_type?: string | null
          pricing_type?: string | null
          quality_feedback?: boolean | null
          quality_remarks?: string | null
          remarks?: string | null
          sample_order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_sample_order_id_fkey"
            columns: ["sample_order_id"]
            isOneToOne: false
            referencedRelation: "sample_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          assigned_to: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          notes: string | null
          restaurant_name: string
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
        }
        Insert: {
          appointment_type: string
          assigned_to?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          restaurant_name: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
        }
        Update: {
          appointment_type?: string
          assigned_to?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          restaurant_name?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
        }
        Relationships: []
      }
      avocado_specs: {
        Row: {
          box_count: number | null
          consumption_days: number
          grammage: number | null
          id: string
          quantity_kg: number
          sample_order_id: string
          sku_name: string | null
          stage: string
        }
        Insert: {
          box_count?: number | null
          consumption_days: number
          grammage?: number | null
          id?: string
          quantity_kg: number
          sample_order_id: string
          sku_name?: string | null
          stage: string
        }
        Update: {
          box_count?: number | null
          consumption_days?: number
          grammage?: number | null
          id?: string
          quantity_kg?: number
          sample_order_id?: string
          sku_name?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "avocado_specs_sample_order_id_fkey"
            columns: ["sample_order_id"]
            isOneToOne: false
            referencedRelation: "sample_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_slots: {
        Row: {
          end_time: string
          id: string
          is_active: boolean | null
          slot_name: string
          start_time: string
        }
        Insert: {
          end_time: string
          id?: string
          is_active?: boolean | null
          slot_name: string
          start_time: string
        }
        Update: {
          end_time?: string
          id?: string
          is_active?: boolean | null
          slot_name?: string
          start_time?: string
        }
        Relationships: []
      }
      distribution_partners: {
        Row: {
          area_coverage: string | null
          city: string
          commission_pct: number | null
          id: string
          name: string
          status: string
        }
        Insert: {
          area_coverage?: string | null
          city?: string
          commission_pct?: number | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          area_coverage?: string | null
          city?: string
          commission_pct?: number | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      drop_reasons: {
        Row: {
          id: string
          is_active: boolean | null
          reason_text: string
          step_number: number
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          reason_text: string
          step_number: number
        }
        Update: {
          id?: string
          is_active?: boolean | null
          reason_text?: string
          step_number?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          avocado_consumption: string | null
          avocado_variety: string | null
          call_count: number | null
          client_name: string
          contact_number: string | null
          created_at: string
          created_by: string | null
          current_supplier: string | null
          estimated_monthly_spend: number | null
          franchised: boolean | null
          geo_lat: number | null
          geo_lng: number | null
          gst_id: string | null
          id: string
          last_activity_date: string | null
          locality: string | null
          outlet_address: string | null
          outlet_photo_url: string | null
          pincode: string
          pm_contact: string | null
          prospect_id: string | null
          purchase_manager_name: string | null
          remarks: string | null
          status: string
          updated_at: string
          visit_count: number | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          avocado_consumption?: string | null
          avocado_variety?: string | null
          call_count?: number | null
          client_name: string
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          current_supplier?: string | null
          estimated_monthly_spend?: number | null
          franchised?: boolean | null
          geo_lat?: number | null
          geo_lng?: number | null
          gst_id?: string | null
          id?: string
          last_activity_date?: string | null
          locality?: string | null
          outlet_address?: string | null
          outlet_photo_url?: string | null
          pincode: string
          pm_contact?: string | null
          prospect_id?: string | null
          purchase_manager_name?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
          visit_count?: number | null
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          avocado_consumption?: string | null
          avocado_variety?: string | null
          call_count?: number | null
          client_name?: string
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          current_supplier?: string | null
          estimated_monthly_spend?: number | null
          franchised?: boolean | null
          geo_lat?: number | null
          geo_lng?: number | null
          gst_id?: string | null
          id?: string
          last_activity_date?: string | null
          locality?: string | null
          outlet_address?: string | null
          outlet_photo_url?: string | null
          pincode?: string
          pm_contact?: string | null
          prospect_id?: string | null
          purchase_manager_name?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
          visit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_email: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_email?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_email?: string | null
        }
        Relationships: []
      }
      pincode_persona_map: {
        Row: {
          id: string
          locality: string
          pincode: string
          role: Database["public"]["Enums"]["app_role"]
          user_email: string
        }
        Insert: {
          id?: string
          locality: string
          pincode: string
          role: Database["public"]["Enums"]["app_role"]
          user_email: string
        }
        Update: {
          id?: string
          locality?: string
          pincode?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_email?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          created_at: string
          created_by: string | null
          cuisine_type: string | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          locality: string
          location: string | null
          mapped_to: string | null
          pincode: string
          restaurant_name: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          locality: string
          location?: string | null
          mapped_to?: string | null
          pincode: string
          restaurant_name: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cuisine_type?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          locality?: string
          location?: string | null
          mapped_to?: string | null
          pincode?: string
          restaurant_name?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sample_orders: {
        Row: {
          created_at: string
          delivery_address: string | null
          delivery_date: string | null
          delivery_slot: string | null
          demand_per_week_kg: number | null
          gst_photo_url: string | null
          id: string
          lead_id: string
          remarks: string | null
          sample_qty_units: number | null
          status: string
          updated_at: string
          visit_date: string | null
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_slot?: string | null
          demand_per_week_kg?: number | null
          gst_photo_url?: string | null
          id?: string
          lead_id: string
          remarks?: string | null
          sample_qty_units?: number | null
          status?: string
          updated_at?: string
          visit_date?: string | null
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_slot?: string | null
          demand_per_week_kg?: number | null
          gst_photo_url?: string | null
          id?: string
          lead_id?: string
          remarks?: string | null
          sample_qty_units?: number | null
          status?: string
          updated_at?: string
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_mapping: {
        Row: {
          box_count: number | null
          grammage: number
          id: string
          lot_size: number | null
          sku_name: string
        }
        Insert: {
          box_count?: number | null
          grammage: number
          id?: string
          lot_size?: number | null
          sku_name: string
        }
        Update: {
          box_count?: number | null
          grammage?: number
          id?: string
          lot_size?: number | null
          sku_name?: string
        }
        Relationships: []
      }
      stage_mapping: {
        Row: {
          consumption_days_max: number
          consumption_days_min: number
          id: string
          stage_description: string
          stage_number: number
        }
        Insert: {
          consumption_days_max: number
          consumption_days_min: number
          id?: string
          stage_description: string
          stage_number: number
        }
        Update: {
          consumption_days_max?: number
          consumption_days_min?: number
          id?: string
          stage_description?: string
          stage_number?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "calling_agent" | "lead_taker" | "kam" | "admin"
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
      app_role: ["calling_agent", "lead_taker", "kam", "admin"],
    },
  },
} as const
