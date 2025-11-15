import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import DOMPurify from "dompurify";

interface EmailMessageRendererProps {
  content: string;
  subject?: string;
}

const SIGNATURE_PATTERNS = [
  /^--\s*$/m,
  /^Sent from my (iPhone|iPad|Android|Mobile|Blackberry|Windows Phone)/i,
  /^Get Outlook for (iOS|Android)/i,
  /^Sent via /i,
  /^Best regards,?\s*$/im,
  /^Kind regards,?\s*$/im,
  /^Warm regards,?\s*$/im,
  /^Thanks,?\s*$/im,
  /^Thank you,?\s*$/im,
  /^Many thanks,?\s*$/im,
  /^Sincerely,?\s*$/im,
  /^Regards,?\s*$/im,
  /^Best,?\s*$/im,
  /^Cheers,?\s*$/im,
  /^Respectfully,?\s*$/im,
  /^Yours truly,?\s*$/im,
  /^\[cid:/im, // Inline images in signatures
];

const QUOTE_PATTERNS = [
  /^On .+ wrote:$/im,
  /^On .+, .+ <.+> wrote:$/im,
  /^From:.+$/im,
  /^Sent:.+$/im,
  /^To:.+$/im,
  /^Subject:.+$/im,
  /^Date:.+$/im,
  /^-{3,}\s*Original Message\s*-{3,}/i,
  /^-{3,}\s*Forwarded message\s*-{3,}/i,
  /^_{3,}/m,
  /^>{1,}/m, // Quoted lines starting with >
  /^&gt;/im, // HTML encoded quotes
];

export const EmailMessageRenderer = ({ content, subject, compact = false }: EmailMessageRendererProps & { compact?: boolean }) => {
  const [showSignature, setShowSignature] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);

  const parseEmailContent = (text: string) => {
    // Check if content is HTML
    const isHtml = /<[^>]+>/.test(text);
    
    let mainContent = text;
    let signature = "";
    let quotedText = "";

    if (isHtml) {
      // Parse HTML content with sanitization
      const sanitizedHtml = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'a', 'blockquote', 'div', 'span', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
        ALLOWED_ATTR: ['href', 'class', 'id', 'style'],
        ALLOW_DATA_ATTR: false
      });
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizedHtml;
      
      // Remove script and style tags (additional safety layer)
      tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
      
      // Find and extract signature blocks (common in HTML emails)
      const signatureElements = tempDiv.querySelectorAll('[class*="signature"], [id*="signature"], [class*="gmail_signature"]');
      if (signatureElements.length > 0) {
        signature = Array.from(signatureElements).map(el => el.textContent || '').join('\n');
        signatureElements.forEach(el => el.remove());
      }
      
      // Find and extract quoted text blocks
      const quoteElements = tempDiv.querySelectorAll('blockquote, [class*="quoted"], [class*="gmail_quote"]');
      if (quoteElements.length > 0) {
        quotedText = Array.from(quoteElements).map(el => el.textContent || '').join('\n');
        quoteElements.forEach(el => el.remove());
      }
      
      mainContent = tempDiv.innerHTML;
      
      // If no HTML-based detection worked, fall back to text-based detection
      if (!signature && !quotedText) {
        const textContent = tempDiv.textContent || '';
        const result = parseTextContent(textContent);
        mainContent = result.mainContent;
        signature = result.signature;
        quotedText = result.quotedText;
      }
    } else {
      // Parse plain text content
      const result = parseTextContent(text);
      mainContent = result.mainContent;
      signature = result.signature;
      quotedText = result.quotedText;
    }

    return { mainContent: mainContent.trim(), signature: signature.trim(), quotedText: quotedText.trim(), isHtml };
  };

  const parseTextContent = (text: string) => {
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

  const { mainContent, signature, quotedText, isHtml } = parseEmailContent(content);

  // Compact mode: show first 2-3 lines only
  const getCompactContent = (content: string) => {
    if (isHtml) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const text = tempDiv.textContent || '';
      const lines = text.split('\n').filter(line => line.trim());
      return lines.slice(0, 2).join(' ').substring(0, 150) + (lines.length > 2 ? '...' : '');
    } else {
      const lines = content.split('\n').filter(line => line.trim());
      return lines.slice(0, 2).join(' ').substring(0, 150) + (lines.length > 2 ? '...' : '');
    }
  };

  return (
    <div className="space-y-2">
      {subject && (
        <div className="font-semibold text-sm mb-2 pb-2 border-b border-current/20">
          {subject}
        </div>
      )}
      
      {/* Main message content */}
      {compact ? (
        <div className="text-sm opacity-90">
          {getCompactContent(mainContent)}
        </div>
      ) : isHtml ? (
        <div 
          className="email-content leading-relaxed prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: mainContent }}
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        />
      ) : (
        <div className="whitespace-pre-wrap leading-relaxed">
          {mainContent}
        </div>
      )}

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
            isHtml ? (
              <div 
                className="text-xs opacity-60 mt-2 prose prose-xs max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: signature }}
              />
            ) : (
              <div className="text-xs opacity-60 mt-2 whitespace-pre-wrap">
                {signature}
              </div>
            )
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
            isHtml ? (
              <div 
                className="text-xs opacity-60 mt-2 prose prose-xs max-w-none dark:prose-invert border-l-2 border-current/20 pl-3"
                dangerouslySetInnerHTML={{ __html: quotedText }}
              />
            ) : (
              <div className="text-xs opacity-60 mt-2 whitespace-pre-wrap border-l-2 border-current/20 pl-3">
                {quotedText}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
