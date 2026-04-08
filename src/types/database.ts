export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          preferred_language: string
          is_admin: boolean
          source_channel: 'web' | 'whatsapp'
          children_count: number | null
          parent_role: 'mum' | 'dad' | null
          role: 'initiator' | 'responder' | null
          privacy_consent: boolean
          privacy_consent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          email?: string
          preferred_language?: string
          is_admin?: boolean
          source_channel?: 'web' | 'whatsapp'
          children_count?: number | null
          parent_role?: 'mum' | 'dad' | null
          role?: 'initiator' | 'responder' | null
          privacy_consent?: boolean
          privacy_consent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          preferred_language?: string
          is_admin?: boolean
          source_channel?: 'web' | 'whatsapp'
          children_count?: number | null
          parent_role?: 'mum' | 'dad' | null
          role?: 'initiator' | 'responder' | null
          privacy_consent?: boolean
          privacy_consent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          id: string
          initiator_id: string
          responder_id: string | null
          case_type: 'child' | 'financial' | 'asset' | 'combined'
          question_set_version: 'v1' | 'v2'
          completed_phases: string[]
          initiator_satisfied_at: string | null
          responder_satisfied_at: string | null
          auto_generate_due_at: string | null
          auto_generate_warning_sent_at: string | null
          source_channel: 'web' | 'whatsapp'
          status: 'draft' | 'invited' | 'active' | 'comparison' | 'completed' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          initiator_id: string
          responder_id?: string | null
          case_type: 'child' | 'financial' | 'asset' | 'combined'
          question_set_version?: 'v1' | 'v2'
          completed_phases?: string[]
          initiator_satisfied_at?: string | null
          responder_satisfied_at?: string | null
          auto_generate_due_at?: string | null
          auto_generate_warning_sent_at?: string | null
          source_channel?: 'web' | 'whatsapp'
          status?: 'draft' | 'invited' | 'active' | 'comparison' | 'completed' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          initiator_id?: string
          responder_id?: string | null
          case_type?: 'child' | 'financial' | 'asset' | 'combined'
          question_set_version?: 'v1' | 'v2'
          completed_phases?: string[]
          initiator_satisfied_at?: string | null
          responder_satisfied_at?: string | null
          auto_generate_due_at?: string | null
          auto_generate_warning_sent_at?: string | null
          source_channel?: 'web' | 'whatsapp'
          status?: 'draft' | 'invited' | 'active' | 'comparison' | 'completed' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          case_id: string
          method: 'email' | 'sms' | 'whatsapp'
          recipient_contact: string
          token: string
          status: 'sent' | 'opened' | 'accepted' | 'expired'
          resend_email_id: string | null
          delivery_status: 'queued' | 'delivered' | 'delivery_delayed' | 'bounced' | 'complained' | 'failed'
          delivery_last_event_at: string | null
          delivery_last_event_type: string | null
          delivery_error: string | null
          sent_at: string
          opened_at: string | null
          accepted_at: string | null
          expires_at: string
          reminder_count: number
          last_reminder_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          method: 'email' | 'sms' | 'whatsapp'
          recipient_contact: string
          token?: string
          status?: 'sent' | 'opened' | 'accepted' | 'expired'
          resend_email_id?: string | null
          delivery_status?: 'queued' | 'delivered' | 'delivery_delayed' | 'bounced' | 'complained' | 'failed'
          delivery_last_event_at?: string | null
          delivery_last_event_type?: string | null
          delivery_error?: string | null
          sent_at?: string
          opened_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          reminder_count?: number
          last_reminder_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          method?: 'email' | 'sms' | 'whatsapp'
          recipient_contact?: string
          token?: string
          status?: 'sent' | 'opened' | 'accepted' | 'expired'
          resend_email_id?: string | null
          delivery_status?: 'queued' | 'delivered' | 'delivery_delayed' | 'bounced' | 'complained' | 'failed'
          delivery_last_event_at?: string | null
          delivery_last_event_type?: string | null
          delivery_error?: string | null
          sent_at?: string
          opened_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          reminder_count?: number
          last_reminder_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: string
          question_set_version: 'v1' | 'v2'
          dispute_type: 'child' | 'financial' | 'asset'
          section: string
          question_text: Json
          question_type: 'single_choice' | 'multi_choice' | 'number' | 'text' | 'date'
          options: Json | null
          display_order: number
          guidance_text: Json | null
          min_child_age: number | null
          max_child_age: number | null
          skip_if_combined: boolean
          is_per_child: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question_set_version?: 'v1' | 'v2'
          dispute_type: 'child' | 'financial' | 'asset'
          section: string
          question_text: Json
          question_type: 'single_choice' | 'multi_choice' | 'number' | 'text' | 'date'
          options?: Json | null
          display_order: number
          guidance_text?: Json | null
          min_child_age?: number | null
          max_child_age?: number | null
          skip_if_combined?: boolean
          is_per_child?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question_set_version?: 'v1' | 'v2'
          dispute_type?: 'child' | 'financial' | 'asset'
          section?: string
          question_text?: Json
          question_type?: 'single_choice' | 'multi_choice' | 'number' | 'text' | 'date'
          options?: Json | null
          display_order?: number
          guidance_text?: Json | null
          min_child_age?: number | null
          max_child_age?: number | null
          skip_if_combined?: boolean
          is_per_child?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          id: string
          case_id: string
          user_id: string
          question_id: string
          child_id: string | null
          answer_value: Json
          version: number
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          question_id: string
          child_id?: string | null
          answer_value: Json
          version?: number
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          question_id?: string
          child_id?: string | null
          answer_value?: Json
          version?: number
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          id: string
          owner_user_id: string
          profile_id: string | null
          case_id: string | null
          source_profile_child_id: string | null
          first_name: string | null
          date_of_birth: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          profile_id?: string | null
          case_id?: string | null
          source_profile_child_id?: string | null
          first_name?: string | null
          date_of_birth: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          profile_id?: string | null
          case_id?: string | null
          source_profile_child_id?: string | null
          first_name?: string | null
          date_of_birth?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_timeline: {
        Row: {
          id: string
          case_id: string
          user_id: string | null
          event_type:
            | 'case_created'
            | 'questions_started'
            | 'questions_completed'
            | 'invitation_sent'
            | 'invitation_opened'
            | 'invitation_accepted'
            | 'invitation_expired'
            | 'reminder_sent'
            | 'responder_started'
            | 'responder_completed'
            | 'comparison_generated'
            | 'resolution_accepted'
            | 'resolution_modified'
            | 'resolution_rejected'
            | 'document_uploaded'
            | 'export_purchased'
            | 'export_downloaded'
            | 'case_expired'
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id?: string | null
          event_type:
            | 'case_created'
            | 'questions_started'
            | 'questions_completed'
            | 'invitation_sent'
            | 'invitation_opened'
            | 'invitation_accepted'
            | 'invitation_expired'
            | 'reminder_sent'
            | 'responder_started'
            | 'responder_completed'
            | 'comparison_generated'
            | 'resolution_accepted'
            | 'resolution_modified'
            | 'resolution_rejected'
            | 'document_uploaded'
            | 'export_purchased'
            | 'export_downloaded'
            | 'case_expired'
          event_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string | null
          event_type?:
            | 'case_created'
            | 'questions_started'
            | 'questions_completed'
            | 'invitation_sent'
            | 'invitation_opened'
            | 'invitation_accepted'
            | 'invitation_expired'
            | 'reminder_sent'
            | 'responder_started'
            | 'responder_completed'
            | 'comparison_generated'
            | 'resolution_accepted'
            | 'resolution_modified'
            | 'resolution_rejected'
            | 'document_uploaded'
            | 'export_purchased'
            | 'export_downloaded'
            | 'case_expired'
          event_data?: Json
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          case_id: string
          user_id: string
          file_path: string
          file_name: string
          file_size: number
          mime_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          file_path: string
          file_name: string
          file_size: number
          mime_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          file_path?: string
          file_name?: string
          file_size?: number
          mime_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      exports: {
        Row: {
          id: string
          case_id: string
          user_id: string
          export_type: 'full_case' | 'single_party'
          tier: 'standard' | 'resolution'
          file_path: string
          stripe_session_id: string | null
          is_single_party: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          export_type: 'full_case' | 'single_party'
          tier: 'standard' | 'resolution'
          file_path: string
          stripe_session_id?: string | null
          is_single_party?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          export_type?: 'full_case' | 'single_party'
          tier?: 'standard' | 'resolution'
          file_path?: string
          stripe_session_id?: string | null
          is_single_party?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_logs: {
        Row: {
          id: string
          case_id: string | null
          user_id: string | null
          feature: string
          model: string
          input_tokens: number | null
          output_tokens: number | null
          cost_estimate: number | null
          input: Json | null
          request_hash: string | null
          response: Json
          created_at: string
        }
        Insert: {
          id?: string
          case_id?: string | null
          user_id?: string | null
          feature: string
          model: string
          input_tokens?: number | null
          output_tokens?: number | null
          cost_estimate?: number | null
          input?: Json | null
          request_hash?: string | null
          response: Json
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string | null
          user_id?: string | null
          feature?: string
          model?: string
          input_tokens?: number | null
          output_tokens?: number | null
          cost_estimate?: number | null
          input?: Json | null
          request_hash?: string | null
          response?: Json
          created_at?: string
        }
        Relationships: []
      }
      ai_translations: {
        Row: {
          id: string
          question_id: string
          language: string
          adapted_text: string
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          language: string
          adapted_text: string
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          language?: string
          adapted_text?: string
          created_at?: string
        }
        Relationships: []
      }
      sentiment_logs: {
        Row: {
          id: string
          case_id: string
          user_id: string
          field_name: string
          submitted_text: string | null
          deleted_text: string | null
          sentiment_score: number | null
          flags: Json | null
          risk_level: string | null
          recommended_action: string | null
          ai_explanation: string | null
          ai_patterns: Json | null
          deep_analysis_model: string | null
          deep_analysis_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          field_name: string
          submitted_text?: string | null
          deleted_text?: string | null
          sentiment_score?: number | null
          flags?: Json | null
          risk_level?: string | null
          recommended_action?: string | null
          ai_explanation?: string | null
          ai_patterns?: Json | null
          deep_analysis_model?: string | null
          deep_analysis_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          field_name?: string
          submitted_text?: string | null
          deleted_text?: string | null
          sentiment_score?: number | null
          flags?: Json | null
          risk_level?: string | null
          recommended_action?: string | null
          ai_explanation?: string | null
          ai_patterns?: Json | null
          deep_analysis_model?: string | null
          deep_analysis_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      case_item_states: {
        Row: {
          id: string
          case_id: string
          item_key: string
          question_id: string
          child_id: string | null
          review_bucket: 'to_review' | 'agreed' | 'disputed' | 'locked' | 'unresolved'
          round_count: number
          initiator_status: 'pending' | 'accepted' | 'modified' | 'rejected'
          responder_status: 'pending' | 'accepted' | 'modified' | 'rejected'
          initiator_value: Json | null
          responder_value: Json | null
          locked_at: string | null
          unresolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          item_key: string
          question_id: string
          child_id?: string | null
          review_bucket?: 'to_review' | 'agreed' | 'disputed' | 'locked' | 'unresolved'
          round_count?: number
          initiator_status?: 'pending' | 'accepted' | 'modified' | 'rejected'
          responder_status?: 'pending' | 'accepted' | 'modified' | 'rejected'
          initiator_value?: Json | null
          responder_value?: Json | null
          locked_at?: string | null
          unresolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          item_key?: string
          question_id?: string
          child_id?: string | null
          review_bucket?: 'to_review' | 'agreed' | 'disputed' | 'locked' | 'unresolved'
          round_count?: number
          initiator_status?: 'pending' | 'accepted' | 'modified' | 'rejected'
          responder_status?: 'pending' | 'accepted' | 'modified' | 'rejected'
          initiator_value?: Json | null
          responder_value?: Json | null
          locked_at?: string | null
          unresolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_item_events: {
        Row: {
          id: string
          case_id: string
          item_key: string
          question_id: string
          child_id: string | null
          actor_user_id: string | null
          action: 'accept' | 'modify' | 'reject' | 'lock' | 'unresolved' | 'comparison_unlocked'
          proposed_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          item_key: string
          question_id: string
          child_id?: string | null
          actor_user_id?: string | null
          action: 'accept' | 'modify' | 'reject' | 'lock' | 'unresolved' | 'comparison_unlocked'
          proposed_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          item_key?: string
          question_id?: string
          child_id?: string | null
          actor_user_id?: string | null
          action?: 'accept' | 'modify' | 'reject' | 'lock' | 'unresolved' | 'comparison_unlocked'
          proposed_value?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
