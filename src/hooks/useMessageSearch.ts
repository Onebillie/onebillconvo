import { useState, useCallback, useMemo } from 'react';
import { Message } from '@/types/chat';

export const useMessageSearch = (messages: Message[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(term) ||
      msg.subject?.toLowerCase().includes(term) ||
      msg.message_attachments?.some(att => 
        att.filename.toLowerCase().includes(term)
      )
    );
  }, [messages, searchTerm]);

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goToPreviousMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setCurrentMatchIndex(0);
  }, []);

  const currentMatch = matches[currentMatchIndex] || null;

  return {
    searchTerm,
    setSearchTerm,
    matches,
    currentMatch,
    currentMatchIndex,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
  };
};