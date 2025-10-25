-- Training content organized by categories and features
CREATE TABLE training_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'guide',
  content JSONB NOT NULL,
  tags TEXT[],
  difficulty TEXT DEFAULT 'beginner',
  estimated_time TEXT,
  related_pages TEXT[],
  search_keywords TEXT[],
  video_url TEXT,
  screenshots JSONB,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE training_content ENABLE ROW LEVEL SECURITY;

-- All users can view published training content
CREATE POLICY "Anyone can view published training content"
  ON training_content FOR SELECT
  USING (is_published = true);

-- Training conversation history for context-aware responses
CREATE TABLE training_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  business_id UUID REFERENCES businesses(id),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_page TEXT,
  resolved BOOLEAN DEFAULT false,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE training_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own training conversations"
  ON training_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can create training conversations"
  ON training_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own training conversations"
  ON training_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Track which training content users have viewed/completed
CREATE TABLE training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  training_content_id UUID REFERENCES training_content(id),
  status TEXT DEFAULT 'viewed',
  completed_steps INT[],
  last_accessed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, training_content_id)
);

-- Enable RLS
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own training progress"
  ON training_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can track training progress"
  ON training_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update training progress"
  ON training_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Popular questions and answers for analytics
CREATE TABLE training_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer_quality FLOAT,
  was_helpful BOOLEAN,
  page_context TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert analytics
CREATE POLICY "Users can submit training analytics"
  ON training_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better search performance
CREATE INDEX idx_training_content_category ON training_content(category);
CREATE INDEX idx_training_content_tags ON training_content USING GIN(tags);
CREATE INDEX idx_training_content_keywords ON training_content USING GIN(search_keywords);
CREATE INDEX idx_training_conversations_user ON training_conversations(user_id);
CREATE INDEX idx_training_progress_user ON training_progress(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_training_content_updated_at
  BEFORE UPDATE ON training_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_conversations_updated_at
  BEFORE UPDATE ON training_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed comprehensive training content
INSERT INTO training_content (category, feature_name, title, description, content_type, difficulty, estimated_time, tags, search_keywords, related_pages, content) VALUES

-- Channel Setup Guides
('channels', 'whatsapp_setup', 'WhatsApp Business API Setup', 'Connect your WhatsApp Business account to start messaging customers', 'tutorial', 'beginner', '15 min', 
ARRAY['whatsapp', 'channels', 'setup'], 
ARRAY['connect whatsapp', 'whatsapp business api', 'whatsapp integration'],
ARRAY['/app/settings?tab=channels'],
'{
  "overview": "Connect your WhatsApp Business API to send and receive messages from customers on WhatsApp.",
  "prerequisites": ["WhatsApp Business API access", "Verified business phone number", "Meta Business account"],
  "steps": [
    {"step_number": 1, "title": "Navigate to Channel Settings", "description": "Go to Settings → Channels", "action": "navigate:/app/settings?tab=channels"},
    {"step_number": 2, "title": "Select WhatsApp", "description": "Click the WhatsApp card to begin setup"},
    {"step_number": 3, "title": "Enter Credentials", "description": "Provide your Phone Number ID, Business Account ID, Access Token, and Verify Token"},
    {"step_number": 4, "title": "Configure Webhook", "description": "Copy the webhook URL and add it to your Meta dashboard"},
    {"step_number": 5, "title": "Test Connection", "description": "Send a test message to verify the setup"}
  ],
  "troubleshooting": [
    {"issue": "Invalid credentials", "solution": "Double-check your tokens from Meta Business Manager"},
    {"issue": "Webhook not receiving messages", "solution": "Ensure webhook URL is correct and verify token matches"}
  ],
  "best_practices": ["Keep your access token secure", "Test with a small group first", "Monitor webhook logs"]
}'::jsonb),

('channels', 'email_setup', 'Email Integration Setup', 'Connect email accounts to manage customer emails', 'tutorial', 'intermediate', '20 min',
ARRAY['email', 'channels', 'imap', 'smtp'],
ARRAY['connect email', 'gmail integration', 'outlook setup', 'imap smtp'],
ARRAY['/app/settings?tab=channels'],
'{
  "overview": "Integrate your email accounts to receive and respond to customer emails within the platform.",
  "prerequisites": ["Email account credentials", "IMAP/SMTP enabled on your email provider"],
  "steps": [
    {"step_number": 1, "title": "Go to Channel Settings", "description": "Navigate to Settings → Channels", "action": "navigate:/app/settings?tab=channels"},
    {"step_number": 2, "title": "Select Email", "description": "Click on Email Account Management"},
    {"step_number": 3, "title": "Choose Provider", "description": "Select Gmail, Outlook, or Custom IMAP/SMTP"},
    {"step_number": 4, "title": "Enter Credentials", "description": "Provide email address, password/app password, server details"},
    {"step_number": 5, "title": "Test Connection", "description": "System will verify your settings"},
    {"step_number": 6, "title": "Enable Auto-Sync", "description": "Turn on automatic email syncing"}
  ],
  "troubleshooting": [
    {"issue": "Authentication failed", "solution": "Use app-specific password for Gmail/Outlook"},
    {"issue": "Emails not syncing", "solution": "Check IMAP/SMTP settings and port numbers"}
  ],
  "best_practices": ["Use app-specific passwords", "Enable 2FA on email account", "Monitor sync logs"]
}'::jsonb),

-- Marketing & Campaigns
('marketing', 'broadcast_campaign', 'Send WhatsApp Broadcast Messages', 'Create and send targeted broadcast campaigns to customer segments', 'tutorial', 'beginner', '10 min',
ARRAY['whatsapp', 'broadcast', 'marketing', 'campaign'],
ARRAY['send bulk whatsapp', 'group message', 'broadcast list', 'mass message'],
ARRAY['/app/marketing'],
'{
  "overview": "Broadcast campaigns let you send the same message to multiple customers at once. Perfect for announcements, promotions, or updates.",
  "prerequisites": ["WhatsApp Business API connected", "At least one approved WhatsApp template", "Customer list with WhatsApp numbers"],
  "steps": [
    {"step_number": 1, "title": "Navigate to Marketing", "description": "Click Marketing in the top navigation", "action": "navigate:/app/marketing"},
    {"step_number": 2, "title": "Create New Campaign", "description": "Click the Create Campaign button"},
    {"step_number": 3, "title": "Choose Campaign Type", "description": "Select Broadcast and check WhatsApp channel"},
    {"step_number": 4, "title": "Filter Recipients", "description": "Use filters to select which customers receive the message", "tips": ["Start with a small test group", "Exclude unsubscribed customers"]},
    {"step_number": 5, "title": "Select Template", "description": "Choose an approved WhatsApp template and fill in variables"},
    {"step_number": 6, "title": "Add CTAs", "description": "Add buttons like Shop Now or Learn More (optional)"},
    {"step_number": 7, "title": "Schedule or Send", "description": "Send immediately or schedule for later"},
    {"step_number": 8, "title": "Monitor Results", "description": "Track delivery, opens, and clicks in real-time"}
  ],
  "troubleshooting": [
    {"issue": "Template not approved", "solution": "Go to Settings → WhatsApp → Templates to submit for approval"},
    {"issue": "Messages not delivering", "solution": "Check WhatsApp API connection and credit balance"}
  ],
  "best_practices": ["Test with small group first", "Personalize with customer names", "Include clear CTA", "Respect business hours"]
}'::jsonb),

('marketing', 'customer_segments', 'Create Customer Segments', 'Build targeted customer segments using filters and criteria', 'tutorial', 'intermediate', '15 min',
ARRAY['segmentation', 'marketing', 'filters', 'targeting'],
ARRAY['customer groups', 'audience segmentation', 'filter customers', 'target audience'],
ARRAY['/app/settings?tab=segments'],
'{
  "overview": "Create dynamic customer segments to target specific groups with personalized campaigns.",
  "steps": [
    {"step_number": 1, "title": "Navigate to Segments", "description": "Go to Settings → Customer Segments", "action": "navigate:/app/settings?tab=segments"},
    {"step_number": 2, "title": "Create New Segment", "description": "Click Create Segment button"},
    {"step_number": 3, "title": "Name Your Segment", "description": "Give it a descriptive name like VIP Customers or Inactive Users"},
    {"step_number": 4, "title": "Add Filters", "description": "Use filters like Status Tags, Last Contacted, Channel, or custom fields"},
    {"step_number": 5, "title": "Make Dynamic", "description": "Enable Is Dynamic to auto-update segment membership"},
    {"step_number": 6, "title": "Save Segment", "description": "Save and use in campaigns"}
  ],
  "best_practices": ["Use descriptive names", "Enable dynamic for auto-updates", "Test segment size before campaigns", "Combine multiple filters for precision"]
}'::jsonb),

-- AI Features
('ai', 'ai_assistant_setup', 'Configure AI Assistant', 'Set up and train your AI assistant to handle customer inquiries', 'tutorial', 'intermediate', '20 min',
ARRAY['ai', 'assistant', 'automation', 'chatbot'],
ARRAY['setup ai', 'train ai', 'ai bot', 'automated responses'],
ARRAY['/app/settings?tab=ai'],
'{
  "overview": "The AI Assistant can automatically respond to customer messages using your knowledge base and training data.",
  "steps": [
    {"step_number": 1, "title": "Go to AI Settings", "description": "Navigate to Settings → AI Assistant", "action": "navigate:/app/settings?tab=ai"},
    {"step_number": 2, "title": "Enable AI Assistant", "description": "Toggle AI Assistant Enabled"},
    {"step_number": 3, "title": "Choose Provider", "description": "Select Lovable AI (recommended) or configure custom provider"},
    {"step_number": 4, "title": "Configure System Prompt", "description": "Define how the AI should behave and respond"},
    {"step_number": 5, "title": "Upload Knowledge Base", "description": "Upload documents (PDFs, docs) containing your product info, FAQs, policies"},
    {"step_number": 6, "title": "Add Training Q&A", "description": "Add common questions and their ideal answers"},
    {"step_number": 7, "title": "Set Privacy Settings", "description": "Configure data handling and PII masking"},
    {"step_number": 8, "title": "Test AI", "description": "Send test messages to verify responses"}
  ],
  "troubleshooting": [
    {"issue": "AI giving wrong answers", "solution": "Add more training data and refine system prompt"},
    {"issue": "AI not responding", "solution": "Check if AI is enabled and provider is configured"}
  ],
  "best_practices": ["Start with comprehensive knowledge base", "Use clear Q&A examples", "Enable approval queue initially", "Monitor and refine regularly"]
}'::jsonb),

-- Team & Collaboration
('team', 'add_team_members', 'Add and Manage Team Members', 'Invite team members and assign roles and permissions', 'tutorial', 'beginner', '10 min',
ARRAY['team', 'staff', 'permissions', 'users'],
ARRAY['add user', 'invite staff', 'team member', 'assign role'],
ARRAY['/app/settings?tab=staff'],
'{
  "overview": "Add team members to collaborate on customer conversations and assign appropriate permissions.",
  "steps": [
    {"step_number": 1, "title": "Go to Staff Settings", "description": "Navigate to Settings → Staff Management", "action": "navigate:/app/settings?tab=staff"},
    {"step_number": 2, "title": "Click Add Staff", "description": "Click the Add Staff Member button"},
    {"step_number": 3, "title": "Enter Details", "description": "Provide full name and email address"},
    {"step_number": 4, "title": "Assign Role", "description": "Choose role: Owner, Manager, or Agent"},
    {"step_number": 5, "title": "Set Permissions", "description": "Configure specific permissions if needed"},
    {"step_number": 6, "title": "Send Invitation", "description": "User will receive email invitation to join"}
  ],
  "best_practices": ["Use least privilege principle", "Review permissions regularly", "Remove inactive users", "Assign to teams for better organization"]
}'::jsonb),

-- Conversations & Messaging
('conversations', 'manage_conversations', 'Manage Customer Conversations', 'Organize, assign, and track customer conversations effectively', 'tutorial', 'beginner', '15 min',
ARRAY['conversations', 'messaging', 'inbox', 'customer service'],
ARRAY['handle conversations', 'reply customers', 'inbox management'],
ARRAY['/app/dashboard'],
'{
  "overview": "Learn how to efficiently manage customer conversations across all channels.",
  "steps": [
    {"step_number": 1, "title": "View All Conversations", "description": "Open Dashboard to see all conversations", "action": "navigate:/app/dashboard"},
    {"step_number": 2, "title": "Filter Conversations", "description": "Use filters like Status, Channel, Assigned To, Date Range"},
    {"step_number": 3, "title": "Select Conversation", "description": "Click on a conversation to view messages"},
    {"step_number": 4, "title": "Reply to Customer", "description": "Type message and send via WhatsApp, Email, SMS, etc."},
    {"step_number": 5, "title": "Assign Conversation", "description": "Assign to team member using assignment dropdown"},
    {"step_number": 6, "title": "Update Status", "description": "Change status (Open, Pending, Resolved, etc.)"},
    {"step_number": 7, "title": "Add Internal Notes", "description": "Add notes visible only to team"},
    {"step_number": 8, "title": "Create Tasks", "description": "Create follow-up tasks if needed"}
  ],
  "best_practices": ["Respond within 1 hour", "Use status tags consistently", "Add internal notes for context", "Assign conversations appropriately"]
}'::jsonb),

('conversations', 'message_templates', 'Use Message Templates & Quick Replies', 'Speed up responses with pre-written templates', 'tutorial', 'beginner', '10 min',
ARRAY['templates', 'quick replies', 'canned responses'],
ARRAY['message templates', 'quick replies', 'saved responses', 'canned messages'],
ARRAY['/app/settings?tab=quick-replies'],
'{
  "overview": "Save time with pre-written message templates and quick replies for common questions.",
  "steps": [
    {"step_number": 1, "title": "Go to Quick Replies", "description": "Navigate to Settings → Quick Replies", "action": "navigate:/app/settings?tab=quick-replies"},
    {"step_number": 2, "title": "Create Template", "description": "Click Add Quick Reply"},
    {"step_number": 3, "title": "Set Shortcut", "description": "Create a short keyword like /hello or /pricing"},
    {"step_number": 4, "title": "Write Message", "description": "Write the full response message"},
    {"step_number": 5, "title": "Add Variables", "description": "Use {{customer_name}}, {{business_name}} for personalization"},
    {"step_number": 6, "title": "Use in Conversations", "description": "Type / in message box to see all quick replies"}
  ],
  "best_practices": ["Use clear shortcut names", "Include personalization variables", "Keep templates up-to-date", "Create templates for FAQ"]
}'::jsonb),

-- Settings & Configuration
('settings', 'business_profile', 'Configure Business Profile', 'Set up your business information and branding', 'tutorial', 'beginner', '10 min',
ARRAY['settings', 'profile', 'business', 'branding'],
ARRAY['business settings', 'company profile', 'business info'],
ARRAY['/app/settings?tab=business'],
'{
  "overview": "Configure your business profile including name, contact info, and branding.",
  "steps": [
    {"step_number": 1, "title": "Go to Business Settings", "description": "Navigate to Settings → Business Profile", "action": "navigate:/app/settings?tab=business"},
    {"step_number": 2, "title": "Update Business Name", "description": "Enter your official business name"},
    {"step_number": 3, "title": "Add Contact Info", "description": "Provide email, phone, website, address"},
    {"step_number": 4, "title": "Upload Logo", "description": "Upload your business logo for branding"},
    {"step_number": 5, "title": "Set Business Hours", "description": "Configure your operating hours"},
    {"step_number": 6, "title": "Save Changes", "description": "Click Save to update profile"}
  ],
  "best_practices": ["Keep information accurate", "Upload high-quality logo", "Update hours for holidays"]
}'::jsonb),

-- API & Integrations
('api', 'api_authentication', 'API Authentication & Access', 'Generate API keys and authenticate API requests', 'tutorial', 'advanced', '15 min',
ARRAY['api', 'integration', 'authentication', 'developer'],
ARRAY['api key', 'api access', 'developer api', 'integrate api'],
ARRAY['/app/settings?tab=api'],
'{
  "overview": "Generate API keys to integrate À La Carte Chat with your existing systems.",
  "steps": [
    {"step_number": 1, "title": "Go to API Settings", "description": "Navigate to Settings → API Access", "action": "navigate:/app/settings?tab=api"},
    {"step_number": 2, "title": "Generate API Key", "description": "Click Generate New API Key"},
    {"step_number": 3, "title": "Name Your Key", "description": "Give it a descriptive name (e.g., CRM Integration)"},
    {"step_number": 4, "title": "Copy Key", "description": "Copy the API key immediately (shown only once)"},
    {"step_number": 5, "title": "Use in Requests", "description": "Include key in Authorization header: Bearer YOUR_API_KEY"},
    {"step_number": 6, "title": "Test API", "description": "Make test API calls to verify"}
  ],
  "troubleshooting": [
    {"issue": "401 Unauthorized", "solution": "Check API key is correct and included in Authorization header"},
    {"issue": "403 Forbidden", "solution": "Verify API key has necessary permissions"}
  ],
  "best_practices": ["Store keys securely", "Use separate keys for different integrations", "Rotate keys periodically", "Monitor API usage"]
}'::jsonb),

-- Troubleshooting
('troubleshooting', 'messages_not_sending', 'Troubleshoot Messages Not Sending', 'Fix common issues with message delivery', 'troubleshooting', 'intermediate', '10 min',
ARRAY['troubleshooting', 'messages', 'delivery', 'errors'],
ARRAY['messages failing', 'cant send message', 'delivery failed', 'message error'],
ARRAY['/app/dashboard'],
'{
  "overview": "Common reasons why messages fail to send and how to fix them.",
  "common_issues": [
    {
      "issue": "WhatsApp messages not sending",
      "causes": ["Invalid phone number format", "Customer outside 24-hour window", "Template not approved", "API credentials incorrect"],
      "solutions": ["Verify phone number includes country code", "Use approved template for outside 24hr window", "Check WhatsApp API settings", "Test API connection"]
    },
    {
      "issue": "Email messages not sending",
      "causes": ["SMTP settings incorrect", "Email account disabled", "Recipient email invalid", "Daily send limit reached"],
      "solutions": ["Verify SMTP credentials", "Check email account sync status", "Validate recipient email", "Monitor usage limits"]
    },
    {
      "issue": "SMS messages not sending",
      "causes": ["Twilio credentials invalid", "Insufficient credits", "Invalid phone number", "Carrier blocking"],
      "solutions": ["Check Twilio API settings", "Add credits to Twilio account", "Verify phone number format", "Contact carrier"]
    }
  ],
  "best_practices": ["Monitor message logs", "Test before bulk sends", "Check account status", "Keep credentials updated"]
}'::jsonb);
