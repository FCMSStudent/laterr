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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      health_documents: {
        Row: {
          created_at: string
          document_type: string
          embedding: string | null
          extracted_data: Json | null
          file_type: string
          file_url: string
          id: string
          provider_name: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          visit_date: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          embedding?: string | null
          extracted_data?: Json | null
          file_type: string
          file_url: string
          id?: string
          provider_name?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          visit_date?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          embedding?: string | null
          extracted_data?: Json | null
          file_type?: string
          file_url?: string
          id?: string
          provider_name?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          visit_date?: string | null
        }
        Relationships: []
      }
      health_goals: {
        Row: {
          created_at: string
          current_value: Json | null
          goal_type: string
          id: string
          milestones: Json | null
          motivation: string | null
          start_date: string
          status: string
          target_date: string | null
          target_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: Json | null
          goal_type: string
          id?: string
          milestones?: Json | null
          motivation?: string | null
          start_date?: string
          status?: string
          target_date?: string | null
          target_value: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: Json | null
          goal_type?: string
          id?: string
          milestones?: Json | null
          motivation?: string | null
          start_date?: string
          status?: string
          target_date?: string | null
          target_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_insights: {
        Row: {
          confidence_score: number | null
          content: string
          dismissed: boolean
          generated_at: string
          id: string
          insight_type: string
          related_documents: string[] | null
          related_measurements: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          content: string
          dismissed?: boolean
          generated_at?: string
          id?: string
          insight_type: string
          related_documents?: string[] | null
          related_measurements?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          content?: string
          dismissed?: boolean
          generated_at?: string
          id?: string
          insight_type?: string
          related_documents?: string[] | null
          related_measurements?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      health_measurements: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          measurement_type: string
          notes: string | null
          source: string | null
          tags: string[] | null
          unit: string | null
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          measurement_type: string
          notes?: string | null
          source?: string | null
          tags?: string[] | null
          unit?: string | null
          user_id: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          measurement_type?: string
          notes?: string | null
          source?: string | null
          tags?: string[] | null
          unit?: string | null
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      items: {
        Row: {
          category_id: string | null
          content: string | null
          created_at: string
          embedding: string | null
          id: string
          preview_image_url: string | null
          summary: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          preview_image_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          preview_image_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_schedule: {
        Row: {
          created_at: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          medication_name: string
          notes: string | null
          reminder_enabled: boolean
          start_date: string
          time_of_day: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage: string
          end_date?: string | null
          frequency?: string
          id?: string
          medication_name: string
          notes?: string | null
          reminder_enabled?: boolean
          start_date?: string
          time_of_day?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          medication_name?: string
          notes?: string | null
          reminder_enabled?: boolean
          start_date?: string
          time_of_day?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_categories: {
        Row: {
          budget_limit: number | null
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          subscription_id: string
          transaction_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          subscription_id: string
          transaction_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          billing_cycle: string
          cancelled_at: string | null
          category: string
          created_at: string
          currency: string
          id: string
          logo_url: string | null
          name: string
          next_billing_date: string
          notes: string | null
          payment_method: string | null
          provider: string | null
          reminder_days_before: number
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          amount: number
          auto_renew?: boolean
          billing_cycle?: string
          cancelled_at?: string | null
          category: string
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name: string
          next_billing_date: string
          notes?: string | null
          payment_method?: string | null
          provider?: string | null
          reminder_days_before?: number
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          billing_cycle?: string
          cancelled_at?: string | null
          category?: string
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name?: string
          next_billing_date?: string
          notes?: string | null
          payment_method?: string | null
          provider?: string | null
          reminder_days_before?: number
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      tag_icons: {
        Row: {
          created_at: string
          icon_url: string
          id: string
          tag_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon_url: string
          id?: string
          tag_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon_url?: string
          id?: string
          tag_name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_subscription_analytics: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          monthly_equivalent: number
          subscription_count: number
          total_amount: number
        }[]
      }
      find_similar_health_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          similarity: number
          title: string
        }[]
      }
      find_similar_items: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          similarity: number
          title: string
        }[]
      }
      get_subscription_totals: {
        Args: { p_user_id: string }
        Returns: {
          active_count: number
          total_monthly: number
          total_yearly: number
        }[]
      }
      get_upcoming_renewals: {
        Args: { p_days_ahead?: number; p_user_id: string }
        Returns: {
          amount: number
          billing_cycle: string
          currency: string
          days_until_renewal: number
          id: string
          logo_url: string
          name: string
          next_billing_date: string
          status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
