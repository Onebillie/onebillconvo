import { Phone, PhoneOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  onAnswer: () => void;
  onReject: () => void;
}

export const IncomingCallDialog = ({
  open,
  callerName,
  callerAvatar,
  onAnswer,
  onReject,
}: IncomingCallDialogProps) => {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Incoming Call</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={callerAvatar} alt={callerName} />
            <AvatarFallback className="text-2xl">
              {callerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-xl font-semibold">{callerName}</h3>
            <p className="text-sm text-muted-foreground mt-1">is calling...</p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              variant="default"
              size="lg"
              className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700"
              onClick={onAnswer}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
