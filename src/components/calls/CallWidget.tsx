import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, PhoneForwarded, Grid3x3, PhoneCall, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AudioDeviceSettings } from './AudioDeviceSettings';
import { toE164, toDisplay } from '@/lib/phoneUtils';

interface CallWidgetProps {
  onClose?: () => void;
  mode?: 'idle' | 'incoming' | 'outgoing';
  customerInfo?: {
    name: string;
    phone: string;
    customerId?: string;
  };
}

export const CallWidget = ({ onClose, mode = 'idle', customerInfo }: CallWidgetProps) => {
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connected' | 'on-hold' | 'dialing'>(
    mode === 'outgoing' ? 'dialing' : 'idle'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callerInfo, setCallerInfo] = useState<{ name?: string; number: string } | null>(
    customerInfo ? { name: customerInfo.name, number: customerInfo.phone } : null
  );
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [device, setDevice] = useState<any>(null);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const timerRef = useRef<number>();
  const ringOutTimerRef = useRef<number>();

  const addLogEvent = (event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [...prev, `[${timestamp}] ${event}`]);
  };

  const RING_OUT_MS = 25000; // 25 seconds ring-out timeout

  useEffect(() => {
    initializeTwilioDevice();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ringOutTimerRef.current) clearTimeout(ringOutTimerRef.current);
      if (device) device.destroy();
    };
  }, [mode, customerInfo]);

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

      const { data, error } = await supabase.functions.invoke('call-generate-token', { body: { type: 'access' } });
      
      if (error || !data.token) {
        toast.error('Call system not configured yet');
        return;
      }

      // Load Twilio Device SDK dynamically
      const script = document.createElement('script');
      script.src = 'https://sdk.twilio.com/js/voice/releases/2.0.0/twilio-voice.min.js';
      script.onload = () => {
        const Device = (window as any).Twilio.Device;
        const newDevice = new Device(data.token, {
          codecPreferences: ['opus', 'pcmu'],
          enableRingingState: true,
          closeProtection: true
        });

        // Voice SDK v2 requires explicit registration
        try { newDevice.register(); } catch (_) {}

        newDevice.on('registered', () => {
          console.log('Twilio device registered');
          addLogEvent('Device registered');
        });

        newDevice.on('ready', () => {
          console.log('Twilio device ready');
          addLogEvent('Device ready');
          // If mode is outgoing, initiate the call
          if (mode === 'outgoing' && customerInfo?.phone) {
            handleDial(customerInfo.phone);
          }
          toast.success('Call system ready');
        });

        newDevice.on('error', (error: any) => {
          console.error('Twilio device error:', error);
          addLogEvent(`Device error: ${error.message || 'Unknown error'}`);
          toast.error(`Call system error: ${error.message || 'Unknown error'}`);
        });

        newDevice.on('incoming', async (conn: any) => {
          setActiveConnection(conn);
          setCallStatus('ringing');
          
          const callerNumber = conn.parameters.From;
          addLogEvent(`Incoming call from: ${callerNumber}`);
          
          // Look up customer info
          const { data: lookupData } = await supabase.functions.invoke(
            'call-incoming-lookup',
            { body: { phoneNumber: callerNumber } }
          );
          
          if (lookupData?.found && lookupData.customer) {
            setCallerInfo({
              name: lookupData.customer.name,
              number: callerNumber
            });
          } else {
            setCallerInfo({ number: callerNumber });
          }
          
          toast('Incoming call', {
            description: lookupData?.customer?.name || callerNumber,
            action: {
              label: 'Answer',
              onClick: () => handleAnswer(conn)
            }
          });
        });

        newDevice.on('disconnect', () => {
          addLogEvent('Device disconnected');
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
      addLogEvent('Call answered');
      // Clear ring-out timer if it's running
      if (ringOutTimerRef.current) {
        clearTimeout(ringOutTimerRef.current);
        ringOutTimerRef.current = undefined;
      }
      
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
      // Convert to E.164 format for Twilio
      const e164Number = toE164(number);
      console.log('Dialing:', { original: number, e164: e164Number });
      addLogEvent(`Dialing: ${e164Number}`);
      
      const connection = device.connect({ To: e164Number });
      setActiveConnection(connection);
      setCallStatus('ringing');
      setCallerInfo({ number: toDisplay(number) });
      
      // Start ring-out timer
      ringOutTimerRef.current = window.setTimeout(() => {
        if (callStatus === 'ringing') {
          console.log('Ring-out timeout reached, ending call');
          addLogEvent('Ring timeout - call not answered');
          const conn = activeConnection || device?.activeConnection();
          if (conn) {
            conn.disconnect();
          }
          setCallStatus('idle');
          setActiveConnection(null);
          setCallerInfo(null);
          toast.error('No answer - call timed out');
        }
      }, RING_OUT_MS);
      
      connection.on('accept', () => {
        addLogEvent('Call connected');
        // Clear ring-out timer when call is accepted
        if (ringOutTimerRef.current) {
          clearTimeout(ringOutTimerRef.current);
          ringOutTimerRef.current = undefined;
        }
        setCallStatus('connected');
        startTimer();
        toast.success('Call connected');
      });

      connection.on('disconnect', () => {
        addLogEvent('Call ended');
        // Clear ring-out timer on disconnect
        if (ringOutTimerRef.current) {
          clearTimeout(ringOutTimerRef.current);
          ringOutTimerRef.current = undefined;
        }
        handleEndCall();
      });

      connection.on('error', (error: any) => {
        console.error('Connection error:', error);
        addLogEvent(`Connection error: ${error.message}`);
        // Clear ring-out timer on error
        if (ringOutTimerRef.current) {
          clearTimeout(ringOutTimerRef.current);
          ringOutTimerRef.current = undefined;
        }
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
    
    // Clear all timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (ringOutTimerRef.current) {
      clearTimeout(ringOutTimerRef.current);
      ringOutTimerRef.current = undefined;
    }
    
    setActiveConnection(null);
    setCallStatus('idle');
    setCallerInfo(null);
    setDuration(0);
    setIsMuted(false);
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

  if (callStatus === 'idle' && mode === 'idle') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-2">
      <div className="space-y-4">
        {/* Header with status and close button */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              callStatus === 'connected' ? 'bg-green-500' : 
              callStatus === 'ringing' || callStatus === 'dialing' ? 'bg-yellow-500 animate-pulse' : 
              callStatus === 'on-hold' ? 'bg-orange-500' :
              'bg-gray-500'
            }`} />
            <div>
              <span className="text-sm font-semibold capitalize block">
                {callStatus === 'dialing' ? 'Calling...' : 
                 callStatus === 'ringing' ? 'Ringing...' :
                 callStatus === 'connected' ? 'In Call' :
                 callStatus === 'on-hold' ? 'On Hold' : 
                 'Idle'}
              </span>
              {callStatus === 'connected' && (
                <span className="text-xs text-muted-foreground font-mono">{formatDuration(duration)}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'on-hold') {
                if (confirm('Are you sure you want to end this call?')) {
                  handleEndCall();
                  onClose?.();
                }
              } else {
                onClose?.();
              }
            }}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Caller info */}
        {callerInfo && (
          <div className="text-center py-3 px-4">
            <p className="text-lg font-semibold">{callerInfo.name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{callerInfo.number}</p>
          </div>
        )}

        {/* Event Log */}
        {eventLog.length > 0 && (
          <div className="mx-4 mb-2 p-2 bg-muted/50 rounded-md max-h-24 overflow-y-auto">
            <p className="text-xs font-medium mb-1">Call Events:</p>
            {eventLog.slice(-5).map((log, idx) => (
              <p key={idx} className="text-xs text-muted-foreground font-mono">
                {log}
              </p>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 justify-center px-4 pb-4">
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
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground px-4 pb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording
          </div>
        )}
      </div>
    </Card>
  );
};
