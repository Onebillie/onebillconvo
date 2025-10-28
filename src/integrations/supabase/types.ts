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
      admin_ip_whitelist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled: boolean | null
          id: string
          ip_address: string
          ip_range: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          ip_address: string
          ip_range?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          ip_address?: string
          ip_range?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          device_name: string | null
          expires_at: string
          id: string
          ip_address: string | null
          ip_whitelisted: boolean | null
          is_active: boolean
          is_trusted: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          ip_whitelisted?: boolean | null
          is_active?: boolean
          is_trusted?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          ip_whitelisted?: boolean | null
          is_active?: boolean
          is_trusted?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_availability: {
        Row: {
          agent_id: string
          business_id: string
          created_at: string
          current_call_sid: string | null
          device_number: string | null
          device_type: string | null
          id: string
          last_call_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          business_id: string
          created_at?: string
          current_call_sid?: string | null
          device_number?: string | null
          device_type?: string | null
          id?: string
          last_call_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          business_id?: string
          created_at?: string
          current_call_sid?: string | null
          device_number?: string | null
          device_type?: string | null
          id?: string
          last_call_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_config: {
        Row: {
          ai_provider_id: string | null
          business_hours_end: string | null
          business_hours_start: string | null
          business_id: string | null
          fallback_provider_id: string | null
          id: string
          is_enabled: boolean | null
          max_tokens: number | null
          model: string | null
          out_of_hours_only: boolean | null
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          ai_provider_id?: string | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          business_id?: string | null
          fallback_provider_id?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model?: string | null
          out_of_hours_only?: boolean | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_provider_id?: string | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          business_id?: string | null
          fallback_provider_id?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model?: string | null
          out_of_hours_only?: boolean | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_config_ai_provider_id_fkey"
            columns: ["ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistant_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistant_config_fallback_provider_id_fkey"
            columns: ["fallback_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_customer_context: {
        Row: {
          business_id: string
          context_summary: string | null
          conversation_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          last_interaction: string | null
          metadata: Json | null
          sentiment: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          context_summary?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          last_interaction?: string | null
          metadata?: Json | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          context_summary?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          last_interaction?: string | null
          metadata?: Json | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_customer_context_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_customer_context_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_customer_context_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_document_chunks: {
        Row: {
          business_id: string
          chunk_index: number
          chunk_text: string
          created_at: string | null
          document_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          business_id: string
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          document_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          business_id?: string
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          document_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_chunks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_documents: {
        Row: {
          business_id: string
          chunk_count: number | null
          content: string
          created_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          chunk_count?: number | null
          content: string
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          chunk_count?: number | null
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_privacy_settings: {
        Row: {
          anonymize_training_data: boolean | null
          business_id: string
          closed_dataset_mode: boolean | null
          confidence_threshold: number | null
          created_at: string | null
          data_retention_days: number | null
          id: string
          mask_pii: boolean | null
          require_high_confidence: boolean | null
          updated_at: string | null
        }
        Insert: {
          anonymize_training_data?: boolean | null
          business_id: string
          closed_dataset_mode?: boolean | null
          confidence_threshold?: number | null
          created_at?: string | null
          data_retention_days?: number | null
          id?: string
          mask_pii?: boolean | null
          require_high_confidence?: boolean | null
          updated_at?: string | null
        }
        Update: {
          anonymize_training_data?: boolean | null
          business_id?: string
          closed_dataset_mode?: boolean | null
          confidence_threshold?: number | null
          created_at?: string | null
          data_retention_days?: number | null
          id?: string
          mask_pii?: boolean | null
          require_high_confidence?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_privacy_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          api_key: string | null
          business_id: string | null
          configuration: Json | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          model: string
          monthly_cost: number | null
          provider_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          api_key?: string | null
          business_id?: string | null
          configuration?: Json | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          model: string
          monthly_cost?: number | null
          provider_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          api_key?: string | null
          business_id?: string | null
          configuration?: Json | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          model?: string
          monthly_cost?: number | null
          provider_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_providers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rag_documents: {
        Row: {
          business_id: string | null
          content: string
          created_at: string | null
          document_type: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          content: string
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          content?: string
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rag_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_response_logs: {
        Row: {
          approved_by: string | null
          business_id: string
          confidence_score: number | null
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          feedback_rating: number | null
          id: string
          prompt: string
          response: string
          sources_used: Json | null
          was_approved: boolean | null
        }
        Insert: {
          approved_by?: string | null
          business_id: string
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          feedback_rating?: number | null
          id?: string
          prompt: string
          response: string
          sources_used?: Json | null
          was_approved?: boolean | null
        }
        Update: {
          approved_by?: string | null
          business_id?: string
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          feedback_rating?: number | null
          id?: string
          prompt?: string
          response?: string
          sources_used?: Json | null
          was_approved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_data: {
        Row: {
          answer: string
          business_id: string | null
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_data_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_tracking: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          overage_charges: number | null
          period_end: string
          period_start: string
          responses_used: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          overage_charges?: number | null
          period_end: string
          period_start: string
          responses_used?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          overage_charges?: number | null
          period_end?: string
          period_start?: string
          responses_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          business_id: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          min_subscription_tier: string | null
          name: string
          permissions: Json | null
          rate_limit_per_hour: number | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          min_subscription_tier?: string | null
          name: string
          permissions?: Json | null
          rate_limit_per_hour?: number | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          min_subscription_tier?: string | null
          name?: string
          permissions?: Json | null
          rate_limit_per_hour?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          business_id: string | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          business_id?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          business_id?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_tracking: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          service_name: string
          updated_at: string | null
          usage_count: number | null
          usage_date: string | null
          usage_limit: number
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          service_name: string
          updated_at?: string | null
          usage_count?: number | null
          usage_date?: string | null
          usage_limit: number
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          service_name?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_date?: string | null
          usage_limit?: number
        }
        Relationships: []
      }
      audience_segments: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          last_calculated_at: string | null
          member_count: number | null
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          last_calculated_at?: string | null
          member_count?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          last_calculated_at?: string | null
          member_count?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_segments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_topup_settings: {
        Row: {
          bundle_size: string
          business_id: string
          created_at: string
          enabled: boolean
          id: string
          last_topup_at: string | null
          threshold_credits: number
          updated_at: string
        }
        Insert: {
          bundle_size?: string
          business_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_topup_at?: string | null
          threshold_credits?: number
          updated_at?: string
        }
        Update: {
          bundle_size?: string
          business_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_topup_at?: string | null
          threshold_credits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_topup_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_usage: {
        Row: {
          business_id: string
          conversations_resolved: number | null
          created_at: string | null
          id: string
          messages_sent: number | null
          period_end: string
          period_start: string
          total_charge: number | null
        }
        Insert: {
          business_id: string
          conversations_resolved?: number | null
          created_at?: string | null
          id?: string
          messages_sent?: number | null
          period_end: string
          period_start: string
          total_charge?: number | null
        }
        Update: {
          business_id?: string
          conversations_resolved?: number | null
          created_at?: string | null
          id?: string
          messages_sent?: number | null
          period_end?: string
          period_start?: string
          total_charge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_audit_log: {
        Row: {
          action: string
          business_id: string | null
          changed_by: string | null
          changes: Json
          created_at: string | null
          id: string
        }
        Insert: {
          action: string
          business_id?: string | null
          changed_by?: string | null
          changes: Json
          created_at?: string | null
          id?: string
        }
        Update: {
          action?: string
          business_id?: string | null
          changed_by?: string | null
          changes?: Json
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          company_logo: string | null
          company_name: string | null
          email_bundle_window_minutes: number | null
          email_html_template: string | null
          email_signature: string | null
          email_subject_template: string | null
          from_email: string | null
          id: string
          reply_to_email: string | null
          support_email: string | null
          updated_at: string
          updated_by: string | null
          whatsapp_about: string | null
          whatsapp_status: string | null
        }
        Insert: {
          company_logo?: string | null
          company_name?: string | null
          email_bundle_window_minutes?: number | null
          email_html_template?: string | null
          email_signature?: string | null
          email_subject_template?: string | null
          from_email?: string | null
          id?: string
          reply_to_email?: string | null
          support_email?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_about?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          company_logo?: string | null
          company_name?: string | null
          email_bundle_window_minutes?: number | null
          email_html_template?: string | null
          email_signature?: string | null
          email_subject_template?: string | null
          from_email?: string | null
          id?: string
          reply_to_email?: string | null
          support_email?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_about?: string | null
          whatsapp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          cancellation_feedback: Json | null
          cancellation_history: Json | null
          cancellation_reason: string | null
          created_at: string | null
          credit_balance: number | null
          credit_expiry_date: string | null
          custom_features: Json | null
          custom_price_monthly: number | null
          enterprise_notes: string | null
          grace_period_end: string | null
          id: string
          invoice_email: string | null
          is_enterprise: boolean | null
          is_frozen: boolean | null
          is_unlimited: boolean | null
          last_payment_date: string | null
          message_count_current_period: number | null
          monthly_base_fee: number | null
          name: string
          next_payment_due: string | null
          onboarding_completed: boolean | null
          owner_id: string
          payment_method: string | null
          payment_status: string | null
          price_per_message: number | null
          price_per_resolution: number | null
          pricing_model: string | null
          seat_count: number | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_conversion_date: string | null
          trial_converted: boolean | null
          trial_ends_at: string | null
          updated_at: string | null
          voice_credit_balance: number | null
          voice_minutes_used_period: number | null
          voice_period_end: string | null
          voice_period_start: string | null
        }
        Insert: {
          cancellation_feedback?: Json | null
          cancellation_history?: Json | null
          cancellation_reason?: string | null
          created_at?: string | null
          credit_balance?: number | null
          credit_expiry_date?: string | null
          custom_features?: Json | null
          custom_price_monthly?: number | null
          enterprise_notes?: string | null
          grace_period_end?: string | null
          id?: string
          invoice_email?: string | null
          is_enterprise?: boolean | null
          is_frozen?: boolean | null
          is_unlimited?: boolean | null
          last_payment_date?: string | null
          message_count_current_period?: number | null
          monthly_base_fee?: number | null
          name: string
          next_payment_due?: string | null
          onboarding_completed?: boolean | null
          owner_id: string
          payment_method?: string | null
          payment_status?: string | null
          price_per_message?: number | null
          price_per_resolution?: number | null
          pricing_model?: string | null
          seat_count?: number | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_conversion_date?: string | null
          trial_converted?: boolean | null
          trial_ends_at?: string | null
          updated_at?: string | null
          voice_credit_balance?: number | null
          voice_minutes_used_period?: number | null
          voice_period_end?: string | null
          voice_period_start?: string | null
        }
        Update: {
          cancellation_feedback?: Json | null
          cancellation_history?: Json | null
          cancellation_reason?: string | null
          created_at?: string | null
          credit_balance?: number | null
          credit_expiry_date?: string | null
          custom_features?: Json | null
          custom_price_monthly?: number | null
          enterprise_notes?: string | null
          grace_period_end?: string | null
          id?: string
          invoice_email?: string | null
          is_enterprise?: boolean | null
          is_frozen?: boolean | null
          is_unlimited?: boolean | null
          last_payment_date?: string | null
          message_count_current_period?: number | null
          monthly_base_fee?: number | null
          name?: string
          next_payment_due?: string | null
          onboarding_completed?: boolean | null
          owner_id?: string
          payment_method?: string | null
          payment_status?: string | null
          price_per_message?: number | null
          price_per_resolution?: number | null
          pricing_model?: string | null
          seat_count?: number | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_conversion_date?: string | null
          trial_converted?: boolean | null
          trial_ends_at?: string | null
          updated_at?: string | null
          voice_credit_balance?: number | null
          voice_minutes_used_period?: number | null
          voice_period_end?: string | null
          voice_period_start?: string | null
        }
        Relationships: []
      }
      calendar_export_log: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          export_type: string
          exported_by: string | null
          file_name: string
          id: string
          sync_config_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          export_type: string
          exported_by?: string | null
          file_name: string
          id?: string
          sync_config_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          export_type?: string
          exported_by?: string | null
          file_name?: string
          id?: string
          sync_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_export_log_sync_config_id_fkey"
            columns: ["sync_config_id"]
            isOneToOne: false
            referencedRelation: "calendar_sync_config"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_config: {
        Row: {
          access_token: string | null
          api_key: string | null
          business_id: string | null
          calendar_id: string | null
          calendar_url: string | null
          created_at: string
          created_by: string | null
          default_timezone: string
          id: string
          include_attendees: boolean
          include_description: boolean
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          name: string
          provider: string
          refresh_token: string | null
          sync_completed_tasks: boolean
          sync_interval_minutes: number
          sync_tasks: boolean
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          business_id?: string | null
          calendar_id?: string | null
          calendar_url?: string | null
          created_at?: string
          created_by?: string | null
          default_timezone?: string
          id?: string
          include_attendees?: boolean
          include_description?: boolean
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          name: string
          provider: string
          refresh_token?: string | null
          sync_completed_tasks?: boolean
          sync_interval_minutes?: number
          sync_tasks?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          business_id?: string | null
          calendar_id?: string | null
          calendar_url?: string | null
          created_at?: string
          created_by?: string | null
          default_timezone?: string
          id?: string
          include_attendees?: boolean
          include_description?: boolean
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          name?: string
          provider?: string
          refresh_token?: string | null
          sync_completed_tasks?: boolean
          sync_interval_minutes?: number
          sync_tasks?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      call_events: {
        Row: {
          call_record_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          call_record_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          call_record_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_events_call_record_id_fkey"
            columns: ["call_record_id"]
            isOneToOne: false
            referencedRelation: "call_records"
            referencedColumns: ["id"]
          },
        ]
      }
      call_queues: {
        Row: {
          after_hours_action: string | null
          after_hours_number: string | null
          business_hours: Json | null
          business_id: string
          created_at: string
          display_name: string
          enabled: boolean | null
          id: string
          max_wait_time: number | null
          metadata: Json | null
          music_url: string | null
          name: string
          phone_number: string | null
          routing_strategy: string
          updated_at: string
          voicemail_greeting_url: string | null
        }
        Insert: {
          after_hours_action?: string | null
          after_hours_number?: string | null
          business_hours?: Json | null
          business_id: string
          created_at?: string
          display_name: string
          enabled?: boolean | null
          id?: string
          max_wait_time?: number | null
          metadata?: Json | null
          music_url?: string | null
          name: string
          phone_number?: string | null
          routing_strategy?: string
          updated_at?: string
          voicemail_greeting_url?: string | null
        }
        Update: {
          after_hours_action?: string | null
          after_hours_number?: string | null
          business_hours?: Json | null
          business_id?: string
          created_at?: string
          display_name?: string
          enabled?: boolean | null
          id?: string
          max_wait_time?: number | null
          metadata?: Json | null
          music_url?: string | null
          name?: string
          phone_number?: string | null
          routing_strategy?: string
          updated_at?: string
          voicemail_greeting_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_queues_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recording_consent: {
        Row: {
          call_record_id: string
          consent_given: boolean
          consent_method: string | null
          id: string
          recorded_at: string
        }
        Insert: {
          call_record_id: string
          consent_given: boolean
          consent_method?: string | null
          id?: string
          recorded_at?: string
        }
        Update: {
          call_record_id?: string
          consent_given?: boolean
          consent_method?: string | null
          id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recording_consent_call_record_id_fkey"
            columns: ["call_record_id"]
            isOneToOne: false
            referencedRelation: "call_records"
            referencedColumns: ["id"]
          },
        ]
      }
      call_records: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          billable_duration_seconds: number | null
          business_id: string
          call_type: string | null
          caller_name: string | null
          charged_to_credits: boolean | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          from_number: string
          id: string
          metadata: Json | null
          parent_call_sid: string | null
          queue_name: string | null
          recording_cost_cents: number | null
          recording_sid: string | null
          recording_url: string | null
          started_at: string
          status: string
          to_number: string
          total_cost_cents: number | null
          transcript: string | null
          transcription_cost_cents: number | null
          transfer_type: string | null
          twilio_call_sid: string
          twilio_cost_cents: number | null
          updated_at: string
          voicemail_url: string | null
          within_plan_limit: boolean | null
        }
        Insert: {
          agent_id?: string | null
          answered_at?: string | null
          billable_duration_seconds?: number | null
          business_id: string
          call_type?: string | null
          caller_name?: string | null
          charged_to_credits?: boolean | null
          created_at?: string
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number: string
          id?: string
          metadata?: Json | null
          parent_call_sid?: string | null
          queue_name?: string | null
          recording_cost_cents?: number | null
          recording_sid?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          to_number: string
          total_cost_cents?: number | null
          transcript?: string | null
          transcription_cost_cents?: number | null
          transfer_type?: string | null
          twilio_call_sid: string
          twilio_cost_cents?: number | null
          updated_at?: string
          voicemail_url?: string | null
          within_plan_limit?: boolean | null
        }
        Update: {
          agent_id?: string | null
          answered_at?: string | null
          billable_duration_seconds?: number | null
          business_id?: string
          call_type?: string | null
          caller_name?: string | null
          charged_to_credits?: boolean | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string
          id?: string
          metadata?: Json | null
          parent_call_sid?: string | null
          queue_name?: string | null
          recording_cost_cents?: number | null
          recording_sid?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          to_number?: string
          total_cost_cents?: number | null
          transcript?: string | null
          transcription_cost_cents?: number | null
          transfer_type?: string | null
          twilio_call_sid?: string
          twilio_cost_cents?: number | null
          updated_at?: string
          voicemail_url?: string | null
          within_plan_limit?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "call_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      call_settings: {
        Row: {
          business_id: string
          callback_mode_enabled: boolean | null
          caller_lookup_url: string | null
          created_at: string
          crm_webhook_token: string | null
          crm_webhook_url: string | null
          id: string
          ivr_enabled: boolean | null
          metadata: Json | null
          recording_enabled: boolean | null
          require_recording_consent: boolean | null
          retention_days: number | null
          transcription_enabled: boolean | null
          twilio_account_sid: string | null
          twilio_api_key: string | null
          twilio_api_secret: string | null
          twilio_auth_token: string | null
          twilio_twiml_app_sid: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          callback_mode_enabled?: boolean | null
          caller_lookup_url?: string | null
          created_at?: string
          crm_webhook_token?: string | null
          crm_webhook_url?: string | null
          id?: string
          ivr_enabled?: boolean | null
          metadata?: Json | null
          recording_enabled?: boolean | null
          require_recording_consent?: boolean | null
          retention_days?: number | null
          transcription_enabled?: boolean | null
          twilio_account_sid?: string | null
          twilio_api_key?: string | null
          twilio_api_secret?: string | null
          twilio_auth_token?: string | null
          twilio_twiml_app_sid?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          callback_mode_enabled?: boolean | null
          caller_lookup_url?: string | null
          created_at?: string
          crm_webhook_token?: string | null
          crm_webhook_url?: string | null
          id?: string
          ivr_enabled?: boolean | null
          metadata?: Json | null
          recording_enabled?: boolean | null
          require_recording_consent?: boolean | null
          retention_days?: number | null
          transcription_enabled?: boolean | null
          twilio_account_sid?: string | null
          twilio_api_key?: string | null
          twilio_api_secret?: string | null
          twilio_auth_token?: string | null
          twilio_twiml_app_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          bounced_count: number | null
          campaign_id: string
          clicked_count: number | null
          conversion_count: number | null
          conversion_value: number | null
          delivered_count: number | null
          failed_count: number | null
          hourly_stats: Json | null
          id: string
          metrics_by_channel: Json | null
          opened_count: number | null
          replied_count: number | null
          sent_count: number | null
          unsubscribed_count: number | null
          updated_at: string
        }
        Insert: {
          bounced_count?: number | null
          campaign_id: string
          clicked_count?: number | null
          conversion_count?: number | null
          conversion_value?: number | null
          delivered_count?: number | null
          failed_count?: number | null
          hourly_stats?: Json | null
          id?: string
          metrics_by_channel?: Json | null
          opened_count?: number | null
          replied_count?: number | null
          sent_count?: number | null
          unsubscribed_count?: number | null
          updated_at?: string
        }
        Update: {
          bounced_count?: number | null
          campaign_id?: string
          clicked_count?: number | null
          conversion_count?: number | null
          conversion_value?: number | null
          delivered_count?: number | null
          failed_count?: number | null
          hourly_stats?: Json | null
          id?: string
          metrics_by_channel?: Json | null
          opened_count?: number | null
          replied_count?: number | null
          sent_count?: number | null
          unsubscribed_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          campaign_id: string
          channel: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          message_id: string | null
          recipient_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          message_id?: string | null
          recipient_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          message_id?: string | null
          recipient_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_link_clicks: {
        Row: {
          campaign_id: string
          click_count: number | null
          first_clicked_at: string
          id: string
          ip_address: string | null
          last_clicked_at: string
          link_url: string
          recipient_id: string | null
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          click_count?: number | null
          first_clicked_at?: string
          id?: string
          ip_address?: string | null
          last_clicked_at?: string
          link_url: string
          recipient_id?: string | null
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          click_count?: number | null
          first_clicked_at?: string
          id?: string
          ip_address?: string | null
          last_clicked_at?: string
          link_url?: string
          recipient_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_link_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_link_clicks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          opened_at: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          business_id: string
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          shortcut: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      comprehensive_api_logs: {
        Row: {
          api_key_id: string | null
          business_id: string
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          rate_limit_hit: boolean | null
          request_body: Json | null
          request_headers: Json | null
          request_size_bytes: number | null
          response_body: Json | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          business_id: string
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          rate_limit_hit?: boolean | null
          request_body?: Json | null
          request_headers?: Json | null
          request_size_bytes?: number | null
          response_body?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          business_id?: string
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          rate_limit_hit?: boolean | null
          request_body?: Json | null
          request_headers?: Json | null
          request_size_bytes?: number | null
          response_body?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comprehensive_api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprehensive_api_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          business_id: string | null
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_ai_settings: {
        Row: {
          ai_enabled: boolean | null
          conversation_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          ai_enabled?: boolean | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          ai_enabled?: boolean | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_ai_settings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_analytics: {
        Row: {
          agent_messages: number | null
          avg_response_time_seconds: number | null
          conversation_id: string | null
          created_at: string | null
          customer_messages: number | null
          date: string | null
          first_response_time_seconds: number | null
          id: string
          total_messages: number | null
        }
        Insert: {
          agent_messages?: number | null
          avg_response_time_seconds?: number | null
          conversation_id?: string | null
          created_at?: string | null
          customer_messages?: number | null
          date?: string | null
          first_response_time_seconds?: number | null
          id?: string
          total_messages?: number | null
        }
        Update: {
          agent_messages?: number | null
          avg_response_time_seconds?: number | null
          conversation_id?: string | null
          created_at?: string | null
          customer_messages?: number | null
          date?: string | null
          first_response_time_seconds?: number | null
          id?: string
          total_messages?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_notes: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          is_private: boolean | null
          note: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_status_tags: {
        Row: {
          auto_create_task: boolean | null
          business_id: string | null
          color: string
          created_at: string | null
          default_assignee_role: string | null
          default_priority: string | null
          icon: string | null
          id: string
          name: string
          priority_score: number | null
          task_description_template: string | null
          task_title_template: string | null
        }
        Insert: {
          auto_create_task?: boolean | null
          business_id?: string | null
          color?: string
          created_at?: string | null
          default_assignee_role?: string | null
          default_priority?: string | null
          icon?: string | null
          id?: string
          name: string
          priority_score?: number | null
          task_description_template?: string | null
          task_title_template?: string | null
        }
        Update: {
          auto_create_task?: boolean | null
          business_id?: string | null
          color?: string
          created_at?: string | null
          default_assignee_role?: string | null
          default_priority?: string | null
          icon?: string | null
          id?: string
          name?: string
          priority_score?: number | null
          task_description_template?: string | null
          task_title_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_status_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_statuses: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          status_tag_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          status_tag_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          status_tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_statuses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_statuses_status_tag_id_fkey"
            columns: ["status_tag_id"]
            isOneToOne: false
            referencedRelation: "conversation_status_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_transfers: {
        Row: {
          conversation_id: string
          from_user_id: string
          id: string
          notes: string | null
          reason: string | null
          to_user_id: string
          transferred_at: string | null
        }
        Insert: {
          conversation_id: string
          from_user_id: string
          id?: string
          notes?: string | null
          reason?: string | null
          to_user_id: string
          transferred_at?: string | null
        }
        Update: {
          conversation_id?: string
          from_user_id?: string
          id?: string
          notes?: string | null
          reason?: string | null
          to_user_id?: string
          transferred_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_transfers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          business_id: string
          created_at: string | null
          customer_id: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          labels: string[] | null
          last_message_at: string | null
          metadata: Json | null
          pinned_at: string | null
          priority: number | null
          resolution_type: string | null
          resolution_value: number | null
          resolved_at: string | null
          status: string | null
          status_tag_id: string | null
          transfer_reason: string | null
          transferred_at: string | null
          transferred_from: string | null
          updated_at: string | null
          whatsapp_account_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          priority?: number | null
          resolution_type?: string | null
          resolution_value?: number | null
          resolved_at?: string | null
          status?: string | null
          status_tag_id?: string | null
          transfer_reason?: string | null
          transferred_at?: string | null
          transferred_from?: string | null
          updated_at?: string | null
          whatsapp_account_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          priority?: number | null
          resolution_type?: string | null
          resolution_value?: number | null
          resolved_at?: string | null
          status?: string | null
          status_tag_id?: string | null
          transfer_reason?: string | null
          transferred_at?: string | null
          transferred_from?: string | null
          updated_at?: string | null
          whatsapp_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_status_tag_id_fkey"
            columns: ["status_tag_id"]
            isOneToOne: false
            referencedRelation: "conversation_status_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_transferred_from_fkey"
            columns: ["transferred_from"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_assigned_to"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_bundles: {
        Row: {
          created_at: string | null
          credits: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      credit_expiry_warnings: {
        Row: {
          business_id: string
          created_at: string
          credits_amount: number
          expiry_date: string
          id: string
          sent_at: string
          warning_type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          credits_amount: number
          expiry_date: string
          id?: string
          sent_at?: string
          warning_type: string
        }
        Update: {
          business_id?: string
          created_at?: string
          credits_amount?: number
          expiry_date?: string
          id?: string
          sent_at?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_expiry_warnings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_warnings: {
        Row: {
          business_id: string | null
          id: string
          sent_at: string | null
          threshold_percent: number
          warning_type: string
        }
        Insert: {
          business_id?: string | null
          id?: string
          sent_at?: string | null
          threshold_percent: number
          warning_type: string
        }
        Update: {
          business_id?: string | null
          id?: string
          sent_at?: string | null
          threshold_percent?: number
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_warnings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_merge_suggestions: {
        Row: {
          business_id: string
          created_at: string | null
          created_via: string | null
          customer_ids: string[]
          id: string
          match_type: string
          match_value: string | null
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          created_via?: string | null
          customer_ids: string[]
          id?: string
          match_type: string
          match_value?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          created_via?: string | null
          customer_ids?: string[]
          id?: string
          match_type?: string
          match_value?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_merge_suggestions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          business_id: string | null
          created_at: string | null
          created_by: string | null
          customer_count: number | null
          description: string | null
          filters: Json
          id: string
          is_dynamic: boolean | null
          last_calculated_at: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_count?: number | null
          description?: string | null
          filters?: Json
          id?: string
          is_dynamic?: boolean | null
          last_calculated_at?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_count?: number | null
          description?: string | null
          filters?: Json
          id?: string
          is_dynamic?: boolean | null
          last_calculated_at?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string | null
          customer_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "contact_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          alternate_emails: string[] | null
          avatar: string | null
          business_id: string
          created_at: string | null
          email: string | null
          external_id: string | null
          external_system: string | null
          facebook_psid: string | null
          facebook_username: string | null
          first_name: string | null
          id: string
          instagram_id: string | null
          instagram_username: string | null
          is_blocked: boolean | null
          is_unsubscribed: boolean | null
          last_active: string | null
          last_contact_method: string | null
          last_name: string | null
          last_synced_at: string | null
          metadata: Json | null
          name: string
          notes: string | null
          phone: string
          sync_enabled: boolean | null
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          whatsapp_name: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          address?: string | null
          alternate_emails?: string[] | null
          avatar?: string | null
          business_id: string
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          external_system?: string | null
          facebook_psid?: string | null
          facebook_username?: string | null
          first_name?: string | null
          id?: string
          instagram_id?: string | null
          instagram_username?: string | null
          is_blocked?: boolean | null
          is_unsubscribed?: boolean | null
          last_active?: string | null
          last_contact_method?: string | null
          last_name?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          phone: string
          sync_enabled?: boolean | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          whatsapp_name?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          address?: string | null
          alternate_emails?: string[] | null
          avatar?: string | null
          business_id?: string
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          external_system?: string | null
          facebook_psid?: string | null
          facebook_username?: string | null
          first_name?: string | null
          id?: string
          instagram_id?: string | null
          instagram_username?: string | null
          is_blocked?: boolean | null
          is_unsubscribed?: boolean | null
          last_active?: string | null
          last_contact_method?: string | null
          last_name?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string
          sync_enabled?: boolean | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          whatsapp_name?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          auth_method: string | null
          business_id: string
          created_at: string
          created_by: string | null
          delete_after_sync: boolean
          email_address: string
          id: string
          imap_host: string
          imap_password: string
          imap_port: number
          imap_use_ssl: boolean
          imap_username: string
          inbound_method: string | null
          is_active: boolean
          last_imap_uid: number | null
          last_imap_uidvalidity: number | null
          last_pop3_uidl: string | null
          last_sync_at: string | null
          last_synced_at: string | null
          mark_as_read: boolean
          name: string
          oauth_access_token: string | null
          oauth_provider: string | null
          oauth_refresh_token: string | null
          oauth_scopes: Json | null
          oauth_token_expires_at: string | null
          pop3_host: string | null
          pop3_password: string | null
          pop3_port: number | null
          pop3_use_ssl: boolean | null
          pop3_username: string | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_use_ssl: boolean
          smtp_username: string
          sync_enabled: boolean
          sync_from_date: string | null
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          auth_method?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          delete_after_sync?: boolean
          email_address: string
          id?: string
          imap_host: string
          imap_password: string
          imap_port?: number
          imap_use_ssl?: boolean
          imap_username: string
          inbound_method?: string | null
          is_active?: boolean
          last_imap_uid?: number | null
          last_imap_uidvalidity?: number | null
          last_pop3_uidl?: string | null
          last_sync_at?: string | null
          last_synced_at?: string | null
          mark_as_read?: boolean
          name: string
          oauth_access_token?: string | null
          oauth_provider?: string | null
          oauth_refresh_token?: string | null
          oauth_scopes?: Json | null
          oauth_token_expires_at?: string | null
          pop3_host?: string | null
          pop3_password?: string | null
          pop3_port?: number | null
          pop3_use_ssl?: boolean | null
          pop3_username?: string | null
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_use_ssl?: boolean
          smtp_username: string
          sync_enabled?: boolean
          sync_from_date?: string | null
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_method?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          delete_after_sync?: boolean
          email_address?: string
          id?: string
          imap_host?: string
          imap_password?: string
          imap_port?: number
          imap_use_ssl?: boolean
          imap_username?: string
          inbound_method?: string | null
          is_active?: boolean
          last_imap_uid?: number | null
          last_imap_uidvalidity?: number | null
          last_pop3_uidl?: string | null
          last_sync_at?: string | null
          last_synced_at?: string | null
          mark_as_read?: boolean
          name?: string
          oauth_access_token?: string | null
          oauth_provider?: string | null
          oauth_refresh_token?: string | null
          oauth_scopes?: Json | null
          oauth_token_expires_at?: string | null
          pop3_host?: string | null
          pop3_password?: string | null
          pop3_port?: number | null
          pop3_use_ssl?: boolean | null
          pop3_username?: string | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_use_ssl?: boolean
          smtp_username?: string
          sync_enabled?: boolean
          sync_from_date?: string | null
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_operation_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          email_account_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          operation_type: string
          status: string
          step_name: string
          step_number: number | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          email_account_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          operation_type: string
          status?: string
          step_name: string
          step_number?: number | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          email_account_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          operation_type?: string
          status?: string
          step_name?: string
          step_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_operation_logs_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_logs: {
        Row: {
          created_at: string
          diagnostics: Json | null
          email_account_id: string
          emails_fetched: number | null
          emails_processed: number | null
          error_message: string | null
          id: string
          status: string
          sync_completed_at: string | null
          sync_started_at: string
        }
        Insert: {
          created_at?: string
          diagnostics?: Json | null
          email_account_id: string
          emails_fetched?: number | null
          emails_processed?: number | null
          error_message?: string | null
          id?: string
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
        }
        Update: {
          created_at?: string
          diagnostics?: Json | null
          email_account_id?: string
          emails_fetched?: number | null
          emails_processed?: number | null
          error_message?: string | null
          id?: string
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_logs_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_ai_settings: {
        Row: {
          ai_first_response_enabled: boolean | null
          ai_triage_enabled: boolean | null
          business_id: string
          created_at: string | null
          departments: Json | null
          id: string
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          ai_first_response_enabled?: boolean | null
          ai_triage_enabled?: boolean | null
          business_id: string
          created_at?: string | null
          departments?: Json | null
          id?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_first_response_enabled?: boolean | null
          ai_triage_enabled?: boolean | null
          business_id?: string
          created_at?: string | null
          departments?: Json | null
          id?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embed_ai_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_customizations: {
        Row: {
          background_color: string | null
          border_radius: string | null
          business_id: string
          chat_icon_type: string | null
          compact_mode_threshold: string | null
          created_at: string
          custom_css: string | null
          custom_height: string | null
          custom_width: string | null
          desktop_height: string | null
          desktop_width: string | null
          enable_mobile_fullscreen: boolean | null
          font_family: string | null
          greeting_message: string | null
          hide_header_on_mobile: boolean | null
          id: string
          layout_mode: string | null
          logo_url: string | null
          max_height: string | null
          max_width: string | null
          min_height: string | null
          min_width: string | null
          mobile_height: string | null
          mobile_width: string | null
          offline_message: string | null
          primary_color: string | null
          secondary_color: string | null
          sizing_mode: string | null
          tablet_height: string | null
          tablet_width: string | null
          text_color: string | null
          updated_at: string
          widget_position: string | null
        }
        Insert: {
          background_color?: string | null
          border_radius?: string | null
          business_id: string
          chat_icon_type?: string | null
          compact_mode_threshold?: string | null
          created_at?: string
          custom_css?: string | null
          custom_height?: string | null
          custom_width?: string | null
          desktop_height?: string | null
          desktop_width?: string | null
          enable_mobile_fullscreen?: boolean | null
          font_family?: string | null
          greeting_message?: string | null
          hide_header_on_mobile?: boolean | null
          id?: string
          layout_mode?: string | null
          logo_url?: string | null
          max_height?: string | null
          max_width?: string | null
          min_height?: string | null
          min_width?: string | null
          mobile_height?: string | null
          mobile_width?: string | null
          offline_message?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sizing_mode?: string | null
          tablet_height?: string | null
          tablet_width?: string | null
          text_color?: string | null
          updated_at?: string
          widget_position?: string | null
        }
        Update: {
          background_color?: string | null
          border_radius?: string | null
          business_id?: string
          chat_icon_type?: string | null
          compact_mode_threshold?: string | null
          created_at?: string
          custom_css?: string | null
          custom_height?: string | null
          custom_width?: string | null
          desktop_height?: string | null
          desktop_width?: string | null
          enable_mobile_fullscreen?: boolean | null
          font_family?: string | null
          greeting_message?: string | null
          hide_header_on_mobile?: boolean | null
          id?: string
          layout_mode?: string | null
          logo_url?: string | null
          max_height?: string | null
          max_width?: string | null
          min_height?: string | null
          min_width?: string | null
          mobile_height?: string | null
          mobile_width?: string | null
          offline_message?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sizing_mode?: string | null
          tablet_height?: string | null
          tablet_width?: string | null
          text_color?: string | null
          updated_at?: string
          widget_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embed_customizations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          expires_at: string
          id: string
          session_token: string
          site_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          expires_at: string
          id?: string
          session_token: string
          site_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string
          id?: string
          session_token?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embed_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embed_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_sites: {
        Row: {
          business_id: string
          created_at: string | null
          embed_token_id: string
          id: string
          name: string
          site_id: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          embed_token_id: string
          id?: string
          name: string
          site_id: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          embed_token_id?: string
          id?: string
          name?: string
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embed_sites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embed_sites_embed_token_id_fkey"
            columns: ["embed_token_id"]
            isOneToOne: false
            referencedRelation: "embed_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_tokens: {
        Row: {
          allowed_domains: string[] | null
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          site_id: string | null
          token: string
          usage_count: number | null
        }
        Insert: {
          allowed_domains?: string[] | null
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          site_id?: string | null
          token: string
          usage_count?: number | null
        }
        Update: {
          allowed_domains?: string[] | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          site_id?: string | null
          token?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "embed_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_invoices: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_number: string
          notes: string | null
          paid_date: string | null
          payment_method: string
          status: string
          stripe_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_number: string
          notes?: string | null
          paid_date?: string | null
          payment_method: string
          status?: string
          stripe_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string
          status?: string
          stripe_invoice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_accounts: {
        Row: {
          access_token: string
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          page_id: string
          page_name: string
          sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          access_token: string
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          page_id: string
          page_name: string
          sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          access_token?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          page_id?: string
          page_name?: string
          sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      granular_permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          access_token: string
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          instagram_account_id: string
          is_active: boolean
          sync_enabled: boolean
          updated_at: string
          username: string
        }
        Insert: {
          access_token: string
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          instagram_account_id: string
          is_active?: boolean
          sync_enabled?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          access_token?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instagram_account_id?: string
          is_active?: boolean
          sync_enabled?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "internal_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          business_id: string
          content: string
          created_at: string | null
          deleted_by_recipient: boolean | null
          deleted_by_sender: boolean | null
          id: string
          is_read: boolean | null
          priority: string | null
          read_at: string | null
          recipient_id: string
          related_conversation_id: string | null
          related_task_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string | null
          deleted_by_recipient?: boolean | null
          deleted_by_sender?: boolean | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          recipient_id: string
          related_conversation_id?: string | null
          related_task_id?: string | null
          sender_id: string
          subject: string
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string | null
          deleted_by_recipient?: boolean | null
          deleted_by_sender?: boolean | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string
          related_conversation_id?: string | null
          related_task_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_related_conversation_id_fkey"
            columns: ["related_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          business_id: string
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          period_end: string
          period_start: string
          status: string
          stripe_invoice_id: string
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid: number
          business_id: string
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          period_end: string
          period_start: string
          status: string
          stripe_invoice_id: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          business_id?: string
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          period_end?: string
          period_start?: string
          status?: string
          stripe_invoice_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          business_id: string | null
          channels: string[]
          clicked_count: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          cta_buttons: Json | null
          delivered_count: number | null
          description: string | null
          email_content: string | null
          email_subject: string | null
          facebook_content: string | null
          failed_count: number | null
          id: string
          instagram_content: string | null
          merge_tags: Json | null
          message_category: string | null
          name: string
          opened_count: number | null
          recipient_count: number | null
          recipient_filter: Json | null
          save_as_template: boolean | null
          scheduled_at: string | null
          sender_email_account_id: string | null
          sent_count: number | null
          sms_content: string | null
          started_at: string | null
          status: string | null
          template_id: string | null
          test_email_sent: boolean | null
          type: string
          updated_at: string | null
          whatsapp_template_id: string | null
          whatsapp_variables: Json | null
        }
        Insert: {
          business_id?: string | null
          channels?: string[]
          clicked_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_buttons?: Json | null
          delivered_count?: number | null
          description?: string | null
          email_content?: string | null
          email_subject?: string | null
          facebook_content?: string | null
          failed_count?: number | null
          id?: string
          instagram_content?: string | null
          merge_tags?: Json | null
          message_category?: string | null
          name: string
          opened_count?: number | null
          recipient_count?: number | null
          recipient_filter?: Json | null
          save_as_template?: boolean | null
          scheduled_at?: string | null
          sender_email_account_id?: string | null
          sent_count?: number | null
          sms_content?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          test_email_sent?: boolean | null
          type?: string
          updated_at?: string | null
          whatsapp_template_id?: string | null
          whatsapp_variables?: Json | null
        }
        Update: {
          business_id?: string | null
          channels?: string[]
          clicked_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_buttons?: Json | null
          delivered_count?: number | null
          description?: string | null
          email_content?: string | null
          email_subject?: string | null
          facebook_content?: string | null
          failed_count?: number | null
          id?: string
          instagram_content?: string | null
          merge_tags?: Json | null
          message_category?: string | null
          name?: string
          opened_count?: number | null
          recipient_count?: number | null
          recipient_filter?: Json | null
          save_as_template?: boolean | null
          scheduled_at?: string | null
          sender_email_account_id?: string | null
          sent_count?: number | null
          sms_content?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          test_email_sent?: boolean | null
          type?: string
          updated_at?: string | null
          whatsapp_template_id?: string | null
          whatsapp_variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_sender_email_account_id_fkey"
            columns: ["sender_email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_email_templates: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          name: string
          subject: string
          tags: string[] | null
          text_content: string | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name: string
          subject: string
          tags?: string[] | null
          text_content?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name?: string
          subject?: string
          tags?: string[] | null
          text_content?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_email_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_templates: {
        Row: {
          business_id: string
          category: string | null
          channels: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          email_content: string | null
          email_subject: string | null
          id: string
          industry: string | null
          is_public: boolean | null
          name: string
          sms_content: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number | null
          whatsapp_content: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email_content?: string | null
          email_subject?: string | null
          id?: string
          industry?: string | null
          is_public?: boolean | null
          name: string
          sms_content?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          whatsapp_content?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email_content?: string | null
          email_subject?: string | null
          id?: string
          industry?: string | null
          is_public?: boolean | null
          name?: string
          sms_content?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          whatsapp_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflows: {
        Row: {
          business_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          total_completed: number | null
          total_enrolled: number | null
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
          workflow_steps: Json
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          total_completed?: number | null
          total_enrolled?: number | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
          workflow_steps?: Json
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          total_completed?: number | null
          total_enrolled?: number | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
          workflow_steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          filename: string
          id: string
          message_id: string | null
          size: number | null
          transcription: string | null
          type: string
          url: string
          waveform_data: Json | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          filename: string
          id?: string
          message_id?: string | null
          size?: number | null
          transcription?: string | null
          type: string
          url: string
          waveform_data?: Json | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          filename?: string
          id?: string
          message_id?: string | null
          size?: number | null
          transcription?: string | null
          type?: string
          url?: string
          waveform_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_categories: {
        Row: {
          background_color: string
          border_color: string
          business_id: string | null
          category_name: string
          created_at: string | null
          display_name: string
          icon: string | null
          id: string
          is_default: boolean | null
          text_color: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string
          border_color?: string
          business_id?: string | null
          category_name: string
          created_at?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          text_color?: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string
          border_color?: string
          business_id?: string | null
          category_name?: string
          created_at?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          text_color?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          created_at: string | null
          delivery_attempt: number | null
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          event_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          platform: string
          status: string | null
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_attempt?: number | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          platform: string
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_attempt?: number | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          platform?: string
          status?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          business_id: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          media_type: string | null
          media_url: string | null
          name: string
          platform: string | null
          requires_variables: boolean | null
          updated_at: string | null
          usage_count: number | null
          variable_count: number | null
          variables: Json | null
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name: string
          platform?: string | null
          requires_variables?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          variable_count?: number | null
          variables?: Json | null
        }
        Update: {
          business_id?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name?: string
          platform?: string | null
          requires_variables?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          variable_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_confidence: number | null
          bounce_reason: string | null
          business_id: string | null
          category: string | null
          channel: string | null
          clicked_at: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_status: string | null
          direction: string
          edited_at: string | null
          edited_by: string | null
          external_message_id: string | null
          forwarded_from: string | null
          forwarded_from_message_id: string | null
          id: string
          is_ai_generated: boolean | null
          is_deleted: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          last_error: Json | null
          metadata: Json | null
          opened_at: string | null
          original_content: string | null
          pinned_at: string | null
          pinned_by: string | null
          platform: string | null
          priority: number | null
          replied_to_message_id: string | null
          retry_count: number | null
          scheduled_at: string | null
          starred_at: string | null
          starred_by: string | null
          status: string | null
          subject: string | null
          template_content: string | null
          template_name: string | null
          template_variables: Json | null
          thread_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          bounce_reason?: string | null
          business_id?: string | null
          category?: string | null
          channel?: string | null
          clicked_at?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_status?: string | null
          direction: string
          edited_at?: string | null
          edited_by?: string | null
          external_message_id?: string | null
          forwarded_from?: string | null
          forwarded_from_message_id?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          last_error?: Json | null
          metadata?: Json | null
          opened_at?: string | null
          original_content?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          platform?: string | null
          priority?: number | null
          replied_to_message_id?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          starred_at?: string | null
          starred_by?: string | null
          status?: string | null
          subject?: string | null
          template_content?: string | null
          template_name?: string | null
          template_variables?: Json | null
          thread_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          bounce_reason?: string | null
          business_id?: string | null
          category?: string | null
          channel?: string | null
          clicked_at?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_status?: string | null
          direction?: string
          edited_at?: string | null
          edited_by?: string | null
          external_message_id?: string | null
          forwarded_from?: string | null
          forwarded_from_message_id?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          last_error?: Json | null
          metadata?: Json | null
          opened_at?: string | null
          original_content?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          platform?: string | null
          priority?: number | null
          replied_to_message_id?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          starred_at?: string | null
          starred_by?: string | null
          status?: string | null
          subject?: string | null
          template_content?: string | null
          template_name?: string | null
          template_variables?: Json | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_fkey"
            columns: ["forwarded_from"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_message_id_fkey"
            columns: ["forwarded_from_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_replied_to_message_id_fkey"
            columns: ["replied_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_assignment: boolean | null
          email_daily_summary: boolean | null
          email_new_message: boolean | null
          email_team_message: boolean | null
          email_transfer: boolean | null
          id: string
          inapp_assignment: boolean | null
          inapp_mention: boolean | null
          inapp_new_message: boolean | null
          inapp_team_message: boolean | null
          inapp_transfer: boolean | null
          push_assignment: boolean | null
          push_new_message: boolean | null
          push_urgent_only: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email_assignment?: boolean | null
          email_daily_summary?: boolean | null
          email_new_message?: boolean | null
          email_team_message?: boolean | null
          email_transfer?: boolean | null
          id?: string
          inapp_assignment?: boolean | null
          inapp_mention?: boolean | null
          inapp_new_message?: boolean | null
          inapp_team_message?: boolean | null
          inapp_transfer?: boolean | null
          push_assignment?: boolean | null
          push_new_message?: boolean | null
          push_urgent_only?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email_assignment?: boolean | null
          email_daily_summary?: boolean | null
          email_new_message?: boolean | null
          email_team_message?: boolean | null
          email_transfer?: boolean | null
          id?: string
          inapp_assignment?: boolean | null
          inapp_mention?: boolean | null
          inapp_new_message?: boolean | null
          inapp_team_message?: boolean | null
          inapp_transfer?: boolean | null
          push_assignment?: boolean | null
          push_new_message?: boolean | null
          push_urgent_only?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          business_id: string
          channel: string | null
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          sent: boolean | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          business_id: string
          channel?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          sent?: boolean | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          business_id?: string
          channel?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          sent?: boolean | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          link_url: string | null
          message: string
          priority: number | null
          read_at: string | null
          related_conversation_id: string | null
          related_message_id: string | null
          related_task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link_url?: string | null
          message: string
          priority?: number | null
          read_at?: string | null
          related_conversation_id?: string | null
          related_message_id?: string | null
          related_task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link_url?: string | null
          message?: string
          priority?: number | null
          read_at?: string | null
          related_conversation_id?: string | null
          related_message_id?: string | null
          related_task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_conversation_id_fkey"
            columns: ["related_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_message_id_fkey"
            columns: ["related_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          provider: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          provider: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          provider?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_subscriptions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          selected_plan: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          selected_plan: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          selected_plan?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      platform_costs: {
        Row: {
          created_at: string | null
          email_service_cost: number | null
          fixed_monthly_costs: number | null
          id: string
          lovable_ai_cost: number | null
          lovable_credits_cost: number | null
          month: string
          notes: string | null
          other_costs: Json | null
          sms_cost: number | null
          supabase_bandwidth_cost: number | null
          supabase_db_cost: number | null
          supabase_storage_cost: number | null
          total_cost: number | null
          updated_at: string | null
          whatsapp_api_cost: number | null
        }
        Insert: {
          created_at?: string | null
          email_service_cost?: number | null
          fixed_monthly_costs?: number | null
          id?: string
          lovable_ai_cost?: number | null
          lovable_credits_cost?: number | null
          month: string
          notes?: string | null
          other_costs?: Json | null
          sms_cost?: number | null
          supabase_bandwidth_cost?: number | null
          supabase_db_cost?: number | null
          supabase_storage_cost?: number | null
          total_cost?: number | null
          updated_at?: string | null
          whatsapp_api_cost?: number | null
        }
        Update: {
          created_at?: string | null
          email_service_cost?: number | null
          fixed_monthly_costs?: number | null
          id?: string
          lovable_ai_cost?: number | null
          lovable_credits_cost?: number | null
          month?: string
          notes?: string | null
          other_costs?: Json | null
          sms_cost?: number | null
          supabase_bandwidth_cost?: number | null
          supabase_db_cost?: number | null
          supabase_storage_cost?: number | null
          total_cost?: number | null
          updated_at?: string | null
          whatsapp_api_cost?: number | null
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          created_at: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          message_limit: number
          monthly_price: number
          seat_limit: number
          tier: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          message_limit?: number
          monthly_price?: number
          seat_limit?: number
          tier: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          message_limit?: number
          monthly_price?: number
          seat_limit?: number
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          base_price: number
          created_at: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean | null
          marketing_campaigns_limit: number | null
          marketing_messages_included: number | null
          stripe_price_id: string | null
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean | null
          marketing_campaigns_limit?: number | null
          marketing_messages_included?: number | null
          stripe_price_id?: string | null
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          marketing_campaigns_limit?: number | null
          marketing_messages_included?: number | null
          stripe_price_id?: string | null
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_campaigns: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_referrals_per_user: number | null
          name: string
          referral_type: string
          reward_description: string | null
          reward_type: string
          reward_value: number | null
          successful_referrals: number | null
          total_referrals: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_referrals_per_user?: number | null
          name: string
          referral_type?: string
          reward_description?: string | null
          reward_type: string
          reward_value?: number | null
          successful_referrals?: number | null
          total_referrals?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_referrals_per_user?: number | null
          name?: string
          referral_type?: string
          reward_description?: string | null
          reward_type?: string
          reward_value?: number | null
          successful_referrals?: number | null
          total_referrals?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          campaign_id: string
          clicks: number | null
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          referral_code: string
          referral_link: string | null
          successful_referrals: number | null
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          referral_code: string
          referral_link?: string | null
          successful_referrals?: number | null
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          referral_code?: string
          referral_link?: string | null
          successful_referrals?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "referral_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_conversions: {
        Row: {
          conversion_type: string
          conversion_value: number | null
          created_at: string
          id: string
          referee_customer_id: string | null
          referral_code_id: string
          reward_issued: boolean | null
          reward_issued_at: string | null
        }
        Insert: {
          conversion_type: string
          conversion_value?: number | null
          created_at?: string
          id?: string
          referee_customer_id?: string | null
          referral_code_id: string
          reward_issued?: boolean | null
          reward_issued_at?: string | null
        }
        Update: {
          conversion_type?: string
          conversion_value?: number | null
          created_at?: string
          id?: string
          referee_customer_id?: string | null
          referral_code_id?: string
          reward_issued?: boolean | null
          reward_issued_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_conversions_referee_customer_id_fkey"
            columns: ["referee_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_conversions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          business_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          business_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          business_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          business_id: string | null
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          business_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          severity: string
          title: string
          user_id?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          business_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          business_id: string | null
          created_at: string | null
          device_fingerprint: string | null
          error_message: string | null
          event_action: string
          event_category: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          request_id: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          severity: string
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          error_message?: string | null
          event_action: string
          event_category: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          error_message?: string | null
          event_action?: string
          event_category?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string | null
          customer_id: string | null
          details: Json | null
          event_type: string
          id: string
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          details?: Json | null
          event_type: string
          id?: string
          severity: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_accounts: {
        Row: {
          account_sid: string | null
          api_key: string | null
          api_secret: string | null
          auth_token: string | null
          business_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          phone_number: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          account_sid?: string | null
          api_key?: string | null
          api_secret?: string | null
          auth_token?: string | null
          business_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone_number: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          account_sid?: string | null
          api_key?: string | null
          api_secret?: string | null
          auth_token?: string | null
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone_number?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_comments: {
        Row: {
          business_id: string | null
          comment_id: string
          commenter_name: string
          commenter_profile_picture: string | null
          commenter_username: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_hidden: boolean | null
          is_replied: boolean | null
          parent_comment_id: string | null
          platform: string
          post_id: string
          replied_at: string | null
          sentiment: string | null
        }
        Insert: {
          business_id?: string | null
          comment_id: string
          commenter_name: string
          commenter_profile_picture?: string | null
          commenter_username?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_hidden?: boolean | null
          is_replied?: boolean | null
          parent_comment_id?: string | null
          platform: string
          post_id: string
          replied_at?: string | null
          sentiment?: string | null
        }
        Update: {
          business_id?: string | null
          comment_id?: string
          commenter_name?: string
          commenter_profile_picture?: string | null
          commenter_username?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_hidden?: boolean | null
          is_replied?: boolean | null
          parent_comment_id?: string | null
          platform?: string
          post_id?: string
          replied_at?: string | null
          sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_comments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_comments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_comments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_tokens: {
        Row: {
          api_key_id: string
          business_id: string
          created_at: string | null
          customer_id: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          metadata: Json | null
          scope: string
          token: string
        }
        Insert: {
          api_key_id: string
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          scope?: string
          token: string
        }
        Update: {
          api_key_id?: string
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          scope?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_tokens_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sso_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sso_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          business_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_tier: string | null
          old_tier: string | null
          stripe_event_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_tier?: string | null
          old_tier?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_tier?: string | null
          old_tier?: string | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      system_test_results: {
        Row: {
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          run_by: string | null
          status: string
          test_category: string
          test_name: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          run_by?: string | null
          status: string
          test_category: string
          test_name: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          run_by?: string | null
          status?: string
          test_category?: string
          test_name?: string
        }
        Relationships: []
      }
      task_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          completed: boolean | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string
          id: string
          message_id: string | null
          priority: string | null
          priority_score: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date: string
          id?: string
          message_id?: string | null
          priority?: string | null
          priority_score?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string
          id?: string
          message_id?: string | null
          priority?: string | null
          priority_score?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          role: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          role?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          role?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          business_id: string
          color: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_analytics: {
        Row: {
          answer_quality: number | null
          created_at: string | null
          id: string
          page_context: string | null
          question: string
          user_id: string | null
          was_helpful: boolean | null
        }
        Insert: {
          answer_quality?: number | null
          created_at?: string | null
          id?: string
          page_context?: string | null
          question: string
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          answer_quality?: number | null
          created_at?: string | null
          id?: string
          page_context?: string | null
          question?: string
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "training_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_content: {
        Row: {
          category: string
          content: Json
          content_type: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_time: string | null
          feature_name: string
          id: string
          is_published: boolean | null
          related_pages: string[] | null
          screenshots: Json | null
          search_keywords: string[] | null
          tags: string[] | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          category: string
          content: Json
          content_type?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_time?: string | null
          feature_name: string
          id?: string
          is_published?: boolean | null
          related_pages?: string[] | null
          screenshots?: Json | null
          search_keywords?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string
          content?: Json
          content_type?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_time?: string | null
          feature_name?: string
          id?: string
          is_published?: boolean | null
          related_pages?: string[] | null
          screenshots?: Json | null
          search_keywords?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      training_conversations: {
        Row: {
          business_id: string | null
          created_at: string | null
          current_page: string | null
          feedback: string | null
          id: string
          messages: Json
          rating: number | null
          resolved: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          current_page?: string | null
          feedback?: string | null
          id?: string
          messages?: Json
          rating?: number | null
          resolved?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          current_page?: string | null
          feedback?: string | null
          id?: string
          messages?: Json
          rating?: number | null
          resolved?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed_steps: number[] | null
          created_at: string | null
          id: string
          last_accessed: string | null
          status: string | null
          training_content_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_steps?: number[] | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          status?: string | null
          training_content_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_steps?: number[] | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          status?: string | null
          training_content_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_training_content_id_fkey"
            columns: ["training_content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_auth: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          secret_key: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret_key: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret_key?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      usage_alerts_sent: {
        Row: {
          alert_date: string | null
          alert_level: number
          id: string
          sent_at: string | null
          service_name: string
        }
        Insert: {
          alert_date?: string | null
          alert_level: number
          id?: string
          sent_at?: string | null
          service_name: string
        }
        Update: {
          alert_date?: string | null
          alert_level?: number
          id?: string
          sent_at?: string | null
          service_name?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          base_fee: number | null
          business_id: string
          created_at: string | null
          id: string
          message_count: number | null
          message_fee: number | null
          period_end: string
          period_start: string
          total_fee: number | null
        }
        Insert: {
          base_fee?: number | null
          business_id: string
          created_at?: string | null
          id?: string
          message_count?: number | null
          message_fee?: number | null
          period_end: string
          period_start: string
          total_fee?: number | null
        }
        Update: {
          base_fee?: number | null
          business_id?: string
          created_at?: string | null
          id?: string
          message_count?: number | null
          message_fee?: number | null
          period_end?: string
          period_start?: string
          total_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_granular_permissions: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          permission_name: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          permission_name: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          permission_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_granular_permissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_theme_preferences: {
        Row: {
          accent_color: string | null
          accent_foreground: string | null
          background_color: string | null
          border_color: string | null
          business_id: string
          card_color: string | null
          card_foreground: string | null
          created_at: string | null
          foreground_color: string | null
          id: string
          muted_color: string | null
          muted_foreground: string | null
          primary_color: string | null
          primary_foreground: string | null
          secondary_color: string | null
          secondary_foreground: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          accent_foreground?: string | null
          background_color?: string | null
          border_color?: string | null
          business_id: string
          card_color?: string | null
          card_foreground?: string | null
          created_at?: string | null
          foreground_color?: string | null
          id?: string
          muted_color?: string | null
          muted_foreground?: string | null
          primary_color?: string | null
          primary_foreground?: string | null
          secondary_color?: string | null
          secondary_foreground?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          accent_foreground?: string | null
          background_color?: string | null
          border_color?: string | null
          business_id?: string
          card_color?: string | null
          card_foreground?: string | null
          created_at?: string | null
          foreground_color?: string | null
          id?: string
          muted_color?: string | null
          muted_foreground?: string | null
          primary_color?: string | null
          primary_foreground?: string | null
          secondary_color?: string | null
          secondary_foreground?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_theme_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_seen: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_seen?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_call_usage: {
        Row: {
          business_id: string
          call_record_id: string | null
          conference_minutes: number | null
          created_at: string | null
          credits_remaining: number | null
          credits_used: number | null
          id: string
          inbound_minutes_local: number | null
          inbound_minutes_tollfree: number | null
          internal_minutes: number | null
          our_markup_cents: number | null
          outbound_minutes_local: number | null
          outbound_minutes_tollfree: number | null
          overage_minutes: number | null
          period_end: string
          period_start: string
          recording_minutes: number | null
          total_cost_cents: number | null
          transcription_minutes: number | null
          twilio_cost_cents: number | null
          updated_at: string | null
          within_plan_limit: boolean | null
        }
        Insert: {
          business_id: string
          call_record_id?: string | null
          conference_minutes?: number | null
          created_at?: string | null
          credits_remaining?: number | null
          credits_used?: number | null
          id?: string
          inbound_minutes_local?: number | null
          inbound_minutes_tollfree?: number | null
          internal_minutes?: number | null
          our_markup_cents?: number | null
          outbound_minutes_local?: number | null
          outbound_minutes_tollfree?: number | null
          overage_minutes?: number | null
          period_end: string
          period_start: string
          recording_minutes?: number | null
          total_cost_cents?: number | null
          transcription_minutes?: number | null
          twilio_cost_cents?: number | null
          updated_at?: string | null
          within_plan_limit?: boolean | null
        }
        Update: {
          business_id?: string
          call_record_id?: string | null
          conference_minutes?: number | null
          created_at?: string | null
          credits_remaining?: number | null
          credits_used?: number | null
          id?: string
          inbound_minutes_local?: number | null
          inbound_minutes_tollfree?: number | null
          internal_minutes?: number | null
          our_markup_cents?: number | null
          outbound_minutes_local?: number | null
          outbound_minutes_tollfree?: number | null
          overage_minutes?: number | null
          period_end?: string
          period_start?: string
          recording_minutes?: number | null
          total_cost_cents?: number | null
          transcription_minutes?: number | null
          twilio_cost_cents?: number | null
          updated_at?: string | null
          within_plan_limit?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_call_usage_call_record_id_fkey"
            columns: ["call_record_id"]
            isOneToOne: false
            referencedRelation: "call_records"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_credit_bundles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          minutes: number
          name: string
          price_cents: number
          savings_percent: number | null
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          minutes: number
          name: string
          price_cents: number
          savings_percent?: number | null
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          minutes?: number
          name?: string
          price_cents?: number
          savings_percent?: number | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      voice_pricing_config: {
        Row: {
          can_conference: boolean | null
          can_make_outbound: boolean | null
          can_record: boolean | null
          can_transcribe: boolean | null
          can_transfer: boolean | null
          created_at: string | null
          id: string
          included_inbound_minutes: number | null
          included_outbound_minutes: number | null
          included_phone_numbers: number | null
          included_transcription_minutes: number | null
          is_active: boolean | null
          overage_inbound_cents: number | null
          overage_outbound_cents: number | null
          overage_transcription_cents: number | null
          recording_retention_days: number | null
          tier: string
          twilio_inbound_cost_cents: number | null
          twilio_outbound_cost_cents: number | null
          twilio_recording_cost_cents: number | null
          twilio_transcription_cost_cents: number | null
          updated_at: string | null
        }
        Insert: {
          can_conference?: boolean | null
          can_make_outbound?: boolean | null
          can_record?: boolean | null
          can_transcribe?: boolean | null
          can_transfer?: boolean | null
          created_at?: string | null
          id?: string
          included_inbound_minutes?: number | null
          included_outbound_minutes?: number | null
          included_phone_numbers?: number | null
          included_transcription_minutes?: number | null
          is_active?: boolean | null
          overage_inbound_cents?: number | null
          overage_outbound_cents?: number | null
          overage_transcription_cents?: number | null
          recording_retention_days?: number | null
          tier: string
          twilio_inbound_cost_cents?: number | null
          twilio_outbound_cost_cents?: number | null
          twilio_recording_cost_cents?: number | null
          twilio_transcription_cost_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          can_conference?: boolean | null
          can_make_outbound?: boolean | null
          can_record?: boolean | null
          can_transcribe?: boolean | null
          can_transfer?: boolean | null
          created_at?: string | null
          id?: string
          included_inbound_minutes?: number | null
          included_outbound_minutes?: number | null
          included_phone_numbers?: number | null
          included_transcription_minutes?: number | null
          is_active?: boolean | null
          overage_inbound_cents?: number | null
          overage_outbound_cents?: number | null
          overage_transcription_cents?: number | null
          recording_retention_days?: number | null
          tier?: string
          twilio_inbound_cost_cents?: number | null
          twilio_outbound_cost_cents?: number | null
          twilio_recording_cost_cents?: number | null
          twilio_transcription_cost_cents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          aaguid: string | null
          counter: number | null
          created_at: string | null
          credential_id: string
          device_name: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aaguid?: string | null
          counter?: number | null
          created_at?: string | null
          credential_id: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aaguid?: string | null
          counter?: number | null
          created_at?: string | null
          credential_id?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_config: {
        Row: {
          business_id: string | null
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          secret: string
          updated_at: string | null
          url: string
          webhook_type: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          events: string[]
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret: string
          updated_at?: string | null
          url: string
          webhook_type: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret?: string
          updated_at?: string | null
          url?: string
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          business_id: string
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          retry_count: number
          secret: string
          timeout_seconds: number
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          retry_count?: number
          secret: string
          timeout_seconds?: number
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          retry_count?: number
          secret?: string
          timeout_seconds?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          webhook_config_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_config_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_config_id_fkey"
            columns: ["webhook_config_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          business_id: string | null
          created_at: string | null
          events: string[]
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_status_code: number | null
          last_triggered_at: string | null
          secret: string
          updated_at: string | null
          url: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          events: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          access_token: string
          business_account_id: string
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          phone_number: string
          phone_number_id: string
          updated_at: string
          verify_token: string
        }
        Insert: {
          access_token: string
          business_account_id: string
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          phone_number: string
          phone_number_id: string
          updated_at?: string
          verify_token?: string
        }
        Update: {
          access_token?: string
          business_account_id?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          phone_number?: string
          phone_number_id?: string
          updated_at?: string
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcast_lists: {
        Row: {
          business_id: string | null
          created_at: string | null
          created_by: string | null
          customer_ids: string[] | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_ids?: string[] | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_ids?: string[] | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_lists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_customization: {
        Row: {
          auto_open_delay: number | null
          business_id: string
          button_text: string | null
          created_at: string
          custom_css: string | null
          custom_icon_url: string | null
          embed_token_id: string
          greeting_message: string | null
          icon_type: string
          id: string
          offline_message: string | null
          primary_color: string
          require_contact_info: boolean | null
          secondary_color: string
          show_button_text: boolean | null
          show_unread_badge: boolean | null
          sound_notifications: boolean | null
          start_minimized: boolean | null
          text_color: string
          updated_at: string
          welcome_message: string | null
          widget_position: string
          widget_shape: string | null
          widget_size: string
          widget_type: string
        }
        Insert: {
          auto_open_delay?: number | null
          business_id: string
          button_text?: string | null
          created_at?: string
          custom_css?: string | null
          custom_icon_url?: string | null
          embed_token_id: string
          greeting_message?: string | null
          icon_type?: string
          id?: string
          offline_message?: string | null
          primary_color?: string
          require_contact_info?: boolean | null
          secondary_color?: string
          show_button_text?: boolean | null
          show_unread_badge?: boolean | null
          sound_notifications?: boolean | null
          start_minimized?: boolean | null
          text_color?: string
          updated_at?: string
          welcome_message?: string | null
          widget_position?: string
          widget_shape?: string | null
          widget_size?: string
          widget_type?: string
        }
        Update: {
          auto_open_delay?: number | null
          business_id?: string
          button_text?: string | null
          created_at?: string
          custom_css?: string | null
          custom_icon_url?: string | null
          embed_token_id?: string
          greeting_message?: string | null
          icon_type?: string
          id?: string
          offline_message?: string | null
          primary_color?: string
          require_contact_info?: boolean | null
          secondary_color?: string
          show_button_text?: boolean | null
          show_unread_badge?: boolean | null
          sound_notifications?: boolean | null
          start_minimized?: boolean | null
          text_color?: string
          updated_at?: string
          welcome_message?: string | null
          widget_position?: string
          widget_shape?: string | null
          widget_size?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_customization_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_customization_embed_token_id_fkey"
            columns: ["embed_token_id"]
            isOneToOne: false
            referencedRelation: "embed_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number | null
          customer_id: string | null
          enrolled_at: string | null
          id: string
          last_step_at: string | null
          metadata: Json | null
          status: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          customer_id?: string | null
          enrolled_at?: string | null
          id?: string
          last_step_at?: string | null
          metadata?: Json | null
          status?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          customer_id?: string | null
          enrolled_at?: string | null
          id?: string
          last_step_at?: string | null
          metadata?: Json | null
          status?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_enrollments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_enrollments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_embed_sessions: { Args: never; Returns: undefined }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      cleanup_expired_sso_tokens: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      generate_site_id: { Args: never; Returns: string }
      get_or_create_user_business: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_business_ids: {
        Args: { _user_id: string }
        Returns: {
          business_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_message_count: {
        Args: { business_uuid: string }
        Returns: undefined
      }
      is_account_frozen: { Args: { _business_id: string }; Returns: boolean }
      is_admin_session: { Args: never; Returns: boolean }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_device_trusted: {
        Args: { _device_fingerprint: string; _user_id: string }
        Returns: boolean
      }
      is_ip_whitelisted: {
        Args: { _ip_address: string; _user_id: string }
        Returns: boolean
      }
      is_onebillchat_user: { Args: never; Returns: boolean }
      mark_conversation_resolved: {
        Args: {
          _conversation_id: string
          _resolution_type: string
          _resolution_value?: number
        }
        Returns: undefined
      }
      normalize_phone: { Args: { phone_num: string }; Returns: string }
      sync_all_email_accounts: { Args: never; Returns: undefined }
      user_belongs_to_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "agent"
      user_role: "admin" | "agent" | "viewer"
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
      app_role: ["superadmin", "admin", "agent"],
      user_role: ["admin", "agent", "viewer"],
    },
  },
} as const
