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
      bookings: {
        Row: {
          booking_ref: string | null
          contact_number: string | null
          created_at: string
          customer_name: string
          date: string
          id: string
          problem_description: string | null
          registration: string | null
          status: string
          updated_at: string
          vehicle: string
        }
        Insert: {
          booking_ref?: string | null
          contact_number?: string | null
          created_at?: string
          customer_name: string
          date?: string
          id?: string
          problem_description?: string | null
          registration?: string | null
          status?: string
          updated_at?: string
          vehicle: string
        }
        Update: {
          booking_ref?: string | null
          contact_number?: string | null
          created_at?: string
          customer_name?: string
          date?: string
          id?: string
          problem_description?: string | null
          registration?: string | null
          status?: string
          updated_at?: string
          vehicle?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      job_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          job_id: string
          position: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          job_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          booking_id: string
          created_at: string
          date: string
          id: string
          invoice_number: number | null
          invoice_ref: string | null
          labour_charge: number
          markup_percentage: number
          parts_cost: number
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          date?: string
          id?: string
          invoice_number?: number | null
          invoice_ref?: string | null
          labour_charge?: number
          markup_percentage?: number
          parts_cost?: number
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          date?: string
          id?: string
          invoice_number?: number | null
          invoice_ref?: string | null
          labour_charge?: number
          markup_percentage?: number
          parts_cost?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paid: number
          created_at: string
          date: string
          id: string
          job_id: string
          payment_method: string
          payment_type: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          date?: string
          id?: string
          job_id: string
          payment_method?: string
          payment_type?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          date?: string
          id?: string
          job_id?: string
          payment_method?: string
          payment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_counters: {
        Row: {
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          name: string
          updated_at?: string
          value?: number
        }
        Update: {
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      supplier_transactions: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          job_id: string | null
          reference: string | null
          supplier_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          job_id?: string | null
          reference?: string | null
          supplier_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          job_id?: string | null
          reference?: string | null
          supplier_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          branch_code: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          phone_number: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch_code?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone_number?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          branch_code?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone_number?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
