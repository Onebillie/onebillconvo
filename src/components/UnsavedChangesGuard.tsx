import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UnsavedChangesGuardProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function UnsavedChangesGuard({ 
  hasUnsavedChanges, 
  message = 'You have unsaved changes. Are you sure you want to leave?' 
}: UnsavedChangesGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Warn on browser navigation (close tab, refresh, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  return null;
}
