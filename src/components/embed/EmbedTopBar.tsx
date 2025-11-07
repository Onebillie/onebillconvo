import { Button } from "@/components/ui/button";
import { Bot, RefreshCw } from "lucide-react";
import { useState } from "react";

interface EmbedTopBarProps {
  onToggleAI: (enabled: boolean) => void;
  onSyncEmails: () => void;
}

export const EmbedTopBar = ({ onToggleAI, onSyncEmails }: EmbedTopBarProps) => {
  const [aiEnabled, setAiEnabled] = useState(false);

  const handleToggleAI = () => {
    const newState = !aiEnabled;
    setAiEnabled(newState);
    onToggleAI(newState);
  };

  return (
    <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
      <h1 className="text-lg font-semibold">Inbox</h1>
      
      <div className="flex items-center gap-2">
        <Button
          variant={aiEnabled ? "default" : "outline"}
          size="sm"
          onClick={handleToggleAI}
        >
          <Bot className="h-4 w-4 mr-2" />
          {aiEnabled ? "AI On" : "AI Off"}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncEmails}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Emails
        </Button>
      </div>
    </div>
  );
};
