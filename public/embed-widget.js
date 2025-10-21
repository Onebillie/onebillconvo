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
      const primaryColor = this.customization.primary_color || '#6366f1';
      const position = this.customization.widget_position || 'bottom-right';
      const customCSS = this.customization.custom_css || '';

      const widget = document.createElement('div');
      widget.id = 'alacarte-chat-widget';
      widget.innerHTML = `
        <style>
          ${customCSS}
          #alacarte-chat-widget {
            position: fixed;
            ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
            ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #alacarte-chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${primaryColor};
            color: white;
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
            transform: scale(1.1);
          }
          #alacarte-chat-window {
            display: none;
            width: 380px;
            height: 600px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 100px);
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            flex-direction: column;
          }
          #alacarte-chat-window.open {
            display: flex;
          }
          #alacarte-chat-header {
            background: ${primaryColor};
            color: white;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          #alacarte-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: #f9fafb;
          }
          .alacarte-message {
            margin-bottom: 12px;
            display: flex;
          }
          .alacarte-message.agent {
            justify-content: flex-start;
          }
          .alacarte-message.customer {
            justify-content: flex-end;
          }
          .alacarte-message-content {
            max-width: 70%;
            padding: 10px 14px;
            border-radius: 12px;
            word-wrap: break-word;
          }
          .alacarte-message.agent .alacarte-message-content {
            background: white;
            color: #1f2937;
          }
          .alacarte-message.customer .alacarte-message-content {
            background: ${primaryColor};
            color: white;
          }
          #alacarte-chat-input-area {
            padding: 16px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 8px;
          }
          #alacarte-chat-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 20px;
            padding: 8px 16px;
            font-size: 14px;
            outline: none;
          }
          #alacarte-chat-send {
            background: ${primaryColor};
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          #alacarte-chat-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
          }
          .alacarte-unread-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ef4444;
            color: white;
            border-radius: 12px;
            padding: 2px 6px;
            font-size: 12px;
            font-weight: bold;
          }
        </style>
        <button id="alacarte-chat-button" onclick="AlacarteChatWidget.toggleChat()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span id="alacarte-unread-badge" class="alacarte-unread-badge" style="display: none;"></span>
        </button>
        <div id="alacarte-chat-window">
          <div id="alacarte-chat-header">
            <span>${this.customization.greeting_message || 'Chat with us'}</span>
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
