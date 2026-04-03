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
          children_count: number | null
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
          children_count?: number | null
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
          children_count?: number | null
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
          status: 'draft' | 'invited' | 'active' | 'comparison' | 'completed' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          initiator_id: string
          responder_id?: string | null
          case_type: 'child' | 'financial' | 'asset' | 'combined'
          status?: 'draft' | 'invited' | 'active' | 'comparison' | 'completed' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          initiator_id?: string
          responder_id?: string | null
          case_type?: 'child' | 'financial' | 'asset' | 'combined'
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
          dispute_type: 'child' | 'financial' | 'asset'
          section: string
          question_text: Json
          question_type: 'single_choice' | 'multi_choice' | 'number' | 'text' | 'date'
          options: Json | null
          display_order: number
          guidance_text: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dispute_type: 'child' | 'financial' | 'asset'
          section: string
          question_text: Json
          question_type: 'single_choice' | 'multi_choice' | 'number' | 'text' | 'date'
          options?: Json | null
          display_order: number
          guidance_text?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dispute_type?: 'child' | 'financial' | 'asset'
          section?: string
          question_text?: Json
          question_type?: 'single_choice' | 'multi_choice' | 'number' | 'text' | 'date'
          options?: Json | null
          display_order?: number
          guidance_text?: Json | null
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
          answer_value?: Json
          version?: number
          submitted_at?: string | null
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
