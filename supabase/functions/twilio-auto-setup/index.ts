import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRequest {
  twilio_account_sid: string;
  twilio_auth_token: string;
  country_code?: string;
  purchase_phone?: boolean;
  area_code?: string;
}

interface SetupResponse {
  success: boolean;
  credentials?: {
    account_sid: string;
    api_key: string;
    api_secret: string;
    twiml_app_sid: string;
    phone_number?: string;
  };
  message: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get business for user
    const { data: businessUser } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!businessUser) {
      return new Response(JSON.stringify({ error: 'No business found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SetupRequest = await req.json();
    const {
      twilio_account_sid,
      twilio_auth_token,
      country_code = 'US',
      purchase_phone = false,
      area_code
    } = body;

    if (!twilio_account_sid || !twilio_auth_token) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Account SID and Auth Token are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Twilio auto-setup for business:', businessUser.business_id);

    // Step 1: Validate credentials
    console.log('Step 1: Validating Twilio credentials...');
    const validateResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}.json`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilio_account_sid}:${twilio_auth_token}`)
        }
      }
    );

    if (!validateResponse.ok) {
      const error = await validateResponse.json();
      console.error('Twilio credential validation failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✓ Credentials validated');

    // Step 2: Create TwiML Application
    console.log('Step 2: Creating TwiML Application...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const twimlFormData = new URLSearchParams();
    twimlFormData.append('FriendlyName', 'À La Carte Chat Voice');
    twimlFormData.append('VoiceUrl', `${supabaseUrl}/functions/v1/call-inbound-webhook`);
    twimlFormData.append('VoiceMethod', 'POST');
    twimlFormData.append('StatusCallback', `${supabaseUrl}/functions/v1/call-status-callback`);
    twimlFormData.append('StatusCallbackMethod', 'POST');

    const twimlResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}/Applications.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilio_account_sid}:${twilio_auth_token}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: twimlFormData
      }
    );

    if (!twimlResponse.ok) {
      const error = await twimlResponse.json();
      console.error('TwiML app creation failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to create TwiML application: ' + error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const twimlApp = await twimlResponse.json();
    console.log('✓ TwiML App created:', twimlApp.sid);

    // Step 3: Generate API Key
    console.log('Step 3: Generating API Key...');
    const keyFormData = new URLSearchParams();
    keyFormData.append('FriendlyName', 'À La Carte Chat API Key');

    const keyResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}/Keys.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilio_account_sid}:${twilio_auth_token}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: keyFormData
      }
    );

    if (!keyResponse.ok) {
      const error = await keyResponse.json();
      console.error('API key creation failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to create API key: ' + error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = await keyResponse.json();
    console.log('✓ API Key generated:', apiKey.sid);

    let phoneNumber = null;

    // Step 4: Purchase phone number (optional)
    if (purchase_phone) {
      console.log('Step 4: Purchasing phone number...');
      
      // Search for available numbers
      const searchUrl = new URL(
        `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}/AvailablePhoneNumbers/${country_code}/Local.json`
      );
      if (area_code) {
        searchUrl.searchParams.append('AreaCode', area_code);
      }
      searchUrl.searchParams.append('VoiceEnabled', 'true');
      searchUrl.searchParams.append('SmsEnabled', 'true');
      searchUrl.searchParams.append('Limit', '5');

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilio_account_sid}:${twilio_auth_token}`)
        }
      });

      if (!searchResponse.ok) {
        console.warn('Failed to search phone numbers:', await searchResponse.text());
      } else {
        const availableNumbers = await searchResponse.json();
        
        if (availableNumbers.available_phone_numbers && availableNumbers.available_phone_numbers.length > 0) {
          const selectedNumber = availableNumbers.available_phone_numbers[0].phone_number;
          
          // Purchase the number
          const purchaseFormData = new URLSearchParams();
          purchaseFormData.append('PhoneNumber', selectedNumber);
          purchaseFormData.append('FriendlyName', 'À La Carte Chat Line');
          purchaseFormData.append('VoiceApplicationSid', twimlApp.sid);
          purchaseFormData.append('SmsUrl', `${supabaseUrl}/functions/v1/sms-webhook`);
          purchaseFormData.append('SmsMethod', 'POST');

          const purchaseResponse = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}/IncomingPhoneNumbers.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${twilio_account_sid}:${twilio_auth_token}`),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: purchaseFormData
            }
          );

          if (purchaseResponse.ok) {
            const purchasedNumber = await purchaseResponse.json();
            phoneNumber = purchasedNumber.phone_number;
            console.log('✓ Phone number purchased:', phoneNumber);
          } else {
            console.warn('Failed to purchase phone number:', await purchaseResponse.text());
          }
        }
      }
    }

    // Step 5: Save to database
    console.log('Step 5: Saving configuration to database...');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey ?? ''
    );

    const { error: saveError } = await supabaseAdmin
      .from('call_settings')
      .upsert({
        business_id: businessUser.business_id,
        twilio_account_sid: twilio_account_sid,
        twilio_auth_token: twilio_auth_token,
        twilio_api_key: apiKey.sid,
        twilio_api_secret: apiKey.secret,
        twilio_twiml_app_sid: twimlApp.sid,
        recording_enabled: true,
        require_consent: true,
        transcription_enabled: true,
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        voicemail_greeting: 'Thank you for calling. Please leave a message after the beep.',
        retention_days: 90
      });

    if (saveError) {
      console.error('Failed to save settings:', saveError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to save settings to database: ' + saveError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✓ Configuration saved successfully');

    const response: SetupResponse = {
      success: true,
      credentials: {
        account_sid: twilio_account_sid,
        api_key: apiKey.sid,
        api_secret: apiKey.secret,
        twiml_app_sid: twimlApp.sid,
        phone_number: phoneNumber || undefined
      },
      message: 'Twilio setup completed successfully!'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in twilio-auto-setup:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
