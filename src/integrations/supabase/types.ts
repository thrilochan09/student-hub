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
      bookmarks: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          resource_kind: Database["public"]["Enums"]["resource_kind"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          resource_kind: Database["public"]["Enums"]["resource_kind"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          resource_kind?: Database["public"]["Enums"]["resource_kind"]
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          category: Database["public"]["Enums"]["note_category"]
          created_at: string
          id: string
          pdf_url: string
          subject_id: string
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["note_category"]
          created_at?: string
          id?: string
          pdf_url: string
          subject_id: string
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["note_category"]
          created_at?: string
          id?: string
          pdf_url?: string
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      previous_papers: {
        Row: {
          created_at: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          pdf_url: string
          subject_id: string
          title: string
          year: number
        }
        Insert: {
          created_at?: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id?: string
          pdf_url: string
          subject_id: string
          title: string
          year: number
        }
        Update: {
          created_at?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          pdf_url?: string
          subject_id?: string
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "previous_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_disabled: boolean
          is_verified: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_disabled?: boolean
          is_verified?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_disabled?: boolean
          is_verified?: boolean
          name?: string | null
        }
        Relationships: []
      }
      recent_views: {
        Row: {
          id: string
          subject_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recent_views_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          branch: Database["public"]["Enums"]["branch_code"]
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          semester: number
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch_code"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          semester: number
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_code"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          semester?: number
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upload_submissions: {
        Row: {
          created_at: string
          exam_type: Database["public"]["Enums"]["exam_type"] | null
          id: string
          kind: Database["public"]["Enums"]["submission_kind"]
          note_category: Database["public"]["Enums"]["note_category"] | null
          pdf_url: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["submission_status"]
          subject_id: string
          submitter_id: string
          title: string
          year: number | null
        }
        Insert: {
          created_at?: string
          exam_type?: Database["public"]["Enums"]["exam_type"] | null
          id?: string
          kind: Database["public"]["Enums"]["submission_kind"]
          note_category?: Database["public"]["Enums"]["note_category"] | null
          pdf_url: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          subject_id: string
          submitter_id: string
          title: string
          year?: number | null
        }
        Update: {
          created_at?: string
          exam_type?: Database["public"]["Enums"]["exam_type"] | null
          id?: string
          kind?: Database["public"]["Enums"]["submission_kind"]
          note_category?: Database["public"]["Enums"]["note_category"] | null
          pdf_url?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          subject_id?: string
          submitter_id?: string
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_submissions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      app_role: "admin" | "student"
      branch_code: "CSE" | "CSM" | "CSD" | "CS" | "CIVIL" | "ECE"
      exam_type: "mid1" | "mid2" | "sem"
      note_category: "unit" | "assignment" | "lab" | "important"
      resource_kind: "paper" | "note"
      submission_kind: "note" | "paper"
      submission_status: "pending" | "approved" | "rejected"
      ticket_status: "open" | "in_progress" | "resolved"
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
      app_role: ["admin", "student"],
      branch_code: ["CSE", "CSM", "CSD", "CS", "CIVIL", "ECE"],
      exam_type: ["mid1", "mid2", "sem"],
      note_category: ["unit", "assignment", "lab", "important"],
      resource_kind: ["paper", "note"],
      submission_kind: ["note", "paper"],
      submission_status: ["pending", "approved", "rejected"],
      ticket_status: ["open", "in_progress", "resolved"],
    },
  },
} as const
