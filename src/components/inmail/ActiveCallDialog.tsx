import { useEffect, useRef, useState } from 'react';
import { Phone, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ActiveCallDialogProps {
  open: boolean;
  callerName: string;
  remoteStream: MediaStream | null;
  onEnd: () => void;
}

export const ActiveCallDialog = ({
  open,
  callerName,
  remoteStream,
  onEnd,
}: ActiveCallDialogProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (open) {
      intervalRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (remoteStream) {
      remoteStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isSpeakerOff;
    }
    setIsSpeakerOff(!isSpeakerOff);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Active Call</DialogTitle>
        </DialogHeader>

        <audio ref={audioRef} autoPlay />

        <div className="flex flex-col items-center gap-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl">
              {callerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-xl font-semibold">{callerName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDuration(duration)}
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={toggleMute}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant={isSpeakerOff ? 'destructive' : 'outline'}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={toggleSpeaker}
            >
              {isSpeakerOff ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={onEnd}
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
