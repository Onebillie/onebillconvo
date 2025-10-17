export interface Customer {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  whatsapp_phone?: string;
  whatsapp_name?: string;
  email?: string;
  alternate_emails?: string[];
  address?: string;
  avatar?: string;
  last_active?: string;
  notes?: string;
  last_contact_method?: "whatsapp" | "email" | "sms" | "facebook" | "instagram";
  facebook_psid?: string;
  facebook_username?: string;
  instagram_id?: string;
  instagram_username?: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  status: string;
  status_tag_id?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  customer: Customer;
  unread_count?: number;
  assigned_user?: {
    id: string;
    full_name: string;
    department?: string;
  };
  status_tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  last_message?: {
    content: string;
    subject?: string;
    platform: string;
    direction: "inbound" | "outbound";
    created_at: string;
  };
}

export interface Message {
  id: string;
  content: string;
  subject?: string;
  direction: "inbound" | "outbound";
  created_at: string;
  customer_id: string;
  conversation_id?: string;
  is_read: boolean;
  platform: string;
  status?: string;
  replied_to_message_id?: string | null;
  external_message_id?: string | null;
  is_edited?: boolean;
  edited_at?: string;
  edited_by?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  is_starred?: boolean;
  starred_at?: string;
  starred_by?: string;
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  forwarded_from?: string;
  original_content?: string;
  message_attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
}

export interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
  }>;
}

export interface ConversationFilters {
  search: string;
  unread: boolean;
  statusIds: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  sortBy: 'newest' | 'oldest' | 'unread' | 'name_asc' | 'name_desc';
  platforms: string[];
  assignedTo: string | null;
}
