import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface EmailMessageRendererProps {
  content: string;
  subject?: string;
}

const SIGNATURE_PATTERNS = [
  /^--\s*$/m,
  /^Sent from my (iPhone|iPad|Android|Mobile)/i,
  /^Get Outlook for (iOS|Android)/i,
  /^Best regards,?\s*$/im,
  /^Kind regards,?\s*$/im,
  /^Thanks,?\s*$/im,
  /^Thank you,?\s*$/im,
  /^Sincerely,?\s*$/im,
  /^Regards,?\s*$/im,
  /^Cheers,?\s*$/im,
];

const QUOTE_PATTERNS = [
  /^On .+ wrote:$/im,
  /^From:.+$/im,
  /^-{3,}\s*Original Message\s*-{3,}/i,
  /^_{3,}/m,
];

export const EmailMessageRenderer = ({ content, subject }: EmailMessageRendererProps) => {
  const [showSignature, setShowSignature] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);

  const parseEmailContent = (text: string) => {
    // Split content into main message, signature, and quoted sections
    let mainContent = text;
    let signature = "";
    let quotedText = "";

    // Detect signature
    const lines = text.split('\n');
    let signatureStartIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (SIGNATURE_PATTERNS.some(pattern => pattern.test(lines[i]))) {
        signatureStartIndex = i;
        break;
      }
    }

    if (signatureStartIndex > -1) {
      mainContent = lines.slice(0, signatureStartIndex).join('\n');
      signature = lines.slice(signatureStartIndex).join('\n');
    }

    // Detect quoted/reply text from mainContent
    const mainLines = mainContent.split('\n');
    let quoteStartIndex = -1;

    for (let i = 0; i < mainLines.length; i++) {
      const line = mainLines[i];
      if (QUOTE_PATTERNS.some(pattern => pattern.test(line)) || line.trim().startsWith('>')) {
        quoteStartIndex = i;
        break;
      }
    }

    if (quoteStartIndex > -1) {
      quotedText = mainLines.slice(quoteStartIndex).join('\n');
      mainContent = mainLines.slice(0, quoteStartIndex).join('\n');
    }

    return { mainContent: mainContent.trim(), signature: signature.trim(), quotedText: quotedText.trim() };
  };

  const { mainContent, signature, quotedText } = parseEmailContent(content);

  return (
    <div className="space-y-2">
      {subject && (
        <div className="font-semibold text-sm mb-2 pb-2 border-b border-current/20">
          {subject}
        </div>
      )}
      
      {/* Main message content */}
      <div className="whitespace-pre-wrap leading-relaxed">
        {mainContent}
      </div>

      {/* Collapsed signature */}
      {signature && (
        <div className="border-t border-current/10 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSignature(!showSignature)}
            className="text-xs opacity-70 hover:opacity-100 h-auto p-1"
          >
            {showSignature ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {showSignature ? "Hide signature" : "Show signature"}
          </Button>
          {showSignature && (
            <div className="text-xs opacity-60 mt-2 whitespace-pre-wrap">
              {signature}
            </div>
          )}
        </div>
      )}

      {/* Collapsed quoted/reply text */}
      {quotedText && (
        <div className="border-t border-current/10 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuoted(!showQuoted)}
            className="text-xs opacity-70 hover:opacity-100 h-auto p-1"
          >
            {showQuoted ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {showQuoted ? "Hide quoted text" : "Show quoted text"}
          </Button>
          {showQuoted && (
            <div className="text-xs opacity-60 mt-2 whitespace-pre-wrap border-l-2 border-current/20 pl-3">
              {quotedText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
