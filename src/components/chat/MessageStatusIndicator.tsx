import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';

interface MessageStatusIndicatorProps {
  status?: string;
  className?: string;
}

export const MessageStatusIndicator = ({ status, className = '' }: MessageStatusIndicatorProps) => {
  const iconClass = `w-3.5 h-3.5 ${className}`;

  switch (status) {
    case 'sending':
    case 'pending':
      return <Clock className={`${iconClass} opacity-50`} />;
    case 'sent':
      return <Check className={`${iconClass} text-muted-foreground`} />;
    case 'delivered':
      return <CheckCheck className={`${iconClass} text-muted-foreground`} />;
    case 'read':
      return <CheckCheck className={`${iconClass} text-primary`} />;
    case 'failed':
      return <XCircle className={`${iconClass} text-destructive`} />;
    default:
      return null;
  }
};
