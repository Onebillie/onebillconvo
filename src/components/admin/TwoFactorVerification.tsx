import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TwoFactorVerificationProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerification = ({ userId, onSuccess, onCancel }: TwoFactorVerificationProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    if (!code || (useBackupCode ? code.length < 6 : code.length !== 6)) {
      toast.error('Please enter a valid code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('2fa-verify', {
        body: { code, userId, action: 'login' },
      });

      if (error) throw error;

      if (data.verified) {
        toast.success('Verification successful!');
        onSuccess();
      } else {
        toast.error('Invalid code');
      }
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast.error(error.message || 'Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code) {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account is protected with two-factor authentication.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="2fa-code">
            {useBackupCode ? 'Backup Code' : 'Verification Code'}
          </Label>
          <Input
            id="2fa-code"
            type="text"
            maxLength={useBackupCode ? 10 : 6}
            placeholder={useBackupCode ? 'Enter backup code' : '000000'}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyPress={handleKeyPress}
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            disabled={loading || !code}
            className="flex-1"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>

        <Button
          variant="link"
          size="sm"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode('');
          }}
          className="w-full"
        >
          {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
        </Button>
      </CardContent>
    </Card>
  );
};
