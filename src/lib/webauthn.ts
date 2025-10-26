import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';

export async function registerBiometric(deviceName: string) {
  try {
    // Get registration options from server
    const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
      'webauthn-register-begin',
      { method: 'POST' }
    );

    if (optionsError) throw optionsError;

    // Start registration with the browser
    const credential = await startRegistration(optionsData);

    // Send credential to server for verification
    const { data: verificationData, error: verificationError } = await supabase.functions.invoke(
      'webauthn-register-complete',
      {
        method: 'POST',
        body: { credential, deviceName },
      }
    );

    if (verificationError) throw verificationError;

    return verificationData;
  } catch (error: any) {
    console.error('Error registering biometric:', error);
    throw error;
  }
}

export async function authenticateWithBiometric(email: string) {
  try {
    // Get authentication options from server
    const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
      'webauthn-authenticate-begin',
      {
        method: 'POST',
        body: { email },
      }
    );

    if (optionsError) throw optionsError;

    // Start authentication with the browser
    const credential = await startAuthentication(optionsData);

    // Send credential to server for verification
    const { data: verificationData, error: verificationError } = await supabase.functions.invoke(
      'webauthn-authenticate-complete',
      {
        method: 'POST',
        body: { credential, userId: optionsData.userId },
      }
    );

    if (verificationError) throw verificationError;

    return verificationData;
  } catch (error: any) {
    console.error('Error authenticating with biometric:', error);
    throw error;
  }
}

export async function checkBiometricSupport() {
  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'WebAuthn not supported' };
  }

  // Check for platform authenticator (TouchID, FaceID, Windows Hello)
  const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  
  return {
    supported: true,
    platformAuthenticator: available,
    conditionalMediation: await checkConditionalMediation(),
  };
}

async function checkConditionalMediation() {
  try {
    return await PublicKeyCredential.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

export async function listBiometricCredentials() {
  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function deleteBiometricCredential(credentialId: string) {
  const { error } = await supabase
    .from('webauthn_credentials')
    .delete()
    .eq('id', credentialId);

  if (error) throw error;
}
