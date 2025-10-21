export interface WidgetPreset {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  config: {
    widget_type: 'bubble' | 'button' | 'bar' | 'corner-widget';
    icon_type: string;
    primary_color: string;
    secondary_color: string;
    text_color: string;
    widget_size: 'small' | 'medium' | 'large';
    widget_position: string;
    button_text: string;
    show_button_text: boolean;
    greeting_message: string;
    welcome_message: string;
    show_unread_badge: boolean;
  };
}

export const widgetPresets: WidgetPreset[] = [
  {
    id: 'classic-chat',
    name: 'Classic Chat',
    description: 'Traditional chat bubble - perfect for any website',
    thumbnail: '💬',
    config: {
      widget_type: 'bubble',
      icon_type: 'chat',
      primary_color: '#6366f1',
      secondary_color: '#4f46e5',
      text_color: '#ffffff',
      widget_size: 'medium',
      widget_position: 'bottom-right',
      button_text: 'Chat with us',
      show_button_text: false,
      greeting_message: 'Hi! How can we help?',
      welcome_message: 'Welcome! Send us a message.',
      show_unread_badge: true,
    },
  },
  {
    id: 'speech-bubble',
    name: 'Speech Bubble',
    description: 'Friendly speech bubble with text - great for engagement',
    thumbnail: '💭',
    config: {
      widget_type: 'bubble',
      icon_type: 'speech-bubble',
      primary_color: '#10b981',
      secondary_color: '#059669',
      text_color: '#ffffff',
      widget_size: 'medium',
      widget_position: 'bottom-right',
      button_text: 'Chat With Us',
      show_button_text: true,
      greeting_message: 'Hey there! 👋',
      welcome_message: 'We\'re here to help!',
      show_unread_badge: true,
    },
  },
  {
    id: 'support-bar',
    name: 'Support Bar',
    description: 'Bottom bar with prominent text - high visibility',
    thumbnail: '📊',
    config: {
      widget_type: 'bar',
      icon_type: 'headset',
      primary_color: '#3b82f6',
      secondary_color: '#2563eb',
      text_color: '#ffffff',
      widget_size: 'medium',
      widget_position: 'bottom-center',
      button_text: 'Need Help? Chat Now',
      show_button_text: true,
      greeting_message: 'Customer support is here!',
      welcome_message: 'How can we assist you today?',
      show_unread_badge: true,
    },
  },
  {
    id: 'minimal-icon',
    name: 'Minimal Icon',
    description: 'Small, discrete icon - low intrusion',
    thumbnail: '⭕',
    config: {
      widget_type: 'bubble',
      icon_type: 'help-circle',
      primary_color: '#8b5cf6',
      secondary_color: '#7c3aed',
      text_color: '#ffffff',
      widget_size: 'small',
      widget_position: 'bottom-right',
      button_text: 'Help',
      show_button_text: false,
      greeting_message: 'Need help?',
      welcome_message: 'Ask us anything!',
      show_unread_badge: true,
    },
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    description: 'Modern AI chatbot with sparkle icon',
    thumbnail: '✨',
    config: {
      widget_type: 'bubble',
      icon_type: 'sparkles',
      primary_color: '#f59e0b',
      secondary_color: '#d97706',
      text_color: '#ffffff',
      widget_size: 'medium',
      widget_position: 'bottom-right',
      button_text: 'AI Assistant',
      show_button_text: true,
      greeting_message: '✨ AI Assistant ready!',
      welcome_message: 'Ask me anything - I\'m here 24/7',
      show_unread_badge: true,
    },
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Professional support with headset icon',
    thumbnail: '🎧',
    config: {
      widget_type: 'bubble',
      icon_type: 'headset',
      primary_color: '#0ea5e9',
      secondary_color: '#0284c7',
      text_color: '#ffffff',
      widget_size: 'medium',
      widget_position: 'bottom-right',
      button_text: 'Support',
      show_button_text: true,
      greeting_message: 'Support team online!',
      welcome_message: 'We\'re here to help you succeed.',
      show_unread_badge: true,
    },
  },
  {
    id: 'sales-chat',
    name: 'Sales Chat',
    description: 'Sales-focused chat with phone icon',
    thumbnail: '📞',
    config: {
      widget_type: 'bubble',
      icon_type: 'phone',
      primary_color: '#ec4899',
      secondary_color: '#db2777',
      text_color: '#ffffff',
      widget_size: 'large',
      widget_position: 'bottom-right',
      button_text: 'Talk to Sales',
      show_button_text: true,
      greeting_message: 'Ready to grow your business?',
      welcome_message: 'Let\'s discuss how we can help!',
      show_unread_badge: true,
    },
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Shopping assistant with cart icon',
    thumbnail: '🛒',
    config: {
      widget_type: 'bubble',
      icon_type: 'shopping',
      primary_color: '#14b8a6',
      secondary_color: '#0d9488',
      text_color: '#ffffff',
      widget_size: 'medium',
      widget_position: 'bottom-right',
      button_text: 'Shop & Chat',
      show_button_text: true,
      greeting_message: 'Need shopping help?',
      welcome_message: 'Find the perfect product with our help!',
      show_unread_badge: true,
    },
  },
  {
    id: 'friendly-corner',
    name: 'Friendly Corner',
    description: 'Welcoming chat with smile icon',
    thumbnail: '😊',
    config: {
      widget_type: 'corner-widget',
      icon_type: 'smile',
      primary_color: '#f97316',
      secondary_color: '#ea580c',
      text_color: '#ffffff',
      widget_size: 'large',
      widget_position: 'bottom-right',
      button_text: 'Chat Now',
      show_button_text: true,
      greeting_message: 'Hello friend! 😊',
      welcome_message: 'We\'re excited to chat with you!',
      show_unread_badge: true,
    },
  },
  {
    id: 'help-center',
    name: 'Help Center',
    description: 'Information focused with lifebuoy icon',
    thumbnail: '🆘',
    config: {
      widget_type: 'bubble',
      icon_type: 'lifebuoy',
      primary_color: '#06b6d4',
      secondary_color: '#0891b2',
      text_color: '#ffffff',
      widget_size: 'medium',
      widget_position: 'bottom-left',
      button_text: 'Get Help',
      show_button_text: true,
      greeting_message: 'We\'re here to help!',
      welcome_message: 'Browse help docs or chat with us.',
      show_unread_badge: true,
    },
  },
];

export const getPresetById = (id: string): WidgetPreset | undefined => {
  return widgetPresets.find((preset) => preset.id === id);
};
