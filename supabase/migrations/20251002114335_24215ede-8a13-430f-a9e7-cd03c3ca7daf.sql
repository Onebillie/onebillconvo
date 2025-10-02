-- Add email template configuration to business_settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS email_html_template TEXT DEFAULT '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .email-header { background: #f4f4f4; padding: 20px; text-align: center; border-bottom: 3px solid #007bff; }
    .email-content { padding: 30px 20px; background: #ffffff; }
    .email-footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h2>{{company_name}}</h2>
    </div>
    <div class="email-content">
      {{content}}
    </div>
    <div class="email-footer">
      <p>{{signature}}</p>
      <p>This email was sent from {{company_name}}</p>
    </div>
  </div>
</body>
</html>';

-- Add email bundling window setting (in minutes)
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS email_bundle_window_minutes INTEGER DEFAULT 2;

COMMENT ON COLUMN business_settings.email_html_template IS 'HTML template for emails with {{content}}, {{company_name}}, and {{signature}} placeholders';
COMMENT ON COLUMN business_settings.email_bundle_window_minutes IS 'Time window in minutes to bundle multiple messages into one email';