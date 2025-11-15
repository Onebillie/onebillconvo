import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { VoicePlayer } from "./VoicePlayer";

interface CallLogMessageProps {
  call_record_id: string;
  direction: "inbound" | "outbound";
  created_at: string;
  duration_seconds?: number;
}

export const CallLogMessage = ({ 
  call_record_id, 
  direction, 
  created_at, 
  duration_seconds 
}: CallLogMessageProps) => {
  const [callDetails, setCallDetails] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCallDetails = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('call_records')
      .select('*')
      .eq('id', call_record_id)
      .single();
    
    setCallDetails(data);
    setShowDetails(true);
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
      {direction === 'inbound' ? (
        <PhoneIncoming className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
      ) : (
        <PhoneOutgoing className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {direction === 'inbound' ? 'Incoming Call' : 'Outgoing Call'}
          </span>
          {duration_seconds && duration_seconds > 0 ? (
            <Badge variant="outline" className="text-xs">
              {formatDuration(duration_seconds)}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {direction === 'inbound' ? 'Missed' : 'No Answer'}
            </Badge>
          )}
        </div>
        
        {showDetails && callDetails && (
          <div className="mt-3 space-y-3">
            {callDetails.recording_url && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Recording:</p>
                <VoicePlayer 
                  audioUrl={callDetails.recording_url}
                  duration={callDetails.duration_seconds}
                />
              </div>
            )}
            {callDetails.voicemail_url && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Voicemail:</p>
                <VoicePlayer 
                  audioUrl={callDetails.voicemail_url}
                  duration={callDetails.duration_seconds}
                />
              </div>
            )}
            {callDetails.transcript && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Transcript:</p>
                <p className="text-sm text-foreground/90 bg-background/50 p-2 rounded">
                  {callDetails.transcript}
                </p>
              </div>
            )}
            {callDetails.caller_name && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Caller:</p>
                <p className="text-sm">{callDetails.caller_name}</p>
              </div>
            )}
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-2 h-auto p-0 text-xs hover:bg-transparent"
          onClick={fetchCallDetails}
          disabled={loading}
        >
          {loading ? 'Loading...' : showDetails ? 'Hide details' : 'View details'}
        </Button>
      </div>
    </div>
  );
};
