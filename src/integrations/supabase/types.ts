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
      applications: {
        Row: {
          applied_at: string | null
          cover_template_id: string | null
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          notes: string | null
          resume_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          cover_template_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          notes?: string | null
          resume_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          cover_template_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          resume_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_cover_template_id_fkey"
            columns: ["cover_template_id"]
            isOneToOne: false
            referencedRelation: "cover_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      career_path_predictions: {
        Row: {
          created_at: string
          experience_years: number
          id: string
          industry_insights: Json | null
          predicted_paths: Json | null
          role_title: string
          salary_progression: Json | null
          skills: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_years?: number
          id?: string
          industry_insights?: Json | null
          predicted_paths?: Json | null
          role_title: string
          salary_progression?: Json | null
          skills?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          experience_years?: number
          id?: string
          industry_insights?: Json | null
          predicted_paths?: Json | null
          role_title?: string
          salary_progression?: Json | null
          skills?: string[]
          user_id?: string
        }
        Relationships: []
      }
      chat_memories: {
        Row: {
          content: string
          created_at: string
          id: string
          memory_type: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          memory_type?: string
          metadata?: Json | null
          role?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          memory_type?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cover_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean | null
          template_name: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          template_name: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          template_name?: string
          user_id?: string
        }
        Relationships: []
      }
      follow_up_schedules: {
        Row: {
          contact_id: string | null
          created_at: string
          follow_up_number: number | null
          id: string
          message_id: string | null
          scheduled_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          follow_up_number?: number | null
          id?: string
          message_id?: string | null
          scheduled_date: string
          status?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          follow_up_number?: number | null
          id?: string
          message_id?: string | null
          scheduled_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_schedules_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "networking_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_schedules_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outreach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          could_improve: string | null
          created_at: string
          difficulty_rating: number
          id: string
          interview_id: string
          notes: string | null
          outcome: string | null
          overall_rating: number
          questions_asked: string | null
          updated_at: string
          user_id: string
          went_well: string | null
          would_recommend: boolean | null
        }
        Insert: {
          could_improve?: string | null
          created_at?: string
          difficulty_rating: number
          id?: string
          interview_id: string
          notes?: string | null
          outcome?: string | null
          overall_rating: number
          questions_asked?: string | null
          updated_at?: string
          user_id: string
          went_well?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          could_improve?: string | null
          created_at?: string
          difficulty_rating?: number
          id?: string
          interview_id?: string
          notes?: string | null
          outcome?: string | null
          overall_rating?: number
          questions_asked?: string | null
          updated_at?: string
          user_id?: string
          went_well?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          interview_type: string
          interviewer_email: string | null
          interviewer_name: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          reminder_sent: boolean | null
          scheduled_at: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_type?: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_at: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_type?: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          base_salary: number
          benefits: string[] | null
          bonus: number | null
          company: string
          created_at: string
          equity: string | null
          id: string
          location: string | null
          notes: string | null
          offer_deadline: string | null
          remote_policy: string | null
          role: string
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_salary: number
          benefits?: string[] | null
          bonus?: number | null
          company: string
          created_at?: string
          equity?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          offer_deadline?: string | null
          remote_policy?: string | null
          role: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_salary?: number
          benefits?: string[] | null
          bonus?: number | null
          company?: string
          created_at?: string
          equity?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          offer_deadline?: string | null
          remote_policy?: string | null
          role?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_postings: {
        Row: {
          company: string
          created_at: string
          description: string | null
          external_id: string | null
          fetched_at: string
          id: string
          job_type: string | null
          location: string | null
          posted_date: string | null
          salary_range: string | null
          source: string
          title: string
          url: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          fetched_at?: string
          id?: string
          job_type?: string | null
          location?: string | null
          posted_date?: string | null
          salary_range?: string | null
          source: string
          title: string
          url: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          fetched_at?: string
          id?: string
          job_type?: string | null
          location?: string | null
          posted_date?: string | null
          salary_range?: string | null
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      job_scrape_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          jobs_found: number | null
          jobs_inserted: number | null
          keywords: string[] | null
          locations: string[] | null
          scrape_type: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          jobs_found?: number | null
          jobs_inserted?: number | null
          keywords?: string[] | null
          locations?: string[] | null
          scrape_type?: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          jobs_found?: number | null
          jobs_inserted?: number | null
          keywords?: string[] | null
          locations?: string[] | null
          scrape_type?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      networking_contacts: {
        Row: {
          company: string | null
          contact_type: string | null
          created_at: string
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          notes: string | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          notes?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_messages: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          id: string
          job_id: string | null
          message_type: string
          opened_at: string | null
          replied_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string
          id?: string
          job_id?: string | null
          message_type: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          job_id?: string | null
          message_type?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "networking_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          analysis_type: string
          ats_score: number | null
          created_at: string
          id: string
          job_id: string | null
          keyword_matches: Json | null
          missing_keywords: Json | null
          original_content: string | null
          resume_id: string | null
          suggestions: Json | null
          tailored_content: string | null
          user_id: string
        }
        Insert: {
          analysis_type?: string
          ats_score?: number | null
          created_at?: string
          id?: string
          job_id?: string | null
          keyword_matches?: Json | null
          missing_keywords?: Json | null
          original_content?: string | null
          resume_id?: string | null
          suggestions?: Json | null
          tailored_content?: string | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          ats_score?: number | null
          created_at?: string
          id?: string
          job_id?: string | null
          keyword_matches?: Json | null
          missing_keywords?: Json | null
          original_content?: string | null
          resume_id?: string | null
          suggestions?: Json | null
          tailored_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_analyses_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_default: boolean | null
          role_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_default?: boolean | null
          role_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_default?: boolean | null
          role_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      salary_estimates: {
        Row: {
          created_at: string
          estimated_max: number | null
          estimated_median: number | null
          estimated_min: number | null
          experience_years: number
          id: string
          location: string
          market_trend: string | null
          negotiation_tips: string[] | null
          role: string
          skills: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_max?: number | null
          estimated_median?: number | null
          estimated_min?: number | null
          experience_years: number
          id?: string
          location: string
          market_trend?: string | null
          negotiation_tips?: string[] | null
          role: string
          skills?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_max?: number | null
          estimated_median?: number | null
          estimated_min?: number | null
          experience_years?: number
          id?: string
          location?: string
          market_trend?: string | null
          negotiation_tips?: string[] | null
          role?: string
          skills?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      skill_gap_analyses: {
        Row: {
          course_recommendations: Json | null
          created_at: string
          current_skills: string[]
          estimated_time: string | null
          id: string
          learning_roadmap: Json | null
          missing_skills: Json | null
          target_role: string
          user_id: string
        }
        Insert: {
          course_recommendations?: Json | null
          created_at?: string
          current_skills?: string[]
          estimated_time?: string | null
          id?: string
          learning_roadmap?: Json | null
          missing_skills?: Json | null
          target_role: string
          user_id: string
        }
        Update: {
          course_recommendations?: Json | null
          created_at?: string
          current_skills?: string[]
          estimated_time?: string | null
          id?: string
          learning_roadmap?: Json | null
          missing_skills?: Json | null
          target_role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          apply_mode: string
          created_at: string
          daily_apply_cap: number | null
          exclude_companies: string[]
          id: string
          is_active: boolean | null
          job_type: string | null
          keywords: string[]
          locations: string[]
          salary_max: number | null
          salary_min: number | null
          target_roles: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          apply_mode?: string
          created_at?: string
          daily_apply_cap?: number | null
          exclude_companies?: string[]
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          keywords?: string[]
          locations?: string[]
          salary_max?: number | null
          salary_min?: number | null
          target_roles?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          apply_mode?: string
          created_at?: string
          daily_apply_cap?: number | null
          exclude_companies?: string[]
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          keywords?: string[]
          locations?: string[]
          salary_max?: number | null
          salary_min?: number | null
          target_roles?: string[]
          updated_at?: string
          user_id?: string
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
      app_role: "user" | "admin"
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
      app_role: ["user", "admin"],
    },
  },
} as const
