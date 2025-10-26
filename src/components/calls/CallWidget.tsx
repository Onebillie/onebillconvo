import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, PhoneForwarded, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AudioDeviceSettings } from './AudioDeviceSettings';

interface CallWidgetProps {
  onClose?: () => void;
}

export const CallWidget = ({ onClose }: CallWidgetProps) => {
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connected' | 'on-hold'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callerInfo, setCallerInfo] = useState<{ name?: string; number: string } | null>(null);
  const [device, setDevice] = useState<any>(null);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const timerRef = useRef<number>();

  useEffect(() => {
    initializeTwilioDevice();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (device) device.destroy();
    };
  }, []);

  const initializeTwilioDevice = async () => {
    try {
      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        toast.error('Microphone access required for calls. Please grant permission in your browser settings.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('call-generate-token');
      
      if (error || !data.token) {
        toast.error('Call system not configured yet');
        return;
      }

      // Load Twilio Device SDK dynamically
      const script = document.createElement('script');
      script.src = 'https://sdk.twilio.com/js/client/v1.14/twilio.min.js';
      script.onload = () => {
        const Device = (window as any).Twilio.Device;
        const newDevice = new Device(data.token, {
          codecPreferences: ['opus', 'pcmu'],
          enableRingingState: true,
          closeProtection: true
        });

        newDevice.on('ready', () => {
          console.log('Twilio device ready');
          toast.success('Call system ready');
        });

        newDevice.on('error', (error: any) => {
          console.error('Twilio device error:', error);
          toast.error(`Call system error: ${error.message || 'Unknown error'}`);
        });

        newDevice.on('incoming', (conn: any) => {
          setActiveConnection(conn);
          setCallStatus('ringing');
          setCallerInfo({ number: conn.parameters.From });
          toast('Incoming call', {
            description: conn.parameters.From,
            action: {
              label: 'Answer',
              onClick: () => handleAnswer(conn)
            }
          });
        });

        newDevice.on('disconnect', () => {
          handleEndCall();
        });

        setDevice(newDevice);
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error initializing device:', error);
      toast.error('Failed to initialize call system');
    }
  };

  const handleAnswer = (conn: any) => {
    try {
      conn.accept();
      setActiveConnection(conn);
      setCallStatus('connected');
      startTimer();
      toast.success('Call connected');
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
    }
  };

  const handleDial = async (number: string) => {
    if (!device) {
      toast.error('Call system not ready');
      return;
    }

    try {
      const connection = device.connect({ To: number });
      setActiveConnection(connection);
      setCallStatus('ringing');
      setCallerInfo({ number });
      
      connection.on('accept', () => {
        setCallStatus('connected');
        startTimer();
        toast.success('Call connected');
      });

      connection.on('disconnect', () => {
        handleEndCall();
      });

      connection.on('error', (error: any) => {
        console.error('Connection error:', error);
        toast.error('Call failed');
        handleEndCall();
      });
    } catch (error) {
      console.error('Error dialing:', error);
      toast.error('Failed to place call');
    }
  };

  const handleEndCall = () => {
    try {
      if (activeConnection) {
        activeConnection.disconnect();
      } else if (device?.activeConnection()) {
        device.activeConnection().disconnect();
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
    
    setActiveConnection(null);
    setCallStatus('idle');
    setCallerInfo(null);
    setDuration(0);
    setIsMuted(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const toggleMute = () => {
    try {
      const conn = activeConnection || device?.activeConnection();
      if (conn) {
        conn.mute(!isMuted);
        setIsMuted(!isMuted);
        toast.success(isMuted ? 'Microphone unmuted' : 'Microphone muted');
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to toggle mute');
    }
  };

  const toggleHold = async () => {
    try {
      const conn = activeConnection || device?.activeConnection();
      if (!conn) return;

      if (callStatus === 'on-hold') {
        // Resume call
        const { error } = await supabase.functions.invoke('call-control', {
          body: { action: 'resume', callSid: conn.parameters.CallSid }
        });
        
        if (!error) {
          setCallStatus('connected');
          toast.success('Call resumed');
        }
      } else {
        // Hold call
        const { error } = await supabase.functions.invoke('call-control', {
          body: { action: 'hold', callSid: conn.parameters.CallSid }
        });
        
        if (!error) {
          setCallStatus('on-hold');
          toast.success('Call on hold');
        }
      }
    } catch (error) {
      console.error('Error toggling hold:', error);
      toast.error('Failed to toggle hold');
    }
  };

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'idle') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 p-4 shadow-lg z-50">
      <div className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              callStatus === 'connected' ? 'bg-green-500' : 
              callStatus === 'ringing' ? 'bg-yellow-500 animate-pulse' : 
              'bg-gray-500'
            }`} />
            <span className="text-sm font-medium capitalize">{callStatus}</span>
          </div>
          {callStatus === 'connected' && (
            <span className="text-sm font-mono">{formatDuration(duration)}</span>
          )}
        </div>

        {/* Caller info */}
        {callerInfo && (
          <div className="text-center py-2">
            <p className="text-lg font-semibold">{callerInfo.name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{callerInfo.number}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {callStatus === 'ringing' && (
            <Button
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => device?.activeConnection()?.accept()}
            >
              <Phone className="h-6 w-6" />
            </Button>
          )}

          {(callStatus === 'connected' || callStatus === 'on-hold') && (
            <>
              <Button
                variant={isMuted ? 'default' : 'outline'}
                size="icon"
                className="rounded-full"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              <Button
                variant={callStatus === 'on-hold' ? 'default' : 'outline'}
                size="icon"
                className="rounded-full"
                onClick={toggleHold}
                title={callStatus === 'on-hold' ? 'Resume' : 'Hold'}
              >
                {callStatus === 'on-hold' ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>

              <AudioDeviceSettings device={device} />

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                title="Transfer call"
              >
                <PhoneForwarded className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                title="Show dialpad"
              >
                <Grid3x3 className="h-5 w-5" />
              </Button>
            </>
          )}

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording
          </div>
        )}
      </div>
    </Card>
  );
};
