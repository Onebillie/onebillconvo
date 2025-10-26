-- Create WebAuthn credentials table for biometric authentication
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_name TEXT,
  device_type TEXT, -- 'platform' (TouchID/FaceID) or 'cross-platform' (YubiKey)
  transports TEXT[], -- 'usb', 'nfc', 'ble', 'internal'
  aaguid TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own credentials"
  ON public.webauthn_credentials FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own credentials"
  ON public.webauthn_credentials FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own credentials"
  ON public.webauthn_credentials FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Superadmins can view all credentials"
  ON public.webauthn_credentials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Add trigger for updated_at
CREATE TRIGGER update_webauthn_credentials_updated_at
  BEFORE UPDATE ON public.webauthn_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();