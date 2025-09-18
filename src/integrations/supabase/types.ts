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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bill_uploads: {
        Row: {
          casper_lead_id: string | null
          contract_end_date: string | null
          extracted_data: Json | null
          file_path: string
          file_type: string | null
          id: string
          original_filename: string
          processed: boolean | null
          processing_error: string | null
          renewal_date: string | null
          supplier_name: string | null
          upload_date: string | null
          user_id: string | null
          utility_type: string | null
        }
        Insert: {
          casper_lead_id?: string | null
          contract_end_date?: string | null
          extracted_data?: Json | null
          file_path: string
          file_type?: string | null
          id?: string
          original_filename: string
          processed?: boolean | null
          processing_error?: string | null
          renewal_date?: string | null
          supplier_name?: string | null
          upload_date?: string | null
          user_id?: string | null
          utility_type?: string | null
        }
        Update: {
          casper_lead_id?: string | null
          contract_end_date?: string | null
          extracted_data?: Json | null
          file_path?: string
          file_type?: string | null
          id?: string
          original_filename?: string
          processed?: boolean | null
          processing_error?: string | null
          renewal_date?: string | null
          supplier_name?: string | null
          upload_date?: string | null
          user_id?: string | null
          utility_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_uploads_casper_lead_id_fkey"
            columns: ["casper_lead_id"]
            isOneToOne: false
            referencedRelation: "casper_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      casper_leads: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          last_contacted_at: string | null
          notes: string | null
          phone_number: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          phone_number?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          phone_number?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      consumption: {
        Row: {
          consumption_kwh: number | null
          created_at: string | null
          date: string | null
          id: string
          mprn: string | null
          time_slot: string | null
        }
        Insert: {
          consumption_kwh?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          mprn?: string | null
          time_slot?: string | null
        }
        Update: {
          consumption_kwh?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          mprn?: string | null
          time_slot?: string | null
        }
        Relationships: []
      }
      consumption_data: {
        Row: {
          date_effective: string | null
          Day: number | null
          night: number | null
          night_boost: number | null
          peak: number | null
          standing_charge: string | null
          Supplier: string | null
          tariff_name: string | null
        }
        Insert: {
          date_effective?: string | null
          Day?: number | null
          night?: number | null
          night_boost?: number | null
          peak?: number | null
          standing_charge?: string | null
          Supplier?: string | null
          tariff_name?: string | null
        }
        Update: {
          date_effective?: string | null
          Day?: number | null
          night?: number | null
          night_boost?: number | null
          peak?: number | null
          standing_charge?: string | null
          Supplier?: string | null
          tariff_name?: string | null
        }
        Relationships: []
      }
      contact_data: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          eircode: string | null
          first_name: string | null
          id: string
          joint_account: boolean | null
          last_name: string | null
          phone_number: string | null
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          eircode?: string | null
          first_name?: string | null
          id?: string
          joint_account?: boolean | null
          last_name?: string | null
          phone_number?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          eircode?: string | null
          first_name?: string | null
          id?: string
          joint_account?: boolean | null
          last_name?: string | null
          phone_number?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          customer_id: string
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          cost_eur: number | null
          created_at: string | null
          date: string | null
          id: string
          tariff_id: string | null
          time_slot: string | null
        }
        Insert: {
          cost_eur?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          tariff_id?: string | null
          time_slot?: string | null
        }
        Update: {
          cost_eur?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          tariff_id?: string | null
          time_slot?: string | null
        }
        Relationships: []
      }
      customer_interactions: {
        Row: {
          admin_id: string
          created_at: string
          customer_id: string
          id: string
          interaction_type: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          customer_id: string
          id?: string
          interaction_type: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          interaction_type?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          last_active: string | null
          name: string
          phone: string | null
          tags: string[] | null
          twitter: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          last_active?: string | null
          name: string
          phone?: string | null
          tags?: string[] | null
          twitter?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          last_active?: string | null
          name?: string
          phone?: string | null
          tags?: string[] | null
          twitter?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string | null
          id: string
          key_identifier: string
          key_purpose: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_identifier: string
          key_purpose: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_identifier?: string
          key_purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      energy_providers: {
        Row: {
          created_at: string | null
          id: string
          last_scraped_at: string | null
          logo_url: string | null
          name: string
          scraping_enabled: boolean | null
          selector_paths: Json | null
          updated_at: string | null
          website_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_scraped_at?: string | null
          logo_url?: string | null
          name: string
          scraping_enabled?: boolean | null
          selector_paths?: Json | null
          updated_at?: string | null
          website_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_scraped_at?: string | null
          logo_url?: string | null
          name?: string
          scraping_enabled?: boolean | null
          selector_paths?: Json | null
          updated_at?: string | null
          website_url?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          message_id: string
          size: number
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          message_id: string
          size: number
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          message_id?: string
          size?: number
          type?: string
          url?: string
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          customer_id: string
          direction: string
          external_message_id: string | null
          id: string
          is_read: boolean | null
          platform: string
          thread_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          customer_id: string
          direction: string
          external_message_id?: string | null
          id?: string
          is_read?: boolean | null
          platform: string
          thread_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          customer_id?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          is_read?: boolean | null
          platform?: string
          thread_id?: string
          updated_at?: string | null
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
        ]
      }
      mfa_history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          updated_at: string | null
          user_id: string
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          updated_at?: string | null
          user_id: string
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          verification_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      new_tariffs: {
        Row: {
          carbon_tax: number | null
          connection_fee: number | null
          connection_type: string | null
          contract_length: number | null
          created_at: string | null
          day_end_time: string | null
          day_rate: number | null
          day_start_time: string | null
          deleted_at: string | null
          df_id: number | null
          dg_type_id: number | null
          discount: number | null
          discount_percentage: number | null
          ev_end_time: string | null
          ev_rate: number | null
          ev_start_time: string | null
          exit_fee: number | null
          file_id: number
          free_saturday: number | null
          free_sunday: number | null
          green: number | null
          id: number
          is_active: number
          is_standard: number
          last_check_date: string | null
          mcc_id: number | null
          new_customer: number | null
          night_end_time: string | null
          night_rate: number | null
          night_start_time: string | null
          nsh_end_time: string | null
          nsh_rate: number | null
          nsh_standing_charge: number | null
          nsh_standing_charge_currency: string | null
          nsh_standing_charge_period: string | null
          nsh_start_time: string | null
          payment_type: string | null
          peak_end_time: string | null
          peak_rate: number | null
          peak_start_time: string | null
          price: number | null
          provider_id: number | null
          rate: number | null
          rate_24_hour: number | null
          rate_currency: string | null
          service_id: number | null
          solar_rate: number | null
          solar_time: number | null
          speed: string | null
          standard_tariff_id: number | null
          standing_charge: number | null
          standing_charge_currency: string | null
          standing_charge_period: string | null
          tariff_end_date: string | null
          tariff_start_date: string | null
          title: string | null
          top_tariff_id: number | null
          updated_at: string | null
        }
        Insert: {
          carbon_tax?: number | null
          connection_fee?: number | null
          connection_type?: string | null
          contract_length?: number | null
          created_at?: string | null
          day_end_time?: string | null
          day_rate?: number | null
          day_start_time?: string | null
          deleted_at?: string | null
          df_id?: number | null
          dg_type_id?: number | null
          discount?: number | null
          discount_percentage?: number | null
          ev_end_time?: string | null
          ev_rate?: number | null
          ev_start_time?: string | null
          exit_fee?: number | null
          file_id?: number
          free_saturday?: number | null
          free_sunday?: number | null
          green?: number | null
          id?: number
          is_active?: number
          is_standard?: number
          last_check_date?: string | null
          mcc_id?: number | null
          new_customer?: number | null
          night_end_time?: string | null
          night_rate?: number | null
          night_start_time?: string | null
          nsh_end_time?: string | null
          nsh_rate?: number | null
          nsh_standing_charge?: number | null
          nsh_standing_charge_currency?: string | null
          nsh_standing_charge_period?: string | null
          nsh_start_time?: string | null
          payment_type?: string | null
          peak_end_time?: string | null
          peak_rate?: number | null
          peak_start_time?: string | null
          price?: number | null
          provider_id?: number | null
          rate?: number | null
          rate_24_hour?: number | null
          rate_currency?: string | null
          service_id?: number | null
          solar_rate?: number | null
          solar_time?: number | null
          speed?: string | null
          standard_tariff_id?: number | null
          standing_charge?: number | null
          standing_charge_currency?: string | null
          standing_charge_period?: string | null
          tariff_end_date?: string | null
          tariff_start_date?: string | null
          title?: string | null
          top_tariff_id?: number | null
          updated_at?: string | null
        }
        Update: {
          carbon_tax?: number | null
          connection_fee?: number | null
          connection_type?: string | null
          contract_length?: number | null
          created_at?: string | null
          day_end_time?: string | null
          day_rate?: number | null
          day_start_time?: string | null
          deleted_at?: string | null
          df_id?: number | null
          dg_type_id?: number | null
          discount?: number | null
          discount_percentage?: number | null
          ev_end_time?: string | null
          ev_rate?: number | null
          ev_start_time?: string | null
          exit_fee?: number | null
          file_id?: number
          free_saturday?: number | null
          free_sunday?: number | null
          green?: number | null
          id?: number
          is_active?: number
          is_standard?: number
          last_check_date?: string | null
          mcc_id?: number | null
          new_customer?: number | null
          night_end_time?: string | null
          night_rate?: number | null
          night_start_time?: string | null
          nsh_end_time?: string | null
          nsh_rate?: number | null
          nsh_standing_charge?: number | null
          nsh_standing_charge_currency?: string | null
          nsh_standing_charge_period?: string | null
          nsh_start_time?: string | null
          payment_type?: string | null
          peak_end_time?: string | null
          peak_rate?: number | null
          peak_start_time?: string | null
          price?: number | null
          provider_id?: number | null
          rate?: number | null
          rate_24_hour?: number | null
          rate_currency?: string | null
          service_id?: number | null
          solar_rate?: number | null
          solar_time?: number | null
          speed?: string | null
          standard_tariff_id?: number | null
          standing_charge?: number | null
          standing_charge_currency?: string | null
          standing_charge_period?: string | null
          tariff_end_date?: string | null
          tariff_start_date?: string | null
          title?: string | null
          top_tariff_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plan_services: {
        Row: {
          additional_cost: number | null
          id: string
          is_included: boolean
          max_quantity: number | null
          plan_id: string | null
          service_id: string | null
        }
        Insert: {
          additional_cost?: number | null
          id?: string
          is_included?: boolean
          max_quantity?: number | null
          plan_id?: string | null
          service_id?: string | null
        }
        Update: {
          additional_cost?: number | null
          id?: string
          is_included?: boolean
          max_quantity?: number | null
          plan_id?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_services_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          is_active: boolean | null
          platform: string
          platform_user_id: string
          platform_username: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          is_active?: boolean | null
          platform: string
          platform_user_id: string
          platform_username?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          platform_user_id?: string
          platform_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_policies: {
        Row: {
          bill_upload_id: string | null
          car_brand: string | null
          car_model: string | null
          car_registration: string | null
          cover_details: Json | null
          created_at: string | null
          customer_name: string | null
          id: string
          processed_at: string | null
          raw_extraction: Json | null
          user_id: string | null
        }
        Insert: {
          bill_upload_id?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_registration?: string | null
          cover_details?: Json | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          processed_at?: string | null
          raw_extraction?: Json | null
          user_id?: string | null
        }
        Update: {
          bill_upload_id?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_registration?: string | null
          cover_details?: Json | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          processed_at?: string | null
          raw_extraction?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_policies_bill_upload_id_fkey"
            columns: ["bill_upload_id"]
            isOneToOne: false
            referencedRelation: "bill_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          encrypted_data: string | null
          full_name: string | null
          id: string
          iv: string | null
          mfa_enabled: boolean | null
          mfa_method: string | null
          mfa_verified: boolean | null
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_data?: string | null
          full_name?: string | null
          id: string
          iv?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          mfa_verified?: boolean | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_data?: string | null
          full_name?: string | null
          id?: string
          iv?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          mfa_verified?: boolean | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          reward_type: string
          reward_value: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          reward_type: string
          reward_value: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          reward_type?: string
          reward_value?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      savings_recommendations: {
        Row: {
          casper_lead_id: string | null
          created_at: string | null
          current_annual_cost: number | null
          current_plan: string | null
          current_supplier: string | null
          estimated_savings: number | null
          id: string
          recommendation_data: Json | null
          recommended_annual_cost: number | null
          recommended_plan: string | null
          recommended_supplier: string | null
          updated_at: string | null
          user_id: string | null
          utility_type: string
        }
        Insert: {
          casper_lead_id?: string | null
          created_at?: string | null
          current_annual_cost?: number | null
          current_plan?: string | null
          current_supplier?: string | null
          estimated_savings?: number | null
          id?: string
          recommendation_data?: Json | null
          recommended_annual_cost?: number | null
          recommended_plan?: string | null
          recommended_supplier?: string | null
          updated_at?: string | null
          user_id?: string | null
          utility_type: string
        }
        Update: {
          casper_lead_id?: string | null
          created_at?: string | null
          current_annual_cost?: number | null
          current_plan?: string | null
          current_supplier?: string | null
          estimated_savings?: number | null
          id?: string
          recommendation_data?: Json | null
          recommended_annual_cost?: number | null
          recommended_plan?: string | null
          recommended_supplier?: string | null
          updated_at?: string | null
          user_id?: string | null
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_recommendations_casper_lead_id_fkey"
            columns: ["casper_lead_id"]
            isOneToOne: false
            referencedRelation: "casper_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      service_configurations: {
        Row: {
          bg_color: string | null
          category: Database["public"]["Enums"]["service_category"]
          created_at: string | null
          description: string | null
          icon_color: string | null
          icon_name: string
          id: string
          is_active: boolean | null
          name: string
          service_id: string
          updated_at: string | null
        }
        Insert: {
          bg_color?: string | null
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description?: string | null
          icon_color?: string | null
          icon_name: string
          id?: string
          is_active?: boolean | null
          name: string
          service_id: string
          updated_at?: string | null
        }
        Update: {
          bg_color?: string | null
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description?: string | null
          icon_color?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          service_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string | null
          display_order: number | null
          field_key: string
          field_label: string
          field_type: Database["public"]["Enums"]["field_type"]
          help_text: string | null
          id: string
          is_required: boolean | null
          options: Json | null
          placeholder: string | null
          service_id: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string | null
          display_order?: number | null
          field_key: string
          field_label: string
          field_type: Database["public"]["Enums"]["field_type"]
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          service_id: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string | null
          display_order?: number | null
          field_key?: string
          field_label?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          service_id?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "service_form_fields_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_configurations"
            referencedColumns: ["service_id"]
          },
        ]
      }
      service_questions: {
        Row: {
          conditional_field: string | null
          conditional_value: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json | null
          question_key: string
          question_text: string
          question_type: Database["public"]["Enums"]["field_type"]
          service_id: string
          updated_at: string | null
        }
        Insert: {
          conditional_field?: string | null
          conditional_value?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          question_key: string
          question_text: string
          question_type: Database["public"]["Enums"]["field_type"]
          service_id: string
          updated_at?: string | null
        }
        Update: {
          conditional_field?: string | null
          conditional_value?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          question_key?: string
          question_text?: string
          question_type?: Database["public"]["Enums"]["field_type"]
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_questions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_configurations"
            referencedColumns: ["service_id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number | null
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          service_key: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          service_key: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          service_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          consent_timestamp: string
          created_at: string
          document_type: string
          document_version: string | null
          id: string
          ip_address: string | null
          is_valid: boolean | null
          signature_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_timestamp?: string
          created_at?: string
          document_type: string
          document_version?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          signature_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_timestamp?: string
          created_at?: string
          document_type?: string
          document_version?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          signature_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signed_documents: {
        Row: {
          created_at: string
          document_path: string
          document_type: string
          document_version: string | null
          id: string
          signature_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_path: string
          document_type: string
          document_version?: string | null
          id?: string
          signature_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_path?: string
          document_type?: string
          document_version?: string | null
          id?: string
          signature_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signed_documents_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_electricity_comparison: {
        Row: {
          consumption_data: Json | null
          cost_data: Json | null
          created_at: string
          current_supplier: string | null
          current_tariff: string | null
          date_period: string | null
          id: string
          mprn: string | null
          summary_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consumption_data?: Json | null
          cost_data?: Json | null
          created_at?: string
          current_supplier?: string | null
          current_tariff?: string | null
          date_period?: string | null
          id?: string
          mprn?: string | null
          summary_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consumption_data?: Json | null
          cost_data?: Json | null
          created_at?: string
          current_supplier?: string | null
          current_tariff?: string | null
          date_period?: string | null
          id?: string
          mprn?: string | null
          summary_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_electricity_tariffs: {
        Row: {
          created_at: string
          day: number | null
          dg_code: string | null
          effective_from: string
          effective_to: string | null
          id: string
          mcc_code: string | null
          night: number | null
          night_boost: number | null
          peak: number | null
          standing_charge: number | null
          supplier: string
          tariff_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: number | null
          dg_code?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          mcc_code?: string | null
          night?: number | null
          night_boost?: number | null
          peak?: number | null
          standing_charge?: number | null
          supplier: string
          tariff_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: number | null
          dg_code?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          mcc_code?: string | null
          night?: number | null
          night_boost?: number | null
          peak?: number | null
          standing_charge?: number | null
          supplier?: string
          tariff_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          status: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          subscription_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_actions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_outgoings: number
          max_properties: number
          name: string
          price: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_outgoings?: number
          max_properties?: number
          name: string
          price: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_outgoings?: number
          max_properties?: number
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_frequency: string
          created_at: string | null
          id: string
          last_transaction_date: string | null
          name: string
          next_billing_date: string | null
          provider: string
          status: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          billing_frequency: string
          created_at?: string | null
          id?: string
          last_transaction_date?: string | null
          name: string
          next_billing_date?: string | null
          provider: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          billing_frequency?: string
          created_at?: string | null
          id?: string
          last_transaction_date?: string | null
          name?: string
          next_billing_date?: string | null
          provider?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      summary: {
        Row: {
          created_at: string | null
          daily_difference: number | null
          day_usage: number | null
          exporting_hours: number | null
          id: string
          month: string | null
          night_boost_usage: number | null
          night_usage: number | null
          past_avg_daily: number | null
          peak_usage: number | null
          percentage_increase: number | null
          present_avg_daily: number | null
        }
        Insert: {
          created_at?: string | null
          daily_difference?: number | null
          day_usage?: number | null
          exporting_hours?: number | null
          id?: string
          month?: string | null
          night_boost_usage?: number | null
          night_usage?: number | null
          past_avg_daily?: number | null
          peak_usage?: number | null
          percentage_increase?: number | null
          present_avg_daily?: number | null
        }
        Update: {
          created_at?: string | null
          daily_difference?: number | null
          day_usage?: number | null
          exporting_hours?: number | null
          id?: string
          month?: string | null
          night_boost_usage?: number | null
          night_usage?: number | null
          past_avg_daily?: number | null
          peak_usage?: number | null
          percentage_increase?: number | null
          present_avg_daily?: number | null
        }
        Relationships: []
      }
      tariff_comparisons: {
        Row: {
          created_at: string | null
          encrypted_data: string | null
          id: string
          iv: string | null
          updated_at: string | null
          user_id: string
          utility_type: string
        }
        Insert: {
          created_at?: string | null
          encrypted_data?: string | null
          id?: string
          iv?: string | null
          updated_at?: string | null
          user_id: string
          utility_type: string
        }
        Update: {
          created_at?: string | null
          encrypted_data?: string | null
          id?: string
          iv?: string | null
          updated_at?: string | null
          user_id?: string
          utility_type?: string
        }
        Relationships: []
      }
      tariff_scraping_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          provider: string
          started_at: string | null
          status: string
          tariffs_added: number | null
          tariffs_found: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider: string
          started_at?: string | null
          status?: string
          tariffs_added?: number | null
          tariffs_found?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider?: string
          started_at?: string | null
          status?: string
          tariffs_added?: number | null
          tariffs_found?: number | null
        }
        Relationships: []
      }
      tariffs: {
        Row: {
          created_at: string | null
          date_effective: string | null
          day: number | null
          id: string
          night: number | null
          night_boost: number | null
          peak: number | null
          standing_charge: number | null
          supplier: string | null
          tariff_name: string | null
        }
        Insert: {
          created_at?: string | null
          date_effective?: string | null
          day?: number | null
          id?: string
          night?: number | null
          night_boost?: number | null
          peak?: number | null
          standing_charge?: number | null
          supplier?: string | null
          tariff_name?: string | null
        }
        Update: {
          created_at?: string | null
          date_effective?: string | null
          day?: number | null
          id?: string
          night?: number | null
          night_boost?: number | null
          peak?: number | null
          standing_charge?: number | null
          supplier?: string | null
          tariff_name?: string | null
        }
        Relationships: []
      }
      user_contact_data: {
        Row: {
          address: string | null
          created_at: string
          eircode: string | null
          id: string
          phone_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          eircode?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          eircode?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_data: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_solar_insights: {
        Row: {
          created_at: string
          eircode: string
          id: string
          insights_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eircode: string
          id?: string
          insights_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eircode?: string
          id?: string
          insights_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users_electricity: {
        Row: {
          created_at: string | null
          id: string
          meter_serial_number: string | null
          mprn: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meter_serial_number?: string | null
          mprn?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meter_serial_number?: string | null
          mprn?: string | null
        }
        Relationships: []
      }
      utility_details: {
        Row: {
          account_number: string | null
          annual_usage: number | null
          bill_upload_id: string | null
          casper_lead_id: string | null
          contract_end_date: string | null
          created_at: string | null
          current_rate: number | null
          id: string
          meter_number: string | null
          meter_type: string | null
          payment_method: string | null
          plan_name: string | null
          renewal_date: string | null
          standing_charge: number | null
          supplier_name: string | null
          updated_at: string | null
          user_id: string | null
          utility_type: string
        }
        Insert: {
          account_number?: string | null
          annual_usage?: number | null
          bill_upload_id?: string | null
          casper_lead_id?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          current_rate?: number | null
          id?: string
          meter_number?: string | null
          meter_type?: string | null
          payment_method?: string | null
          plan_name?: string | null
          renewal_date?: string | null
          standing_charge?: number | null
          supplier_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          utility_type: string
        }
        Update: {
          account_number?: string | null
          annual_usage?: number | null
          bill_upload_id?: string | null
          casper_lead_id?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          current_rate?: number | null
          id?: string
          meter_number?: string | null
          meter_type?: string | null
          payment_method?: string | null
          plan_name?: string | null
          renewal_date?: string | null
          standing_charge?: number | null
          supplier_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_details_bill_upload_id_fkey"
            columns: ["bill_upload_id"]
            isOneToOne: false
            referencedRelation: "bill_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_details_casper_lead_id_fkey"
            columns: ["casper_lead_id"]
            isOneToOne: false
            referencedRelation: "casper_leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_by_email: {
        Args: { user_email: string }
        Returns: boolean
      }
      get_admin_role: {
        Args: { user_id: string }
        Returns: string
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      store_bill_analysis: {
        Args: {
          p_casper_lead_id: string
          p_extracted_data: Json
          p_file_path: string
          p_original_filename: string
          p_supplier_name: string
          p_user_id: string
          p_utility_type: string
        }
        Returns: string
      }
      store_utility_bill: {
        Args: {
          p_file_path: string
          p_original_filename: string
          p_user_id: string
          p_utility_type?: string
        }
        Returns: string
      }
      validate_mfa_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role: "super_admin" | "support_agent" | "account_manager"
      field_type:
        | "text"
        | "select"
        | "radio"
        | "checkbox"
        | "date"
        | "number"
        | "textarea"
      service_category: "utilities" | "insurance" | "financial" | "connectivity"
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
      admin_role: ["super_admin", "support_agent", "account_manager"],
      field_type: [
        "text",
        "select",
        "radio",
        "checkbox",
        "date",
        "number",
        "textarea",
      ],
      service_category: ["utilities", "insurance", "financial", "connectivity"],
    },
  },
} as const
