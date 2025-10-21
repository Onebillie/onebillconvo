/**
 * AlacarteChat Embeddable Widget - Secure Version
 * Uses site_id instead of tokens for better security
 */

(function() {
  'use strict';

  const AlacarteChatWidget = {
    config: null,
    session: null,
    isOpen: false,
    unreadCount: 0,
    pollInterval: null,
    customization: null,

    init: function(options) {
      if (!options.siteId) {
        console.error('AlacarteChatWidget: siteId is required');
        return;
      }

      this.config = {
        siteId: options.siteId,
        apiUrl: options.apiUrl || 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
        customer: options.customer || {},
        customData: options.customData || {}
      };

      this.authenticate();
    },

    authenticate: async function() {
      try {
        const response = await fetch(`${this.config.apiUrl}/embed-auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-site-id': this.config.siteId
          },
          body: JSON.stringify({
            customer_name: this.config.customer.name,
            customer_email: this.config.customer.email,
            customer_phone: this.config.customer.phone,
            custom_data: this.config.customData
          })
        });

        const data = await response.json();

        if (data.success) {
          this.session = data.session;
          this.customization = data.customization || {};
          this.injectWidget();
          this.startPolling();
        } else {
          console.error('AlacarteChatWidget: Authentication failed', data.error);
        }
      } catch (error) {
        console.error('AlacarteChatWidget: Authentication error', error);
      }
    },

    injectWidget: function() {
      const c = this.customization;
      const primaryColor = c.primary_color || '#6366f1';
      const secondaryColor = c.secondary_color || '#4f46e5';
      const textColor = c.text_color || '#ffffff';
      const position = c.widget_position || 'bottom-right';
      const size = c.widget_size || 'medium';
      const showText = c.show_button_text || false;
      const buttonText = c.button_text || 'Chat';
      const iconType = c.icon_type || 'chat';
      const greeting = c.greeting_message || 'Chat with us';
      
      // Size mapping
      const sizeMap = { small: '48px', medium: '60px', large: '72px' };
      const buttonSize = sizeMap[size];
      
      // Icon SVG mapping
      const icons = {
        'chat': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        'speech-bubble': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        'headset': '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
        'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
        'sparkles': '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
        'smile': '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
        'shopping': '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
        'lifebuoy': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" x2="9.17" y1="4.93" y2="9.17"/><line x1="14.83" x2="19.07" y1="14.83" y2="19.07"/><line x1="14.83" x2="19.07" y1="9.17" y2="4.93"/><line x1="4.93" x2="9.17" y1="19.07" y2="14.83"/>'
      };
      const iconSvg = icons[iconType] || icons['chat'];
      
      const customCSS = c.custom_css || '';

      const widget = document.createElement('div');
      widget.id = 'alacarte-chat-widget';
      
      // Button HTML - with or without text
      const buttonContent = showText 
        ? `<div style="display: flex; align-items: center; gap: 8px; padding: 0 20px;">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconSvg}</svg>
             <span style="font-weight: 500;">${buttonText}</span>
           </div>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconSvg}</svg>`;
      
      const buttonStyle = showText
        ? `min-width: ${buttonSize}; height: ${buttonSize}; border-radius: 30px; padding: 0 20px;`
        : `width: ${buttonSize}; height: ${buttonSize}; border-radius: 50%;`;

      widget.innerHTML = `
        <style>
          ${customCSS}
          #alacarte-chat-widget {
            position: fixed;
            ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
            ${position.includes('right') ? 'right: 20px;' : position.includes('left') ? 'left: 20px;' : 'left: 50%; transform: translateX(-50%);'}
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #alacarte-chat-button {
            ${buttonStyle}
            background: ${primaryColor};
            color: ${textColor};
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            transition: transform 0.2s;
          }
          #alacarte-chat-button:hover {
            transform: scale(1.05);
          }
...
        </style>
        <button id="alacarte-chat-button" onclick="AlacarteChatWidget.toggleChat()">
          ${buttonContent}
          <span id="alacarte-unread-badge" class="alacarte-unread-badge" style="display: none;"></span>
        </button>
        <div id="alacarte-chat-window">
          <div id="alacarte-chat-header">
            <span>${greeting}</span>
            <button id="alacarte-chat-close" onclick="AlacarteChatWidget.toggleChat()">×</button>
          </div>
          <div id="alacarte-chat-messages"></div>
          <div id="alacarte-chat-input-area">
            <input type="text" id="alacarte-chat-input" placeholder="Type a message..." onkeypress="if(event.key==='Enter') AlacarteChatWidget.sendMessage()">
            <button id="alacarte-chat-send" onclick="AlacarteChatWidget.sendMessage()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(widget);
      this.loadMessages();
    },

    toggleChat: function() {
      const window = document.getElementById('alacarte-chat-window');
      this.isOpen = !this.isOpen;
      window.classList.toggle('open', this.isOpen);
      
      if (this.isOpen) {
        this.unreadCount = 0;
        this.updateUnreadBadge();
        document.getElementById('alacarte-chat-input').focus();
      }
    },

    loadMessages: async function() {
      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.session.session_token
          },
          body: JSON.stringify({ action: 'get_messages' })
        });

        const data = await response.json();
        if (data.messages) {
          this.renderMessages(data.messages);
        }
      } catch (error) {
        console.error('AlacarteChatWidget: Load messages error', error);
      }
    },

    renderMessages: function(messages) {
      const container = document.getElementById('alacarte-chat-messages');
      container.innerHTML = messages.map(msg => `
        <div class="alacarte-message ${msg.direction === 'outbound' ? 'agent' : 'customer'}">
          <div class="alacarte-message-content">${this.escapeHtml(msg.content)}</div>
        </div>
      `).join('');
      container.scrollTop = container.scrollHeight;
    },

    sendMessage: async function() {
      const input = document.getElementById('alacarte-chat-input');
      const message = input.value.trim();
      if (!message) return;

      input.value = '';
      
      const tempMessage = { content: message, direction: 'inbound' };
      this.renderMessages([...this.getCurrentMessages(), tempMessage]);

      try {
        await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.session.session_token
          },
          body: JSON.stringify({ action: 'send_message', message })
        });
        
        this.loadMessages();
      } catch (error) {
        console.error('AlacarteChatWidget: Send message error', error);
      }
    },

    startPolling: function() {
      this.pollInterval = setInterval(() => {
        if (!this.isOpen) {
          this.checkForNewMessages();
        }
      }, 3000);
    },

    checkForNewMessages: async function() {
      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.session.session_token
          },
          body: JSON.stringify({ action: 'get_messages' })
        });

        const data = await response.json();
        if (data.messages) {
          const agentMessages = data.messages.filter(m => m.direction === 'outbound');
          const newCount = agentMessages.length - (this.lastKnownCount || 0);
          if (newCount > 0) {
            this.unreadCount += newCount;
            this.updateUnreadBadge();
          }
          this.lastKnownCount = agentMessages.length;
        }
      } catch (error) {
        console.error('AlacarteChatWidget: Check messages error', error);
      }
    },

    updateUnreadBadge: function() {
      const badge = document.getElementById('alacarte-unread-badge');
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    },

    getCurrentMessages: function() {
      const container = document.getElementById('alacarte-chat-messages');
      return Array.from(container.querySelectorAll('.alacarte-message')).map(el => ({
        content: el.querySelector('.alacarte-message-content').textContent,
        direction: el.classList.contains('agent') ? 'outbound' : 'inbound'
      }));
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  window.AlacarteChatWidget = AlacarteChatWidget;
})();
