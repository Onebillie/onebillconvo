import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { getDisplayedContent, getDisplayedContentSync } from "@/lib/messageContentHelpers";

interface MessageContentProps {
  message: {
    id: string;
    content?: string;
    template_content?: string;
    template_name?: string;
    template_variables?: any;
    metadata?: any;
  };
  searchTerm: string;
  highlightText: (text: string) => string;
}

export const MessageContent = ({ message, searchTerm, highlightText }: MessageContentProps) => {
  const [displayContent, setDisplayContent] = useState<string>(() => {
    // Immediate sync display
    return getDisplayedContentSync(message);
  });

  useEffect(() => {
    // Async reconstruction if needed
    const loadContent = async () => {
      // Only reconstruct if we're showing a placeholder
      if (displayContent.startsWith('Template:') || displayContent === '[No content]') {
        if (message.template_name) {
          const reconstructed = await getDisplayedContent(message);
          setDisplayContent(reconstructed);
        }
      }
    };

    loadContent();
  }, [message.id, message.template_name, displayContent]);

  const processedContent = searchTerm 
    ? highlightText(displayContent) 
    : displayContent;

  return (
    <p 
      className="text-sm whitespace-pre-wrap leading-relaxed [word-break:break-word] mb-1"
      dangerouslySetInnerHTML={{ 
        __html: DOMPurify.sanitize(
          processedContent,
          { ALLOWED_TAGS: ['mark', 'br'], ALLOWED_ATTR: ['class'] }
        ) 
      }}
    />
  );
};
