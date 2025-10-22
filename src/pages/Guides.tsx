import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { BookOpen, MessageSquare, Mail, Phone, Instagram, Facebook, Globe, Zap, Settings, Users } from "lucide-react";

const Guides = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const guides = [
    {
      icon: MessageSquare,
      title: "Setting Up WhatsApp Business API",
      description: "Complete guide to connecting your WhatsApp Business API account with À La Carte Chat",
      category: "Channel Setup",
      readTime: "10 min",
      content: [
        {
          heading: "Prerequisites",
          text: "Before you begin, you'll need:\n• A Facebook Business Manager account\n• A phone number dedicated to WhatsApp Business API (cannot be used with regular WhatsApp)\n• Verification documents (business registration, etc.)\n• Access to your business website or domain"
        },
        {
          heading: "Step 1: Apply for WhatsApp Business API",
          text: "1. Go to Facebook Business Manager (business.facebook.com)\n2. Navigate to 'Settings' → 'WhatsApp Business API'\n3. Click 'Get Started' and follow the application process\n4. Submit required documents for verification\n5. Wait for approval (typically 3-7 business days)"
        },
        {
          heading: "Step 2: Connect to À La Carte Chat",
          text: "Once approved:\n1. Log in to À La Carte Chat\n2. Go to Settings → Channels → WhatsApp\n3. Click 'Connect WhatsApp Business API'\n4. Enter your WhatsApp Business API credentials:\n   - Phone Number ID\n   - WhatsApp Business Account ID\n   - Access Token (from Facebook Business Manager)\n5. Click 'Verify Connection'"
        },
        {
          heading: "Step 3: Configure Webhooks",
          text: "1. In Facebook Business Manager, go to your WhatsApp Business API settings\n2. Navigate to 'Webhooks'\n3. Copy the webhook URL from À La Carte Chat (found in Settings → Channels → WhatsApp)\n4. Add the webhook URL to Facebook\n5. Enter the verification token provided by À La Carte Chat\n6. Subscribe to these events:\n   - messages\n   - message_status\n   - messaging_feedback"
        },
        {
          heading: "Step 4: Test Your Connection",
          text: "1. Send a test message to your WhatsApp Business number\n2. Check if it appears in your À La Carte Chat inbox\n3. Reply from the platform\n4. Confirm the recipient receives your message\n5. Verify message status updates are working"
        },
        {
          heading: "Troubleshooting",
          text: "Common issues:\n• Webhook not receiving messages → Check webhook URL and token\n• Messages not sending → Verify access token is valid\n• Rate limiting → WhatsApp has conversation limits; contact Facebook to increase\n• Template messages → Required for initiating conversations outside 24h window"
        }
      ]
    },
    {
      icon: Mail,
      title: "Connecting Your Email Accounts",
      description: "Learn how to integrate Gmail, Outlook, or any email provider using IMAP/SMTP",
      category: "Channel Setup",
      readTime: "8 min",
      content: [
        {
          heading: "Supported Email Providers",
          text: "À La Carte Chat supports:\n• Gmail (OAuth2 recommended)\n• Microsoft Outlook/Office 365 (OAuth2 recommended)\n• Any provider with IMAP/SMTP (custom domains)\n• Yahoo Mail, ProtonMail, Zoho Mail, etc."
        },
        {
          heading: "Gmail Setup (Recommended Method)",
          text: "1. Go to Settings → Channels → Email\n2. Click 'Connect Gmail Account'\n3. Choose 'Sign in with Google' (OAuth2)\n4. Grant permissions to À La Carte Chat\n5. Your inbox will sync automatically\n\nNote: This method is more secure and doesn't require app passwords."
        },
        {
          heading: "Outlook/Office 365 Setup",
          text: "1. Go to Settings → Channels → Email\n2. Click 'Connect Outlook Account'\n3. Choose 'Sign in with Microsoft' (OAuth2)\n4. Grant permissions\n5. Select which folders to sync (Inbox, Sent, etc.)"
        },
        {
          heading: "Custom Domain/IMAP Setup",
          text: "For other providers:\n1. Go to Settings → Channels → Email\n2. Click 'Add Custom Email'\n3. Enter your email settings:\n\nIMAP Settings (Incoming):\n   - Server: imap.yourprovider.com\n   - Port: 993 (SSL) or 143 (STARTTLS)\n   - Username: your@email.com\n   - Password: your password or app password\n\nSMTP Settings (Outgoing):\n   - Server: smtp.yourprovider.com\n   - Port: 465 (SSL) or 587 (STARTTLS)\n   - Username: your@email.com\n   - Password: same as above\n\n4. Click 'Test Connection'\n5. If successful, click 'Save & Start Syncing'"
        },
        {
          heading: "Common IMAP/SMTP Settings",
          text: "Gmail:\n• IMAP: imap.gmail.com:993\n• SMTP: smtp.gmail.com:587\n• Requires App Password (Settings → Security → 2-Step Verification → App Passwords)\n\nOutlook.com:\n• IMAP: outlook.office365.com:993\n• SMTP: smtp.office365.com:587\n\nYahoo Mail:\n• IMAP: imap.mail.yahoo.com:993\n• SMTP: smtp.mail.yahoo.com:587\n• Requires App Password"
        },
        {
          heading: "Sync Settings & Troubleshooting",
          text: "Sync Options:\n• Sync frequency: Every 5 minutes (automatic)\n• Folder selection: Choose which folders to monitor\n• Auto-archive: Archive emails after reply\n• Signature: Add email signature to outgoing messages\n\nTroubleshooting:\n• Authentication errors → Check username/password\n• Connection timeouts → Verify IMAP/SMTP server and port\n• Gmail blocking → Enable 'Less secure app access' or use OAuth2\n• Missing emails → Check folder selection and sync history"
        }
      ]
    },
    {
      icon: Phone,
      title: "Configuring SMS via Twilio",
      description: "Set up SMS messaging through Twilio integration for customer communication",
      category: "Channel Setup",
      readTime: "6 min",
      content: [
        {
          heading: "Why Twilio?",
          text: "À La Carte Chat uses Twilio for SMS because:\n• Global coverage in 180+ countries\n• Competitive pricing (pay only for usage)\n• High deliverability rates\n• Support for long codes and short codes\n• Programmable messaging API"
        },
        {
          heading: "Prerequisites",
          text: "You'll need:\n• A Twilio account (sign up at twilio.com)\n• A verified phone number for testing (free tier)\n• A paid Twilio phone number for production (costs ~$1-2/month)\n• Account balance or payment method added to Twilio"
        },
        {
          heading: "Step 1: Get Twilio Credentials",
          text: "1. Log in to Twilio Console (console.twilio.com)\n2. From the dashboard, locate:\n   - Account SID (starts with 'AC...')\n   - Auth Token (click 'Show' to reveal)\n3. Copy both values—you'll need them next"
        },
        {
          heading: "Step 2: Purchase a Twilio Phone Number",
          text: "1. In Twilio Console, go to 'Phone Numbers' → 'Buy a Number'\n2. Select your country\n3. Choose capabilities: SMS (required), Voice (optional)\n4. Search and purchase a number\n5. Copy your new Twilio number"
        },
        {
          heading: "Step 3: Connect Twilio to À La Carte Chat",
          text: "1. Log in to À La Carte Chat\n2. Go to Settings → Channels → SMS\n3. Click 'Connect Twilio Account'\n4. Enter your credentials:\n   - Account SID\n   - Auth Token\n   - Twilio Phone Number\n5. Click 'Verify & Connect'\n6. Test by sending a message"
        },
        {
          heading: "Step 4: Configure Webhooks",
          text: "1. In Twilio Console, go to your phone number settings\n2. Under 'Messaging', find 'A MESSAGE COMES IN'\n3. Set the webhook URL (provided in À La Carte Chat):\n   - Webhook URL: (copy from Settings → SMS)\n   - HTTP Method: POST\n4. Save configuration\n5. Send a test SMS to your Twilio number\n6. Verify it appears in À La Carte Chat inbox"
        },
        {
          heading: "SMS Pricing & Best Practices",
          text: "Pricing (varies by country):\n• US/Canada: ~$0.0075 per SMS\n• UK: ~$0.04 per SMS\n• Check Twilio pricing page for your country\n\nBest Practices:\n• Keep messages under 160 characters to avoid multi-part charges\n• Use templates for common responses\n• Monitor usage in À La Carte Chat dashboard\n• Enable auto-topup in Twilio to avoid service interruption\n• Respect opt-out requests (STOP, UNSUBSCRIBE)"
        },
        {
          heading: "Troubleshooting",
          text: "Common issues:\n• Messages not arriving → Check webhook configuration\n• 'Unverified number' error → Add recipient to verified numbers (free trial)\n• High costs → Review message length (multi-part messages cost more)\n• Delivery failures → Some carriers block marketing messages\n• Rate limits → Twilio has sending limits; contact support to increase"
        }
      ]
    },
    {
      icon: Facebook,
      title: "Setting Up Facebook Messenger",
      description: "Connect your Facebook Page to manage Messenger conversations in one inbox",
      category: "Channel Setup",
      readTime: "7 min",
      content: [
        {
          heading: "Prerequisites",
          text: "Before you begin:\n• A Facebook Page (not a personal profile)\n• Admin access to the Facebook Page\n• Facebook Business Manager account (recommended)\n• Page must be published and public"
        },
        {
          heading: "Step 1: Prepare Your Facebook Page",
          text: "1. Go to your Facebook Page\n2. Navigate to Settings → Messaging\n3. Enable these features:\n   - 'Allow people to contact my Page privately'\n   - 'Response Assistant' (optional for auto-replies)\n4. Note your Page ID (found in 'About' section)"
        },
        {
          heading: "Step 2: Connect to À La Carte Chat",
          text: "1. Log in to À La Carte Chat\n2. Go to Settings → Channels → Facebook\n3. Click 'Connect Facebook Page'\n4. Authorize À La Carte Chat:\n   - Click 'Continue as [Your Name]'\n   - Select the Page you want to connect\n   - Grant the following permissions:\n     • manage_pages\n     • pages_messaging\n     • pages_show_list\n5. Click 'Continue'"
        },
        {
          heading: "Step 3: Configure Webhook",
          text: "1. The webhook is configured automatically\n2. Verify the connection:\n   - Send a test message to your Facebook Page\n   - Check if it appears in À La Carte Chat inbox within seconds\n3. If messages don't appear:\n   - Go to Settings → Facebook → Re-authorize\n   - Check webhook subscription in Facebook Business Manager"
        },
        {
          heading: "Managing Multiple Pages",
          text: "You can connect multiple Facebook Pages:\n1. Go to Settings → Channels → Facebook\n2. Click 'Add Another Page'\n3. Follow the same authorization process\n4. Each page's messages appear as separate conversations\n5. Filter by page in the conversation list"
        },
        {
          heading: "Facebook Messenger Features",
          text: "What works:\n• Send and receive text messages\n• Images, videos, and file attachments\n• Reactions and stickers\n• Quick replies and buttons\n• Auto-replies and templates\n\nLimitations:\n• Stories replies (supported but limited)\n• Live video comments (not supported)\n• Some advanced messenger features may require direct Facebook access"
        },
        {
          heading: "Best Practices",
          text: "• Respond within 24 hours to avoid 'Away' status\n• Use Page templates for common questions\n• Tag conversations for easy filtering\n• Set up auto-replies for after-hours\n• Train your AI Assistant on Facebook FAQs\n• Monitor response time metrics"
        },
        {
          heading: "Troubleshooting",
          text: "Common issues:\n• Not receiving messages → Check webhook in Facebook Business Manager\n• Can't send messages → Verify Page permissions and token\n• Missing older messages → Messenger only syncs new messages after connection\n• Multiple admins → All admins can see conversations in À La Carte Chat\n• Token expired → Re-authorize your Page in Settings"
        }
      ]
    },
    {
      icon: Instagram,
      title: "Integrating Instagram Direct Messages",
      description: "Manage Instagram DMs alongside your other channels in one unified inbox",
      category: "Channel Setup",
      readTime: "7 min",
      content: [
        {
          heading: "Prerequisites",
          text: "Requirements:\n• Instagram Business or Creator account (not personal)\n• Facebook Page connected to your Instagram account\n• Admin access to both Instagram and connected Facebook Page\n• Instagram account must be public"
        },
        {
          heading: "Step 1: Convert to Business Account",
          text: "If you haven't already:\n1. Open Instagram app\n2. Go to Settings → Account\n3. Select 'Switch to Professional Account'\n4. Choose 'Business' (or Creator)\n5. Connect to your Facebook Page\n6. Complete the setup"
        },
        {
          heading: "Step 2: Connect Instagram to Facebook Page",
          text: "1. In Instagram app: Settings → Account → Linked Accounts\n2. Select Facebook\n3. Log in and link your Facebook Page\n4. Verify the connection in Facebook Page Settings → Instagram\n5. You should see your Instagram handle listed"
        },
        {
          heading: "Step 3: Enable Messaging in Instagram",
          text: "1. In Instagram app, go to Settings → Privacy → Messages\n2. Ensure 'Allow Message Requests' is enabled\n3. Set up message filters if desired\n4. Go to Settings → Business → Message Controls\n5. Enable 'Allow access to messages'"
        },
        {
          heading: "Step 4: Connect to À La Carte Chat",
          text: "1. Log in to À La Carte Chat\n2. Go to Settings → Channels → Instagram\n3. Click 'Connect Instagram Account'\n4. Authorize with Facebook (Instagram uses Facebook's API)\n5. Select your Instagram Business account\n6. Grant these permissions:\n   - instagram_basic\n   - instagram_manage_messages\n   - pages_show_list\n   - pages_manage_metadata\n7. Click 'Authorize'"
        },
        {
          heading: "Step 5: Test Your Connection",
          text: "1. Send a DM to your Instagram account from another account\n2. The message should appear in À La Carte Chat within seconds\n3. Reply from the platform\n4. Verify the recipient receives your message on Instagram\n5. Test with media (images, videos)"
        },
        {
          heading: "Instagram DM Features",
          text: "Supported features:\n• Send and receive text messages\n• Image and video attachments\n• Voice messages\n• Story replies (appear as DMs)\n• Quick replies\n• Message reactions\n• Mentioned in stories/posts (appears as conversation)\n\nLimitations:\n• Can't send disappearing photos/videos\n• Live video comments not supported\n• Some features require Instagram app"
        },
        {
          heading: "Best Practices for Instagram",
          text: "• Respond to DMs within 24 hours (Instagram tracks this)\n• Use story stickers to encourage DMs\n• Set up auto-replies for common questions\n• Tag conversations by topic (support, sales, collaboration)\n• Monitor both comments and DMs\n• Use Instagram templates for consistency\n• Respect user privacy—don't over-message"
        },
        {
          heading: "Troubleshooting",
          text: "Common issues:\n• Messages not syncing → Verify Instagram is connected to Facebook Page\n• Can't send DMs → Check if recipient allows message requests\n• Missing story replies → Ensure permissions include 'instagram_manage_comments'\n• Old messages not showing → Only new messages after connection are synced\n• Access token expired → Re-authorize in Settings → Instagram\n• Rate limiting → Instagram has limits on automated messaging"
        }
      ]
    },
    {
      icon: Globe,
      title: "Adding the Website Chat Widget",
      description: "Embed our live chat widget on your website to capture visitor inquiries",
      category: "Website Integration",
      readTime: "5 min",
      content: [
        {
          heading: "What is the Website Widget?",
          text: "Our embeddable chat widget allows website visitors to:\n• Start conversations directly from your website\n• Get instant responses from your team or AI\n• Continue conversations on WhatsApp or email\n• Receive 24/7 support even when you're offline"
        },
        {
          heading: "Step 1: Customize Your Widget",
          text: "1. Go to Settings → Website Widget\n2. Customize appearance:\n   - Brand colors\n   - Logo/avatar\n   - Welcome message\n   - Position (bottom-right, bottom-left)\n   - Online/offline messages\n3. Configure behavior:\n   - Auto-open after X seconds\n   - Show unread badge\n   - Collect visitor info (name, email)\n   - Enable/disable file uploads\n4. Preview changes in real-time"
        },
        {
          heading: "Step 2: Generate Embed Code",
          text: "1. Click 'Generate Code' in the widget settings\n2. Copy the JavaScript snippet\n3. It looks like this:\n\n```html\n<script>\n(function(w,d,s,o,f,js,fjs){\nw['ALC-Widget']=o;w[o] = w[o] || function () { (w[o].q = w[o].q || []).push(arguments) };\njs = d.createElement(s), fjs = d.getElementsByTagName(s)[0];\njs.id = o; js.src = f; js.async = 1;\nfjs.parentNode.insertBefore(js, fjs);\n}(window, document, 'script', 'alc', 'https://yourdomain.lovable.app/embed-widget.js'));\nalc('init', { token: 'your-unique-token' });\n</script>\n```"
        },
        {
          heading: "Step 3: Install on Your Website",
          text: "WordPress:\n1. Go to Appearance → Theme Editor\n2. Edit footer.php (or use a custom code plugin)\n3. Paste the code before </body> tag\n4. Save changes\n\nShopify:\n1. Go to Online Store → Themes → Actions → Edit Code\n2. Open theme.liquid\n3. Paste code before </body> tag\n4. Save\n\nHTML/Custom Sites:\n1. Open your site's main template\n2. Paste code before closing </body> tag\n3. Upload and publish\n\nGoogle Tag Manager:\n1. Create new tag (Custom HTML)\n2. Paste the widget code\n3. Set trigger to 'All Pages'\n4. Publish container"
        },
        {
          heading: "Step 4: Test Your Widget",
          text: "1. Visit your website\n2. The chat widget should appear in the corner\n3. Click to open it\n4. Send a test message\n5. Check if it appears in À La Carte Chat inbox\n6. Reply from the platform\n7. Verify visitor receives the message"
        },
        {
          heading: "Advanced Widget Features",
          text: "Pre-fill visitor information:\n```javascript\nalc('identify', {\n  name: 'John Doe',\n  email: 'john@example.com',\n  customField: 'value'\n});\n```\n\nShow/hide programmatically:\n```javascript\nalc('show');  // Open widget\nalc('hide');  // Close widget\n```\n\nTrack events:\n```javascript\nalc('track', 'Purchase Completed', {\n  amount: 99.99,\n  product: 'Premium Plan'\n});\n```"
        },
        {
          heading: "Widget Settings & Options",
          text: "Available settings:\n• Enable AI auto-responses\n• Set business hours (auto-reply when offline)\n• Require email before chat (lead capture)\n• Enable file uploads\n• Show typing indicators\n• Display agent avatars and names\n• Custom CSS for advanced styling\n• Language localization"
        },
        {
          heading: "Troubleshooting",
          text: "Widget not appearing:\n• Check if code is in correct location (before </body>)\n• Verify JavaScript isn't blocked by content security policy\n• Clear browser cache\n• Check browser console for errors\n\nMessages not reaching inbox:\n• Verify widget token in Settings\n• Check if business account is active\n• Ensure webhook is configured\n\nStyling issues:\n• Widget inherits some site styles—use custom CSS\n• Check z-index conflicts with other elements\n• Test on different browsers and devices"
        }
      ]
    },
    {
      icon: Zap,
      title: "Using the API for Automation",
      description: "Integrate À La Carte Chat with your existing systems using our REST API",
      category: "Developer Tools",
      readTime: "12 min",
      content: [
        {
          heading: "API Overview",
          text: "Our REST API allows you to:\n• Programmatically send messages\n• Retrieve conversations and customer data\n• Create and manage contacts\n• Export conversation history\n• Automate workflows\n• Integrate with CRMs, helpdesks, and more\n\nAvailable on Professional and Enterprise plans."
        },
        {
          heading: "Step 1: Get Your API Key",
          text: "1. Log in to À La Carte Chat\n2. Go to Settings → API Access\n3. Click 'Generate New API Key'\n4. Name your key (e.g., 'Production Integration')\n5. Copy the key immediately—it won't be shown again\n6. Store securely (use environment variables, never commit to code)"
        },
        {
          heading: "Authentication",
          text: "All API requests require authentication via header:\n\n```bash\nAuthorization: Bearer YOUR_API_KEY\n```\n\nExample with cURL:\n```bash\ncurl -X GET https://api.alacartechat.com/v1/customers \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json'\n```"
        },
        {
          heading: "Common API Endpoints",
          text: "**Customers:**\n• GET /v1/customers - List all customers\n• POST /v1/customers - Create customer\n• GET /v1/customers/{id} - Get customer details\n• PATCH /v1/customers/{id} - Update customer\n• POST /v1/customers/bulk - Bulk create customers\n\n**Messages:**\n• POST /v1/messages - Send a message\n• GET /v1/conversations - List conversations\n• GET /v1/conversations/{id} - Get conversation\n• GET /v1/conversations/{id}/export - Export conversation\n\n**Templates:**\n• GET /v1/templates - List templates\n\nFull documentation: https://yourdomain.com/api-docs"
        },
        {
          heading: "Example: Send a WhatsApp Message",
          text: "```bash\ncurl -X POST https://api.alacartechat.com/v1/messages \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    \"channel\": \"whatsapp\",\n    \"customer\": {\n      \"phone\": \"+1234567890\",\n      \"name\": \"John Doe\",\n      \"email\": \"john@example.com\"\n    },\n    \"message\": \"Hello! Your order #12345 has shipped.\",\n    \"template_id\": null\n  }'\n```\n\nResponse:\n```json\n{\n  \"success\": true,\n  \"message_id\": \"msg_123abc\",\n  \"customer_id\": \"cust_456def\",\n  \"conversation_id\": \"conv_789ghi\"\n}\n```"
        },
        {
          heading: "Example: Bulk Import Customers",
          text: "```bash\ncurl -X POST https://api.alacartechat.com/v1/customers/bulk \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    \"customers\": [\n      {\n        \"name\": \"Alice Smith\",\n        \"email\": \"alice@example.com\",\n        \"phone\": \"+1234567890\"\n      },\n      {\n        \"name\": \"Bob Jones\",\n        \"email\": \"bob@example.com\",\n        \"phone\": \"+1987654321\"\n      }\n    ]\n  }'\n```\n\nResponse:\n```json\n{\n  \"success\": true,\n  \"created\": 2,\n  \"updated\": 0,\n  \"failed\": 0,\n  \"customers\": [...]\n}\n```"
        },
        {
          heading: "Example: Export Conversations",
          text: "```bash\ncurl -X GET 'https://api.alacartechat.com/v1/conversations/export?format=json&from_date=2025-01-01' \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  > conversations.json\n```\n\nSupported formats:\n• json - Structured JSON with all metadata\n• csv - Spreadsheet-friendly format\n\nOptional parameters:\n• from_date - Start date (YYYY-MM-DD)\n• to_date - End date (YYYY-MM-DD)\n• customer_id - Filter by customer\n• conversation_id - Single conversation"
        },
        {
          heading: "Rate Limits",
          text: "API rate limits by plan:\n\nProfessional:\n• 10,000 requests/month\n• 100 requests/minute\n\nEnterprise:\n• Unlimited requests\n• 500 requests/minute\n\nRate limit headers:\n```\nX-RateLimit-Limit: 100\nX-RateLimit-Remaining: 95\nX-RateLimit-Reset: 1609459200\n```\n\nWhen exceeded, you'll receive:\n```json\n{\n  \"error\": \"Rate limit exceeded\",\n  \"retry_after\": 45\n}\n```"
        },
        {
          heading: "Webhooks for Real-Time Updates",
          text: "Subscribe to events:\n\n1. Go to Settings → API Access → Webhooks\n2. Add your webhook URL\n3. Select events:\n   - message.received\n   - message.sent\n   - conversation.created\n   - conversation.status_changed\n4. Verify webhook with test payload\n\nExample webhook payload:\n```json\n{\n  \"event\": \"message.received\",\n  \"timestamp\": \"2025-01-20T10:30:00Z\",\n  \"data\": {\n    \"message_id\": \"msg_123\",\n    \"customer_id\": \"cust_456\",\n    \"conversation_id\": \"conv_789\",\n    \"content\": \"Hello, I need help\",\n    \"channel\": \"whatsapp\"\n  }\n}\n```"
        },
        {
          heading: "Best Practices",
          text: "• Store API keys in environment variables\n• Use separate keys for dev/staging/production\n• Implement exponential backoff for retries\n• Handle rate limits gracefully\n• Log all API requests for debugging\n• Validate webhook signatures\n• Use bulk endpoints for large datasets\n• Cache frequently accessed data\n• Monitor API usage in dashboard"
        }
      ]
    },
    {
      icon: Settings,
      title: "Platform Setup & Configuration",
      description: "Complete guide to configuring your À La Carte Chat workspace",
      category: "Getting Started",
      readTime: "10 min",
      content: [
        {
          heading: "Initial Account Setup",
          text: "After signing up:\n1. Complete your business profile (Settings → Business)\n   - Business name\n   - Logo\n   - Time zone\n   - Default language\n2. Verify your email address\n3. Choose your subscription plan\n4. Add payment method (for paid plans)"
        },
        {
          heading: "Adding Team Members",
          text: "1. Go to Settings → Team\n2. Click 'Invite Team Member'\n3. Enter email address and role:\n   - Admin (full access)\n   - Agent (conversations only)\n   - Read-Only (view only)\n4. Set permissions:\n   - Assign conversations\n   - Delete messages\n   - View analytics\n   - Manage settings\n5. Send invitation\n6. Team member receives email with setup link"
        },
        {
          heading: "Creating Conversation Statuses",
          text: "1. Go to Settings → Statuses\n2. Click 'Add Status'\n3. Define custom statuses:\n   - Name (e.g., 'New Lead', 'In Progress', 'Closed')\n   - Color (for visual distinction)\n   - Auto-actions (optional):\n     • Create task on status change\n     • Notify team member\n     • Send template message\n4. Drag to reorder\n5. Set default status for new conversations"
        },
        {
          heading: "Setting Up Templates",
          text: "1. Go to Settings → Templates\n2. Click 'New Template'\n3. Create template:\n   - Name (for internal use)\n   - Shortcut (e.g., /greeting)\n   - Message content with variables:\n     {{customer_name}}\n     {{agent_name}}\n     {{business_name}}\n4. Add attachments if needed\n5. Assign to channels\n6. Save and test\n\nUse templates in conversations:\n• Type / to see template list\n• Click template to insert\n• Variables auto-fill"
        },
        {
          heading: "Configuring AI Assistant",
          text: "1. Go to Settings → AI Assistant\n2. Upload knowledge base:\n   - FAQ documents\n   - Product catalogs\n   - Support articles\n3. Set AI behavior:\n   - Auto-respond or suggest only\n   - Approval required\n   - Response tone (professional, friendly, casual)\n4. Configure routing rules:\n   - Escalate complex questions to humans\n   - Auto-assign by topic\n5. Train on past conversations\n6. Test AI responses before enabling"
        },
        {
          heading: "Notification Settings",
          text: "Customize notifications:\n1. Go to Settings → Notifications\n2. Choose notification methods:\n   - Browser push notifications\n   - Email digests (hourly, daily)\n   - Slack/Discord webhooks\n3. Set notification rules:\n   - New message\n   - Assigned conversation\n   - Mentioned in note\n   - Task reminder\n4. Configure quiet hours\n5. Test notifications"
        },
        {
          heading: "Workspace Customization",
          text: "1. Go to Settings → Appearance\n2. Customize:\n   - Brand colors (primary, accent)\n   - Dark/light mode preference\n   - Conversation layout\n   - Sidebar position\n3. Set workspace name and logo\n4. Configure default views\n5. Save preferences"
        },
        {
          heading: "Security Settings",
          text: "1. Go to Settings → Security\n2. Enable:\n   - Two-factor authentication (2FA)\n   - IP allowlisting (Enterprise only)\n   - Session timeout\n   - Password policies\n3. Review audit logs\n4. Manage API keys\n5. Configure SSO (Enterprise only)"
        }
      ]
    },
    {
      icon: Users,
      title: "Team Collaboration Best Practices",
      description: "Learn how to effectively manage conversations with your team",
      category: "Team Management",
      readTime: "8 min",
      content: [
        {
          heading: "Assigning Conversations",
          text: "Manual assignment:\n1. Open any conversation\n2. Click 'Assign' button\n3. Select team member\n4. Add note for context (optional)\n5. Team member gets notified\n\nAuto-assignment rules:\n1. Settings → Automations\n2. Create rule:\n   - Trigger: New conversation from [channel]\n   - Condition: If [keyword] in message\n   - Action: Assign to [team member]\n3. Enable round-robin for load balancing"
        },
        {
          heading: "Using Internal Notes",
          text: "Internal notes help teams collaborate:\n1. In conversation, click 'Add Note'\n2. Type your note (customers can't see this)\n3. @mention teammates to notify them\n4. Attach files or screenshots\n5. Notes appear with timestamp and author\n\nUse cases:\n• Provide context for handoffs\n• Document customer history\n• Share solutions to complex issues\n• Track follow-up actions"
        },
        {
          heading: "Collision Detection",
          text: "Prevents duplicate replies:\n• When someone views a conversation, others see a banner\n• Shows who's currently typing\n• Warns before sending if someone else just replied\n• Reduces confusion and improves customer experience"
        },
        {
          heading: "Creating Tasks from Conversations",
          text: "Never lose track of follow-ups:\n1. In conversation, click 'Create Task'\n2. Set:\n   - Task title\n   - Due date\n   - Assignee\n   - Priority\n3. Task links to conversation\n4. Get reminders before due date\n5. Mark complete when done\n\nTasks appear in:\n• Tasks panel (sidebar)\n• Calendar view\n• Team member's task list"
        },
        {
          heading: "Performance Metrics",
          text: "Track team performance:\n1. Go to Analytics → Team\n2. View metrics:\n   - Average response time\n   - Conversations handled\n   - Customer satisfaction\n   - Resolution rate\n3. Compare team members\n4. Identify training needs\n5. Celebrate top performers"
        },
        {
          heading: "Shared Templates & Responses",
          text: "Keep responses consistent:\n1. Create team templates (Settings → Templates)\n2. Mark as 'Team Shared'\n3. All team members can use them\n4. Update centrally—changes reflect for everyone\n5. Track template usage in analytics"
        },
        {
          heading: "Conversation Handoffs",
          text: "Smooth handoffs between team members:\n1. Before reassigning, add an internal note with:\n   - Customer context\n   - Issue summary\n   - Actions taken\n   - Next steps\n2. Assign to team member\n3. Add customer-facing note if needed:\n   'I'm transferring you to our specialist'\n4. New assignee gets full context"
        },
        {
          heading: "Team Communication Tips",
          text: "Best practices:\n• Use @mentions in notes to notify specific people\n• Tag conversations by topic for easy filtering\n• Set status when stepping away\n• Hold daily standups to review open conversations\n• Create playbooks for common scenarios\n• Document solutions in team wiki\n• Review analytics weekly as a team"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <nav className="max-w-[1200px] mx-auto px-5 py-4 flex items-center gap-7">
          <div className="font-extrabold tracking-tight text-foreground cursor-pointer" onClick={() => navigate("/")}>
            À La Carte Chat
          </div>
          <a href="/#features" className="text-foreground hover:opacity-70 transition-opacity">Features</a>
          <a href="/#pricing" className="text-foreground hover:opacity-70 transition-opacity">Pricing</a>
          <a href="/faq" className="text-foreground hover:opacity-70 transition-opacity">FAQ</a>
          <a href="/guides" className="text-foreground hover:opacity-70 transition-opacity">Guides</a>
          <div className="flex-1" />
          <Button onClick={() => navigate(user ? "/dashboard" : "/auth")} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6">
            {user ? "Dashboard" : "Login"}
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6 text-center bg-gradient-to-b from-background to-card">
        <div className="max-w-[1200px] mx-auto">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-foreground">
            How-To Guides
          </h1>
          <p className="text-xl text-muted-foreground max-w-[700px] mx-auto">
            Step-by-step tutorials to help you get the most out of À La Carte Chat
          </p>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="py-12 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {guides.map((guide, idx) => (
              <Card key={idx} className="p-6 hover:shadow-xl transition-all cursor-pointer" onClick={() => {
                const element = document.getElementById(`guide-${idx}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <guide.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">{guide.category}</div>
                    <h3 className="font-bold text-lg mb-2">{guide.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{guide.description}</p>
                    <div className="text-xs text-primary font-medium">{guide.readTime} read →</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Full Guide Content */}
          {guides.map((guide, idx) => (
            <div key={idx} id={`guide-${idx}`} className="mb-20 scroll-mt-24">
              <div className="bg-card rounded-xl p-8 md:p-12 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary/10 p-4 rounded-xl">
                    <guide.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">{guide.category} • {guide.readTime}</div>
                    <h2 className="text-3xl font-bold text-foreground">{guide.title}</h2>
                  </div>
                </div>
                <p className="text-lg text-muted-foreground mb-8">{guide.description}</p>
                
                {guide.content.map((section, sIdx) => (
                  <div key={sIdx} className="mb-8">
                    <h3 className="text-2xl font-bold mb-4 text-foreground">{section.heading}</h3>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-card-foreground whitespace-pre-line">{section.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-card text-center">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-foreground">Ready to Get Started?</h2>
          <p className="text-lg mb-8 text-muted-foreground">
            Follow these guides and have your unified inbox up and running in minutes
          </p>
          <Button onClick={() => navigate("/signup")} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 py-6 text-lg">
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-11 px-6 text-center border-t">
        <p className="text-muted-foreground mb-2">© 2025 À La Carte Chat — All rights reserved.</p>
        <p className="text-sm text-muted-foreground">À La Carte Chat is a product of À La Carte SaaS</p>
      </footer>
    </div>
  );
};

export default Guides;
