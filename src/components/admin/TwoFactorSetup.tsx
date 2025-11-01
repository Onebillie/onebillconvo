import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export const TwoFactorSetup = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<{
    qrCodeUrl: string;
    backupCodes: string[];
    qrCodeImage?: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('2fa-setup');

      if (error) throw error;

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(data.qrCodeUrl);

      setSetupData({
        qrCodeUrl: data.qrCodeUrl,
        backupCodes: data.backupCodes,
        qrCodeImage,
      });

      toast.success('2FA setup initiated. Scan the QR code with your authenticator app.');
    } catch (error: any) {
      console.error('Error setting up 2FA:', error);
      toast.error(error.message || 'Failed to set up 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('2fa-verify', {
        body: { code: verificationCode, userId: user.id, action: 'enable' },
      });

      if (error) throw error;

      if (data.verified) {
        setIsEnabled(true);
        toast.success('2FA enabled successfully!');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast.error(error.message || 'Failed to verify 2FA code');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('2fa-disable');

      if (error) throw error;

      setIsEnabled(false);
      setSetupData(null);
      setVerificationCode('');
      toast.success('2FA disabled');
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      toast.success('Backup codes copied to clipboard');
    }
  };

  if (isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>2FA is currently enabled for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your account is protected with two-factor authentication.
            </AlertDescription>
          </Alert>
          <Button variant="destructive" onClick={handleDisable} disabled={loading}>
            Disable 2FA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your superadmin account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setupData ? (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                2FA is not enabled. We strongly recommend enabling it for superadmin accounts.
              </AlertDescription>
            </Alert>
            <Button onClick={handleSetup} disabled={loading}>
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {setupData.qrCodeImage && (
                  <div className="flex justify-center p-4 bg-card rounded-lg">
                    <img src={setupData.qrCodeImage} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Step 2: Save Backup Codes</h3>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Save these backup codes in a secure location. You can use them to access your
                    account if you lose your authenticator device.
                  </AlertDescription>
                </Alert>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
                  {setupData.backupCodes.map((code, i) => (
                    <div key={i}>{code}</div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBackupCodes}
                  className="mt-2"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Backup Codes
                </Button>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Step 3: Verify</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the 6-digit code from your authenticator app to enable 2FA
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <Button
                    onClick={handleVerify}
                    disabled={verifying || verificationCode.length !== 6}
                    className="mt-auto"
                  >
                    {verifying ? 'Verifying...' : 'Verify & Enable'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
