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
          complexity_flags: Json
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
          complexity_flags?: Json
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
          complexity_flags?: Json
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
          tier: 'standard' | 'resolution' | 'mediator_assist'
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
          tier: 'standard' | 'resolution' | 'mediator_assist'
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
          tier?: 'standard' | 'resolution' | 'mediator_assist'
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
      specialist_applications: {
        Row: {
          id: string
          full_name: string
          email: string
          specialist_type: Database['public']['Enums']['specialist_type']
          accreditation_body: string
          accreditation_number: string
          qualifications: string
          years_experience: number
          hourly_rate: number
          languages: string[]
          location_text: string
          postcode: string
          postcode_normalized: string
          remote_available: boolean
          specialisms: string[]
          bio: string
          photo_path: string | null
          status: 'pending' | 'approved' | 'rejected'
          review_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          claimed_profile_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          specialist_type: Database['public']['Enums']['specialist_type']
          accreditation_body: string
          accreditation_number: string
          qualifications: string
          years_experience: number
          hourly_rate: number
          languages?: string[]
          location_text: string
          postcode: string
          postcode_normalized: string
          remote_available?: boolean
          specialisms?: string[]
          bio: string
          photo_path?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          review_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          claimed_profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          specialist_type?: Database['public']['Enums']['specialist_type']
          accreditation_body?: string
          accreditation_number?: string
          qualifications?: string
          years_experience?: number
          hourly_rate?: number
          languages?: string[]
          location_text?: string
          postcode?: string
          postcode_normalized?: string
          remote_available?: boolean
          specialisms?: string[]
          bio?: string
          photo_path?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          review_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          claimed_profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      specialists: {
        Row: {
          id: string
          profile_id: string | null
          application_id: string | null
          full_name: string
          email: string
          specialist_type: Database['public']['Enums']['specialist_type']
          accreditation_body: string
          accreditation_number: string
          qualifications: string
          years_experience: number
          hourly_rate: number
          languages: string[]
          location_text: string
          postcode: string
          postcode_normalized: string
          latitude: number | null
          longitude: number | null
          remote_available: boolean
          specialisms: string[]
          bio: string
          photo_path: string | null
          is_verified: boolean
          is_active: boolean
          verification_source: string | null
          verification_notes: string | null
          approved_by: string | null
          approved_at: string | null
          stripe_connect_id: string | null
          stripe_connect_status: 'not_started' | 'pending' | 'completed' | 'restricted'
          rating_average: number
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          application_id?: string | null
          full_name: string
          email: string
          specialist_type: Database['public']['Enums']['specialist_type']
          accreditation_body: string
          accreditation_number: string
          qualifications: string
          years_experience: number
          hourly_rate: number
          languages?: string[]
          location_text: string
          postcode: string
          postcode_normalized: string
          latitude?: number | null
          longitude?: number | null
          remote_available?: boolean
          specialisms?: string[]
          bio: string
          photo_path?: string | null
          is_verified?: boolean
          is_active?: boolean
          verification_source?: string | null
          verification_notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          stripe_connect_id?: string | null
          stripe_connect_status?: 'not_started' | 'pending' | 'completed' | 'restricted'
          rating_average?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          application_id?: string | null
          full_name?: string
          email?: string
          specialist_type?: Database['public']['Enums']['specialist_type']
          accreditation_body?: string
          accreditation_number?: string
          qualifications?: string
          years_experience?: number
          hourly_rate?: number
          languages?: string[]
          location_text?: string
          postcode?: string
          postcode_normalized?: string
          latitude?: number | null
          longitude?: number | null
          remote_available?: boolean
          specialisms?: string[]
          bio?: string
          photo_path?: string | null
          is_verified?: boolean
          is_active?: boolean
          verification_source?: string | null
          verification_notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          stripe_connect_id?: string | null
          stripe_connect_status?: 'not_started' | 'pending' | 'completed' | 'restricted'
          rating_average?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_requests: {
        Row: {
          id: string
          case_id: string
          requester_user_id: string
          specialist_type: Database['public']['Enums']['specialist_type']
          source: 'resolution_cta' | 'mediator_assist' | 'marketplace' | 'admin'
          preferred_time_window: string | null
          location_preference: 'remote' | 'local' | 'either'
          location_text: string | null
          postcode: string | null
          postcode_normalized: string | null
          message: string | null
          source_export_id: string | null
          triage_status: 'new' | 'reviewing' | 'matched' | 'closed' | 'cancelled'
          internal_notes: string | null
          assigned_specialist_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          requester_user_id: string
          specialist_type: Database['public']['Enums']['specialist_type']
          source: 'resolution_cta' | 'mediator_assist' | 'marketplace' | 'admin'
          preferred_time_window?: string | null
          location_preference?: 'remote' | 'local' | 'either'
          location_text?: string | null
          postcode?: string | null
          postcode_normalized?: string | null
          message?: string | null
          source_export_id?: string | null
          triage_status?: 'new' | 'reviewing' | 'matched' | 'closed' | 'cancelled'
          internal_notes?: string | null
          assigned_specialist_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          requester_user_id?: string
          specialist_type?: Database['public']['Enums']['specialist_type']
          source?: 'resolution_cta' | 'mediator_assist' | 'marketplace' | 'admin'
          preferred_time_window?: string | null
          location_preference?: 'remote' | 'local' | 'either'
          location_text?: string | null
          postcode?: string | null
          postcode_normalized?: string | null
          message?: string | null
          source_export_id?: string | null
          triage_status?: 'new' | 'reviewing' | 'matched' | 'closed' | 'cancelled'
          internal_notes?: string | null
          assigned_specialist_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          case_id: string
          referral_request_id: string | null
          specialist_id: string
          requested_by_user_id: string | null
          specialist_type: Database['public']['Enums']['specialist_type']
          source: 'resolution_cta' | 'mediator_assist' | 'marketplace' | 'admin'
          status: 'pending' | 'accepted' | 'session_scheduled' | 'recommendation_submitted' | 'completed' | 'cancelled'
          payment_model: 'request_only' | 'mediator_assist' | 'connect_checkout' | 'solicitor_off_platform'
          scheduled_for: string | null
          meeting_mode: 'video' | 'phone' | 'in_person' | null
          meeting_link: string | null
          meeting_instructions: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          payment_amount: number | null
          platform_fee_amount: number | null
          specialist_payout_amount: number | null
          accepted_at: string | null
          recommendation_submitted_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          referral_request_id?: string | null
          specialist_id: string
          requested_by_user_id?: string | null
          specialist_type: Database['public']['Enums']['specialist_type']
          source: 'resolution_cta' | 'mediator_assist' | 'marketplace' | 'admin'
          status?: 'pending' | 'accepted' | 'session_scheduled' | 'recommendation_submitted' | 'completed' | 'cancelled'
          payment_model?: 'request_only' | 'mediator_assist' | 'connect_checkout' | 'solicitor_off_platform'
          scheduled_for?: string | null
          meeting_mode?: 'video' | 'phone' | 'in_person' | null
          meeting_link?: string | null
          meeting_instructions?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          payment_amount?: number | null
          platform_fee_amount?: number | null
          specialist_payout_amount?: number | null
          accepted_at?: string | null
          recommendation_submitted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          referral_request_id?: string | null
          specialist_id?: string
          requested_by_user_id?: string | null
          specialist_type?: Database['public']['Enums']['specialist_type']
          source?: 'resolution_cta' | 'mediator_assist' | 'marketplace' | 'admin'
          status?: 'pending' | 'accepted' | 'session_scheduled' | 'recommendation_submitted' | 'completed' | 'cancelled'
          payment_model?: 'request_only' | 'mediator_assist' | 'connect_checkout' | 'solicitor_off_platform'
          scheduled_for?: string | null
          meeting_mode?: 'video' | 'phone' | 'in_person' | null
          meeting_link?: string | null
          meeting_instructions?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          payment_amount?: number | null
          platform_fee_amount?: number | null
          specialist_payout_amount?: number | null
          accepted_at?: string | null
          recommendation_submitted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          id: string
          referral_id: string
          case_id: string
          specialist_id: string
          overall_assessment: string | null
          next_steps_recommendation: string | null
          safeguarding_flag: boolean
          safeguarding_notes: string | null
          items: Json
          submitted_at: string | null
          last_follow_up_at: string | null
          follow_up_sent_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          case_id: string
          specialist_id: string
          overall_assessment?: string | null
          next_steps_recommendation?: string | null
          safeguarding_flag?: boolean
          safeguarding_notes?: string | null
          items?: Json
          submitted_at?: string | null
          last_follow_up_at?: string | null
          follow_up_sent_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          case_id?: string
          specialist_id?: string
          overall_assessment?: string | null
          next_steps_recommendation?: string | null
          safeguarding_flag?: boolean
          safeguarding_notes?: string | null
          items?: Json
          submitted_at?: string | null
          last_follow_up_at?: string | null
          follow_up_sent_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_responses: {
        Row: {
          id: string
          recommendation_id: string
          referral_id: string
          case_id: string
          item_key: string
          question_id: string
          child_id: string | null
          user_id: string
          action: 'pending' | 'accept' | 'modify' | 'reject'
          response_value: Json | null
          comment: string | null
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recommendation_id: string
          referral_id: string
          case_id: string
          item_key: string
          question_id: string
          child_id?: string | null
          user_id: string
          action?: 'pending' | 'accept' | 'modify' | 'reject'
          response_value?: Json | null
          comment?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recommendation_id?: string
          referral_id?: string
          case_id?: string
          item_key?: string
          question_id?: string
          child_id?: string | null
          user_id?: string
          action?: 'pending' | 'accept' | 'modify' | 'reject'
          response_value?: Json | null
          comment?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      specialist_ratings: {
        Row: {
          id: string
          referral_id: string
          specialist_id: string
          case_id: string
          user_id: string
          rating: number
          review_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          specialist_id: string
          case_id: string
          user_id: string
          rating: number
          review_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          specialist_id?: string
          case_id?: string
          user_id?: string
          rating?: number
          review_text?: string | null
          created_at?: string
        }
        Relationships: []
      }
      specialist_availability_slots: {
        Row: {
          id: string
          specialist_id: string
          starts_at: string
          ends_at: string
          is_booked: boolean
          referral_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          specialist_id: string
          starts_at: string
          ends_at: string
          is_booked?: boolean
          referral_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          specialist_id?: string
          starts_at?: string
          ends_at?: string
          is_booked?: boolean
          referral_id?: string | null
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
    Enums: {
      specialist_type:
        | 'mediator'
        | 'solicitor'
        | 'financial_adviser'
        | 'pension_expert'
        | 'child_psychologist'
    }
    CompositeTypes: Record<string, never>
  }
}
