/**
 * AlacarteChat Embeddable Widget
 * Drop this script into any website to enable live chat
 * 
 * Usage:
 * <script src="https://your-domain.com/embed-widget.js"></script>
 * <script>
 *   AlacarteChatWidget.init({
 *     token: 'your-embed-token',
 *     apiUrl: 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
 *     customer: {
 *       name: 'John Doe',
 *       email: 'john@example.com',
 *       phone: '+1234567890'
 *     },
 *     customData: {
 *       userId: '12345',
 *       plan: 'premium'
 *     }
 *   });
 * </script>
 */

(function() {
  'use strict';

  const AlacarteChatWidget = {
    config: null,
    session: null,
    isOpen: false,
    unreadCount: 0,
    pollInterval: null,

    init: function(options) {
      if (!options.token) {
        console.error('AlacarteChatWidget: token is required');
        return;
      }

      this.config = {
        token: options.token,
        apiUrl: options.apiUrl || 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
        customer: options.customer || {},
        customData: options.customData || {},
        position: options.position || 'bottom-right',
        theme: options.theme || 'light',
        primaryColor: options.primaryColor || '#6366f1'
      };

      this.authenticate();
    },

    authenticate: async function() {
      try {
        const response = await fetch(`${this.config.apiUrl}/embed-auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-embed-token': this.config.token
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
      // Create widget container
      const widget = document.createElement('div');
      widget.id = 'alacarte-chat-widget';
      widget.innerHTML = `
        <style>
          #alacarte-chat-widget {
            position: fixed;
            ${this.config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
            ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #alacarte-chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${this.config.primaryColor};
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            position: relative;
          }
          #alacarte-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
          }
          #alacarte-chat-button svg {
            width: 28px;
            height: 28px;
            fill: white;
          }
          #alacarte-unread-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          }
          #alacarte-unread-badge.show {
            display: flex;
          }
          #chat-window {
            display: none;
            width: 380px;
            height: 600px;
            max-height: calc(100vh - 100px);
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            flex-direction: column;
            overflow: hidden;
            margin-bottom: 10px;
          }
          #chat-window.open {
            display: flex;
          }
          #alacarte-chat-header {
            background: ${this.config.primaryColor};
            color: white;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          #alacarte-chat-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }
          #close-button {
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 24px;
            padding: 0;
            width: 30px;
            height: 30px;
          }
          #messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f9fafb;
          }
          .alacarte-message {
            margin-bottom: 16px;
            display: flex;
            gap: 8px;
          }
          .alacarte-message.customer {
            flex-direction: row-reverse;
          }
          .alacarte-message-bubble {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            word-wrap: break-word;
          }
          .alacarte-message.agent .alacarte-message-bubble {
            background: white;
            color: #1f2937;
            border: 1px solid #e5e7eb;
          }
          .alacarte-message.customer .alacarte-message-bubble {
            background: ${this.config.primaryColor};
            color: white;
          }
          .alacarte-message-time {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 4px;
          }
          #alacarte-input-area {
            padding: 16px;
            background: white;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 8px;
          }
          #message-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 14px;
            outline: none;
            resize: none;
            font-family: inherit;
          }
          #alacarte-message-input:focus {
            border-color: ${this.config.primaryColor};
          }
          #alacarte-send-button {
            background: ${this.config.primaryColor};
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            cursor: pointer;
            font-weight: 500;
            transition: opacity 0.2s;
          }
          #alacarte-send-button:hover {
            opacity: 0.9;
          }
          #alacarte-send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        </style>
        
        <div id="alacarte-chat-window">
          <div id="alacarte-chat-header">
            <h3>${this.session.business_name}</h3>
            <button id="alacarte-close-button">&times;</button>
          </div>
          <div id="alacarte-messages"></div>
          <div id="alacarte-input-area">
            <textarea id="alacarte-message-input" placeholder="Type your message..." rows="1"></textarea>
            <button id="alacarte-send-button">Send</button>
          </div>
        </div>
        
        <button id="alacarte-chat-button">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <span id="alacarte-unread-badge">0</span>
        </button>
      `;

      document.body.appendChild(widget);

      // Event listeners
      document.getElementById('alacarte-chat-button').addEventListener('click', () => this.toggleChat());
      document.getElementById('alacarte-close-button').addEventListener('click', () => this.toggleChat());
      document.getElementById('alacarte-send-button').addEventListener('click', () => this.sendMessage());
      
      const input = document.getElementById('alacarte-message-input');
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      this.loadMessages();
    },

    toggleChat: function() {
      this.isOpen = !this.isOpen;
      const chatWindow = document.getElementById('alacarte-chat-window');
      
      if (this.isOpen) {
        chatWindow.classList.add('open');
        this.unreadCount = 0;
        this.updateUnreadBadge();
        this.loadMessages();
      } else {
        chatWindow.classList.remove('open');
      }
    },

    loadMessages: async function() {
      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-embed-token': this.config.token
          },
          body: JSON.stringify({
            action: 'get_messages',
            conversation_id: this.session.conversation_id
          })
        });

        const data = await response.json();

        if (data.success) {
          this.renderMessages(data.messages);
        }
      } catch (error) {
        console.error('AlacarteChatWidget: Error loading messages', error);
      }
    },

    renderMessages: function(messages) {
      const container = document.getElementById('alacarte-messages');
      container.innerHTML = '';

      messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alacarte-message ${msg.sender_type}`;
        
        const time = new Date(msg.created_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        messageDiv.innerHTML = `
          <div class="alacarte-message-bubble">
            ${this.escapeHtml(msg.content)}
            <div class="alacarte-message-time">${time}</div>
          </div>
        `;

        container.appendChild(messageDiv);
      });

      container.scrollTop = container.scrollHeight;
    },

    sendMessage: async function() {
      const input = document.getElementById('alacarte-message-input');
      const content = input.value.trim();

      if (!content) return;

      const sendButton = document.getElementById('alacarte-send-button');
      sendButton.disabled = true;
      input.value = '';

      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-embed-token': this.config.token
          },
          body: JSON.stringify({
            action: 'send_message',
            conversation_id: this.session.conversation_id,
            customer_id: this.session.customer_id,
            content: content
          })
        });

        const data = await response.json();

        if (data.success) {
          this.loadMessages();
        }
      } catch (error) {
        console.error('AlacarteChatWidget: Error sending message', error);
        input.value = content;
      } finally {
        sendButton.disabled = false;
      }
    },

    startPolling: function() {
      // Poll for new messages every 3 seconds
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
            'x-embed-token': this.config.token
          },
          body: JSON.stringify({
            action: 'get_messages',
            conversation_id: this.session.conversation_id
          })
        });

        const data = await response.json();

        if (data.success) {
          const unreadMessages = data.messages.filter(msg => 
            msg.sender_type === 'agent' && !msg.is_read
          );
          
          if (unreadMessages.length > this.unreadCount) {
            this.unreadCount = unreadMessages.length;
            this.updateUnreadBadge();
          }
        }
      } catch (error) {
        console.error('AlacarteChatWidget: Error checking messages', error);
      }
    },

    updateUnreadBadge: function() {
      const badge = document.getElementById('unread-badge');
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount;
        badge.classList.add('show');
      } else {
        badge.classList.remove('show');
      }
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Expose to global scope
  window.AlacarteChatWidget = AlacarteChatWidget;
})();
