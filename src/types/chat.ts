export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  last_active?: string;
  notes?: string;
  last_contact_method?: "whatsapp" | "email";
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
}

export interface Message {
  id: string;
  content: string;
  direction: "inbound" | "outbound";
  created_at: string;
  customer_id: string;
  is_read: boolean;
  platform: string;
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
