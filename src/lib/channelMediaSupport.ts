/**
 * Channel-specific media type support configuration
 * Defines which file types are supported by each communication channel
 */

type MediaConfig = {
  mimeTypes: string[];
  maxSize: number;
  displayName: string;
};

export const CHANNEL_MEDIA_SUPPORT: Record<string, MediaConfig> = {
  whatsapp: {
    mimeTypes: [
      'image/jpeg',
      'image/png', 
      'image/webp',
      'application/pdf',
      'audio/ogg',
      'audio/mpeg',
      'audio/mp4',
      'video/mp4',
      'video/3gpp',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 16 * 1024 * 1024, // 16MB
    displayName: 'WhatsApp',
  },
  sms: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
    ],
    maxSize: 500 * 1024, // 500KB (most SMS providers have strict limits)
    displayName: 'SMS',
  },
  email: {
    mimeTypes: ['*/*'], // Email accepts all file types
    maxSize: 25 * 1024 * 1024, // 25MB (typical email attachment limit)
    displayName: 'Email',
  },
  facebook: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'audio/mpeg',
      'application/pdf',
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
    displayName: 'Facebook Messenger',
  },
  instagram: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'video/mp4',
      'audio/mpeg',
    ],
    maxSize: 8 * 1024 * 1024, // 8MB
    displayName: 'Instagram',
  },
  embed: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    displayName: 'Chat Widget',
  },
};

export type ChannelType = keyof typeof CHANNEL_MEDIA_SUPPORT;

/**
 * Check if a file is supported by a specific channel
 */
export function isFileSupported(
  file: File,
  channel: ChannelType
): { supported: boolean; reason?: string } {
  const config = CHANNEL_MEDIA_SUPPORT[channel];
  
  if (!config) {
    return { supported: false, reason: 'Unknown channel' };
  }

  // Check if all types are allowed
  if (config.mimeTypes.includes('*/*')) {
    if (file.size > config.maxSize) {
      return {
        supported: false,
        reason: `File size exceeds ${formatFileSize(config.maxSize)} limit for ${config.displayName}`,
      };
    }
    return { supported: true };
  }

  // Check MIME type
  if (!config.mimeTypes.includes(file.type)) {
    return {
      supported: false,
      reason: `${file.type} files are not supported by ${config.displayName}`,
    };
  }

  // Check file size
  if (file.size > config.maxSize) {
    return {
      supported: false,
      reason: `File size exceeds ${formatFileSize(config.maxSize)} limit for ${config.displayName}`,
    };
  }

  return { supported: true };
}

/**
 * Get supported file types as accept attribute for input
 */
export function getAcceptAttribute(channel: ChannelType): string {
  const config = CHANNEL_MEDIA_SUPPORT[channel];
  
  if (!config) {
    return '*/*';
  }
  
  if (config.mimeTypes.includes('*/*')) {
    return '*/*';
  }
  
  return config.mimeTypes.join(',');
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Get human-readable list of supported formats
 */
export function getSupportedFormatsText(channel: ChannelType): string {
  const config = CHANNEL_MEDIA_SUPPORT[channel];
  
  if (!config) {
    return 'All file types';
  }
  
  if (config.mimeTypes.includes('*/*')) {
    return 'All file types';
  }
  
  const formats = config.mimeTypes.map(mime => {
    const parts = mime.split('/');
    return parts[1]?.toUpperCase() || mime;
  });
  
  return formats.join(', ');
}
