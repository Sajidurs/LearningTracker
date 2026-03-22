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
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_replied_at: string | null
          admin_reply: string | null
          created_at: string
          enjoying_platform: boolean | null
          has_issues: boolean | null
          id: string
          likes_interface: boolean | null
          message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          created_at?: string
          enjoying_platform?: boolean | null
          has_issues?: boolean | null
          id?: string
          likes_interface?: boolean | null
          message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          created_at?: string
          enjoying_platform?: boolean | null
          has_issues?: boolean | null
          id?: string
          likes_interface?: boolean | null
          message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_journeys: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_favorited: boolean
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_favorited?: boolean
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_favorited?: boolean
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          features: Json
          id: string
          interval: string
          is_active: boolean
          max_journeys: number
          max_topics: number
          name: string
          price: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          max_journeys?: number
          max_topics?: number
          name: string
          price?: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          max_journeys?: number
          max_topics?: number
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      points_log: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_log_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          plan: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          id: string
          is_redeemed: boolean
          points_cost: number
          redeemed_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_redeemed?: boolean
          points_cost?: number
          redeemed_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_redeemed?: boolean
          points_cost?: number
          redeemed_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      sub_topics: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          sort_order: number
          title: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      support_content: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          section: string
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          section: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          section?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          started_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_documents: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_documents_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_links: {
        Row: {
          created_at: string
          id: string
          title: string | null
          topic_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          topic_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          topic_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_links_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          day_of_week: number | null
          description: string | null
          id: string
          is_completed: boolean
          journey_id: string
          notes: string | null
          points_value: number
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          week_number: number | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          id?: string
          is_completed?: boolean
          journey_id: string
          notes?: string | null
          points_value?: number
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
          week_number?: number | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          id?: string
          is_completed?: boolean
          journey_id?: string
          notes?: string | null
          points_value?: number
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          week_number?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "learning_journeys"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
