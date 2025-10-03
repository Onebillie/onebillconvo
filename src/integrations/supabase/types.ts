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
      ai_assistant_config: {
        Row: {
          business_hours_end: string | null
          business_hours_start: string | null
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
          business_hours_end?: string | null
          business_hours_start?: string | null
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
          business_hours_end?: string | null
          business_hours_start?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model?: string | null
          out_of_hours_only?: boolean | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_rag_documents: {
        Row: {
          content: string
          created_at: string | null
          document_type: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_type?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_training_data: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
        }
        Relationships: []
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
        Relationships: []
      }
      contact_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
          color: string
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      conversations: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_archived: boolean | null
          labels: string[] | null
          last_message_at: string | null
          status: string | null
          status_tag_id: string | null
          updated_at: string | null
          whatsapp_account_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_archived?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          status?: string | null
          status_tag_id?: string | null
          updated_at?: string | null
          whatsapp_account_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_archived?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          status?: string | null
          status_tag_id?: string | null
          updated_at?: string | null
          whatsapp_account_id?: string | null
        }
        Relationships: [
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
            foreignKeyName: "conversations_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
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
          alternate_emails: string[] | null
          avatar: string | null
          created_at: string | null
          email: string | null
          id: string
          is_blocked: boolean | null
          last_active: string | null
          last_contact_method: string | null
          metadata: Json | null
          name: string
          notes: string | null
          phone: string
        }
        Insert: {
          alternate_emails?: string[] | null
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          last_active?: string | null
          last_contact_method?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          phone: string
        }
        Update: {
          alternate_emails?: string[] | null
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          last_active?: string | null
          last_contact_method?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
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
          is_active: boolean
          last_sync_at: string | null
          mark_as_read: boolean
          name: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_use_ssl: boolean
          smtp_username: string
          sync_enabled: boolean
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
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
          is_active?: boolean
          last_sync_at?: string | null
          mark_as_read?: boolean
          name: string
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_use_ssl?: boolean
          smtp_username: string
          sync_enabled?: boolean
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
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
          is_active?: boolean
          last_sync_at?: string | null
          mark_as_read?: boolean
          name?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_use_ssl?: boolean
          smtp_username?: string
          sync_enabled?: boolean
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_sync_logs: {
        Row: {
          created_at: string
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
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          media_type: string | null
          media_url: string | null
          name: string
          platform: string | null
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name: string
          platform?: string | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          name?: string
          platform?: string | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          direction: string
          external_message_id: string | null
          forwarded_from_message_id: string | null
          id: string
          is_read: boolean | null
          platform: string | null
          replied_to_message_id: string | null
          scheduled_at: string | null
          status: string | null
          thread_id: string | null
        }
        Insert: {
          channel?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction: string
          external_message_id?: string | null
          forwarded_from_message_id?: string | null
          id?: string
          is_read?: boolean | null
          platform?: string | null
          replied_to_message_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          thread_id?: string | null
        }
        Update: {
          channel?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction?: string
          external_message_id?: string | null
          forwarded_from_message_id?: string | null
          id?: string
          is_read?: boolean | null
          platform?: string | null
          replied_to_message_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          thread_id?: string | null
        }
        Relationships: [
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
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
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
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
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
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
          updated_at?: string | null
          user_id?: string | null
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
      whatsapp_accounts: {
        Row: {
          access_token: string
          business_account_id: string
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
      normalize_phone: {
        Args: { phone_num: string }
        Returns: string
      }
      sync_all_email_accounts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
// ✅ Add Template type for WhatsApp template integration
export interface Template {
  id: string
  name: string
  category: string | null
  content: string
  platform: string | null
  is_active: boolean | null
  media_type: string | null
  media_url: string | null
  usage_count: number | null
  variables: Json | null
  created_at: string | null
  updated_at: string | null
  metadata?: Record<string, any> // optional field for Meta sync data
}
