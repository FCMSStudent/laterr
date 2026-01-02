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
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          amount: number
          currency: string
          billing_cycle: string
          next_billing_date: string
          status: string
          payment_method: string | null
          website_url: string | null
          logo_url: string | null
          notes: string | null
          tags: string[] | null
          reminder_days_before: number
          auto_renew: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string
          amount: number
          currency?: string
          billing_cycle?: string
          next_billing_date: string
          status?: string
          payment_method?: string | null
          website_url?: string | null
          logo_url?: string | null
          notes?: string | null
          tags?: string[] | null
          reminder_days_before?: number
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          amount?: number
          currency?: string
          billing_cycle?: string
          next_billing_date?: string
          status?: string
          payment_method?: string | null
          website_url?: string | null
          logo_url?: string | null
          notes?: string | null
          tags?: string[] | null
          reminder_days_before?: number
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          id: string
          subscription_id: string
          user_id: string
          amount: number
          currency: string
          payment_date: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          user_id: string
          amount: number
          currency?: string
          payment_date: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          user_id?: string
          amount?: number
          currency?: string
          payment_date?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_analytics: {
        Row: {
          id: string
          user_id: string
          period_start: string
          period_end: string
          total_monthly_cost: number
          total_yearly_cost: number
          active_count: number
          by_category: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period_start: string
          period_end: string
          total_monthly_cost?: number
          total_yearly_cost?: number
          active_count?: number
          by_category?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period_start?: string
          period_end?: string
          total_monthly_cost?: number
          total_yearly_cost?: number
          active_count?: number
          by_category?: Json
          created_at?: string
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
      get_upcoming_renewals: {
        Args: {
          p_user_id: string
          p_days_ahead?: number
        }
        Returns: {
          id: string
          name: string
          amount: number
          currency: string
          billing_cycle: string
          next_billing_date: string
          days_until_renewal: number
          logo_url: string | null
          status: string
        }[]
      }
      calculate_subscription_analytics: {
        Args: {
          p_user_id: string
          p_start_date?: string | null
          p_end_date?: string | null
        }
        Returns: {
          category: string
          total_amount: number
          monthly_equivalent: number
          subscription_count: number
        }[]
      }
      get_subscription_totals: {
        Args: {
          p_user_id: string
        }
        Returns: {
          total_monthly: number
          total_yearly: number
          active_count: number
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
