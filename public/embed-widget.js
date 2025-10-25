(function() {
  'use strict';

  const AlacarteChatWidget = {
    initialized: false,
    config: {},
    sessionToken: null,
    conversationId: null,
    customerId: null,
    unreadCount: 0,
    pollingInterval: null,
    shadowRoot: null,
    requirePrechat: false,
    isAuthenticated: false,

    init: function(options) {
      if (this.initialized) {
        console.warn('[AlacarteChat] Widget already initialized');
        return;
      }

      if (!options.siteId) {
        console.error('[AlacarteChat] Missing required siteId');
        return;
      }

      this.config = {
        siteId: options.siteId,
        apiUrl: options.apiUrl || 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1',
        customer: options.customer || {},
        customData: options.customData || {}
      };

      // Try to restore session from cookie
      const savedSession = this.getSessionFromCookie();
      if (savedSession && savedSession.sessionToken && savedSession.customerId) {
        this.sessionToken = savedSession.sessionToken;
        this.conversationId = savedSession.conversationId;
        this.customerId = savedSession.customerId;
        this.isAuthenticated = true;
        this.initialized = true;
        this.injectWidget(savedSession.customization || {}, savedSession.businessName || 'Support');
        this.loadMessages();
        this.startPolling();
        return;
      }

      // Require pre-chat info if name/email/phone are missing
      this.requirePrechat = !(this.config.customer && this.config.customer.name && this.config.customer.email && this.config.customer.phone);

      this.initialized = true;
      if (this.requirePrechat) {
        // Inject shell UI and show pre-chat form; defer auth until user submits
        this.injectWidget({}, 'Support');
        this.showPrechatForm();
      } else {
        this.authenticate(this.config.customer);
      }
    },

    // Cookie management for session persistence
    setSessionCookie: function(sessionData) {
      try {
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const cookieData = JSON.stringify({
          sessionToken: sessionData.sessionToken,
          conversationId: sessionData.conversationId,
          customerId: sessionData.customerId,
          businessName: sessionData.businessName,
          customization: sessionData.customization
        });
        document.cookie = `alacarte_chat_session=${encodeURIComponent(cookieData)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
        console.log('[AlacarteChat] Session saved to cookie');
      } catch (error) {
        console.error('[AlacarteChat] Failed to save session cookie:', error);
      }
    },

    getSessionFromCookie: function() {
      const name = 'alacarte_chat_session=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookieArray = decodedCookie.split(';');
      for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
          try {
            return JSON.parse(cookie.substring(name.length));
          } catch (e) {
            return null;
          }
        }
      }
      return null;
    },

    clearSessionCookie: function() {
      document.cookie = 'alacarte_chat_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    },

    authenticate: async function(customerOverride) {
      console.log('[AlacarteChat] Starting authentication...', { 
        hasCustomerOverride: !!customerOverride,
        siteId: this.config.siteId 
      });

      try {
        const customer = customerOverride || this.config.customer || {};
        const response = await fetch(`${this.config.apiUrl}/embed-auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-site-id': this.config.siteId
          },
          body: JSON.stringify({
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            custom_data: this.config.customData
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[AlacarteChat] Auth failed:', response.status, errorText);
          if (!this.shadowRoot) {
            this.injectWidget({}, 'Support');
          }
          this.showPrechatForm();
          return false;
        }

        const data = await response.json();
        console.log('[AlacarteChat] Auth successful', {
          conversationId: data.session.conversation_id,
          customerId: data.session.customer_id
        });

        this.sessionToken = data.session.session_token;
        this.conversationId = data.session.conversation_id;
        this.customerId = data.session.customer_id;
        this.isAuthenticated = true;
        
        // Save session to cookie for persistence
        this.setSessionCookie({
          sessionToken: this.sessionToken,
          conversationId: this.conversationId,
          customerId: this.customerId,
          businessName: data.business_name,
          customization: data.customization
        });
        
        if (!this.shadowRoot) {
          this.injectWidget(data.customization || {}, data.business_name || 'Support');
        } else {
          // Enable input now that we're authenticated
          const sendBtn = this.shadowRoot.getElementById('send-btn');
          if (sendBtn) {
            sendBtn.disabled = false;
            console.log('[AlacarteChat] Send button enabled');
          }
          const header = this.shadowRoot.querySelector('.chat-header h3');
          if (header && data.business_name) header.textContent = data.business_name;
        }
        
        this.loadMessages();
        this.startPolling();
        return true;
      } catch (error) {
        console.error('[AlacarteChat] Authentication failed:', error);
        if (!this.shadowRoot) {
          this.injectWidget({}, 'Support');
        }
        this.showPrechatForm();
        return false;
      }
    },

    injectWidget: function(customization, businessName) {
      // Create host element with fixed positioning
      const host = document.createElement('div');
      host.id = 'alacarte-chat-host';
      host.style.cssText = 'all:initial;position:fixed!important;z-index:2147483647!important;pointer-events:none!important;';
      document.body.appendChild(host);

      // Create shadow root for CSS isolation
      if (!host.attachShadow) {
        console.error('[AlacarteChat] Shadow DOM not supported');
        return;
      }
      
      this.shadowRoot = host.attachShadow({ mode: 'open' });

      // Define styles with CSS reset
      const sizeMap = {
        small: { size: '48px', iconSize: '24px' },
        medium: { size: '60px', iconSize: '28px' },
        large: { size: '80px', iconSize: '36px' }
      };

      const shapeMap = {
        circle: '50%',
        square: '12px',
        rounded: '24px'
      };

      const widgetSize = sizeMap[customization.widget_size || 'medium'] || sizeMap.medium;
      const borderRadius = shapeMap[customization.widget_shape || 'circle'] || '50%';

      // Dynamic position styles
      const getPositionStyle = () => {
        const pos = customization.widget_position || 'bottom-right';
        switch(pos) {
          case 'top-left': return 'top: 20px !important; left: 20px !important;';
          case 'top-center': return 'top: 20px !important; left: 50% !important; transform: translateX(-50%);';
          case 'top-right': return 'top: 20px !important; right: 20px !important;';
          case 'bottom-left': return 'bottom: 20px !important; left: 20px !important;';
          case 'bottom-center': return 'bottom: 20px !important; left: 50% !important; transform: translateX(-50%);';
          case 'bottom-right': return 'bottom: 20px !important; right: 20px !important;';
          default: return 'bottom: 20px !important; right: 20px !important;';
        }
      };

      const styles = `
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .widget-container {
          all: initial;
          position: fixed !important;
          ${getPositionStyle()}
          pointer-events: auto !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          z-index: 999999 !important;
        }
        
        .chat-button {
          width: ${widgetSize.size};
          height: ${widgetSize.size};
          border-radius: ${borderRadius};
          background: ${customization.primary_color || '#6366f1'};
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: ${customization.show_button_text ? '0 20px' : '0'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.2s;
          position: relative;
          min-width: ${widgetSize.size};
        }
        
        .chat-button:hover {
          transform: scale(1.05);
          background: ${customization.secondary_color || customization.primary_color || '#4f46e5'};
        }
        
        .chat-button svg {
          width: ${widgetSize.iconSize};
          height: ${widgetSize.iconSize};
          fill: ${customization.text_color || 'white'};
          flex-shrink: 0;
        }

        .chat-button-text {
          color: ${customization.text_color || 'white'};
          font-weight: 500;
          font-size: 14px;
          white-space: nowrap;
        }
        
        .unread-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: bold;
          display: none;
        }
        
        .unread-badge.visible {
          display: block;
        }
        
        .chat-window {
          position: fixed !important;
          ${(() => {
            const pos = customization.widget_position || 'bottom-right';
            const offset = `calc(${widgetSize.size} + 30px)`;
            if (pos.includes('bottom')) return `bottom: ${offset} !important;`;
            if (pos.includes('top')) return `top: ${offset} !important;`;
            return 'bottom: 100px !important;';
          })()}
          ${(() => {
            const pos = customization.widget_position || 'bottom-right';
            if (pos.includes('left')) return 'left: 20px !important;';
            if (pos.includes('right')) return 'right: 20px !important;';
            if (pos.includes('center')) return 'left: 50% !important; transform: translateX(-50%);';
            return 'right: 20px !important;';
          })()}
          width: 380px;
          height: 600px;
          max-height: calc(100vh - 140px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        
        .chat-window.open {
          display: flex !important;
        }
        
        .chat-header {
          background: ${customization.primary_color || '#6366f1'};
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .chat-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        
        .close-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
          padding: 0;
          width: 24px;
          height: 24px;
        }
        
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f9fafb;
        }
        
        .message {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
        }
        
        .message.inbound {
          align-items: flex-start;
        }
        
        .message.outbound {
          align-items: flex-end;
        }
        
        .message-bubble {
          max-width: 70%;
          padding: 10px 14px;
          border-radius: 12px;
          word-wrap: break-word;
        }
        
        .message.inbound .message-bubble {
          background: white;
          color: #1f2937;
          border: 1px solid #e5e7eb;
        }
        
        .message.outbound .message-bubble {
          background: ${customization.primary_color || '#6366f1'};
          color: white;
        }
        
        .message-time {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }
        
        .chat-input-container {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: white;
        }
        
        .chat-input-wrapper {
          display: flex;
          gap: 8px;
        }
        
        .chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }
        
        .chat-input:focus {
          border-color: ${customization.primary_color || '#6366f1'};
        }
        
        .send-btn {
          padding: 10px 18px;
          background: ${customization.primary_color || '#6366f1'};
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        
        .send-btn:hover {
          opacity: 0.9;
        }
        
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 480px) {
          .chat-window {
            width: calc(100vw - 40px) !important;
            height: calc(100vh - 140px) !important;
          }
        }
      `;

      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      this.shadowRoot.appendChild(styleEl);

      // Create widget HTML
      const widgetHTML = `
        <div class="widget-container">
          <button class="chat-button" id="toggle-chat">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            ${customization.show_button_text ? `<span class="chat-button-text">${this.escapeHtml(customization.button_text || 'Chat')}</span>` : ''}
            <span class="unread-badge" id="unread-badge">0</span>
          </button>
          
          <div class="chat-window" id="chat-window">
            <div class="chat-header">
              <h3>${businessName}</h3>
              <button class="close-btn" id="close-chat">&times;</button>
            </div>
            <div class="chat-messages" id="chat-messages">
              ${customization.greeting_message ? `
                <div class="message inbound greeting-message" data-greeting="true">
                  <div class="message-bubble">${this.escapeHtml(customization.greeting_message)}</div>
                </div>
              ` : ''}
            </div>
            <div class="chat-input-container">
              <div class="chat-input-wrapper">
                <input type="text" class="chat-input" id="message-input" placeholder="Type a message..." />
                <button class="send-btn" id="send-btn" ${this.isAuthenticated ? '' : 'disabled'}>Send</button>
              </div>
            </div>
          </div>
        </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = widgetHTML;
      this.shadowRoot.appendChild(container.firstElementChild);

      // Event listeners
      this.shadowRoot.getElementById('toggle-chat').addEventListener('click', () => this.toggleChat());
      this.shadowRoot.getElementById('close-chat').addEventListener('click', () => this.toggleChat());
      this.shadowRoot.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
      this.shadowRoot.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    },

    toggleChat: function() {
      const chatWindow = this.shadowRoot.getElementById('chat-window');
      const isOpen = chatWindow.classList.toggle('open');
      
      if (isOpen) {
        this.unreadCount = 0;
        this.updateUnreadBadge();
        this.shadowRoot.getElementById('message-input').focus();
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
      } else {
        this.startPolling();
      }
    },

    loadMessages: async function() {
      if (!this.sessionToken) return;

      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({ action: 'get_messages' })
        });

        if (!response.ok) {
          console.error('[AlacarteChat] Failed to load messages:', response.status);
          return;
        }

        const data = await response.json();
        this.renderMessages(data.messages || []);
      } catch (error) {
        console.error('[AlacarteChat] Failed to load messages:', error);
      }
    },

    renderMessages: function(messages) {
      const container = this.shadowRoot.getElementById('chat-messages');
      // Remove all messages except the greeting
      const existingMessages = container.querySelectorAll('.message:not([data-greeting="true"])');
      existingMessages.forEach(msg => msg.remove());

      messages.forEach(msg => {
        const messageEl = document.createElement('div');
        // Inbound = customer message (from widget user), Outbound = business response
        messageEl.className = `message ${msg.direction}`;
        messageEl.setAttribute('data-message-id', msg.id);
        messageEl.innerHTML = `
          <div class="message-bubble">${this.escapeHtml(msg.content)}</div>
          <div class="message-time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        container.appendChild(messageEl);
      });

      container.scrollTop = container.scrollHeight;
    },

    sendMessage: async function() {
      const input = this.shadowRoot.getElementById('message-input');
      const message = input.value.trim();
      if (!message || !this.sessionToken) return;

      const sendBtn = this.shadowRoot.getElementById('send-btn');
      sendBtn.disabled = true;

      // Optimistically show the message immediately
      const container = this.shadowRoot.getElementById('chat-messages');
      const tempMessageEl = document.createElement('div');
      tempMessageEl.className = 'message inbound';
      tempMessageEl.setAttribute('data-temp', 'true');
      tempMessageEl.innerHTML = `
        <div class="message-bubble">${this.escapeHtml(message)}</div>
        <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      `;
      container.appendChild(tempMessageEl);
      container.scrollTop = container.scrollHeight;
      input.value = '';

      try {
        console.log('[AlacarteChat] Sending message...', { conversationId: this.conversationId });
        
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({ 
            action: 'send_message',
            message: message,
            content: message
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[AlacarteChat] Failed to send message:', response.status, errorText);
          throw new Error('Failed to send message');
        }

        const data = await response.json();
        console.log('[AlacarteChat] Message sent successfully:', data);

        // Remove temp message and add the real one with ID
        tempMessageEl.remove();
        if (data.message) {
          const realMessageEl = document.createElement('div');
          realMessageEl.className = 'message inbound';
          realMessageEl.setAttribute('data-message-id', data.message.id);
          realMessageEl.innerHTML = `
            <div class="message-bubble">${this.escapeHtml(data.message.content)}</div>
            <div class="message-time">${new Date(data.message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          `;
          container.appendChild(realMessageEl);
          container.scrollTop = container.scrollHeight;
        }
      } catch (error) {
        console.error('[AlacarteChat] Failed to send message:', error);
        // Remove temp message on error
        tempMessageEl.remove();
        // Show error state
        const errorEl = document.createElement('div');
        errorEl.style.cssText = 'text-align: center; padding: 8px; color: #ef4444; font-size: 12px;';
        errorEl.textContent = 'Failed to send message. Please try again.';
        container.appendChild(errorEl);
        setTimeout(() => errorEl.remove(), 3000);
      } finally {
        sendBtn.disabled = false;
      }
    },

      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({
            action: 'send_message',
            message: message
          })
        });

        if (!response.ok) {
          console.error('[AlacarteChat] Failed to send message:', response.status);
          // Remove the temporary message on error
          tempMessageEl.remove();
          input.value = message; // Restore the message
          return;
        }

        // Remove temp message and reload all messages from server
        tempMessageEl.remove();
        this.loadMessages();
      } catch (error) {
        console.error('[AlacarteChat] Failed to send message:', error);
        tempMessageEl.remove();
        input.value = message;
      } finally {
        sendBtn.disabled = false;
      }
    },

    startPolling: function() {
      if (this.pollingInterval) return;
      this.pollingInterval = setInterval(() => {
        const chatWindow = this.shadowRoot?.getElementById('chat-window');
        if (chatWindow && !chatWindow.classList.contains('open')) {
          this.checkForNewMessages();
        }
      }, 5000);
    },

    checkForNewMessages: async function() {
      if (!this.sessionToken) return;

      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
          },
          body: JSON.stringify({ action: 'get_messages' })
        });

        if (!response.ok) return;

        const data = await response.json();
        const currentMessages = this.getCurrentMessages();
        
        if (data.messages && data.messages.length > currentMessages.length) {
          this.unreadCount += (data.messages.length - currentMessages.length);
          this.updateUnreadBadge();
          this.renderMessages(data.messages);
        }
      } catch (error) {
        console.error('[AlacarteChat] Polling error:', error);
      }
    },

    updateUnreadBadge: function() {
      const badge = this.shadowRoot?.getElementById('unread-badge');
      if (!badge) return;
      
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount;
        badge.classList.add('visible');
      } else {
        badge.classList.remove('visible');
      }
    },

    getCurrentMessages: function() {
      if (!this.shadowRoot) return [];
      return this.shadowRoot.querySelectorAll('.message:not(.inbound:first-child)');
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    showPrechatForm: function() {
      if (!this.shadowRoot) return;

      // Ensure chat window exists
      const chatWindow = this.shadowRoot.getElementById('chat-window');
      if (chatWindow && !chatWindow.classList.contains('open')) {
        chatWindow.classList.add('open');
      }

      // Add minimal styles for prechat form
      const style = document.createElement('style');
      style.textContent = `
        .prechat-form { padding: 16px; }
        .prechat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .prechat-grid .full { grid-column: span 2; }
        .prechat-input { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
        .prechat-actions { margin-top: 12px; display: flex; justify-content: flex-end; }
        .prechat-submit { padding: 10px 16px; background: #6366f1; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
      `;
      this.shadowRoot.appendChild(style);

      // Hide chat input until authenticated
      const inputContainer = this.shadowRoot.getElementById('message-input')?.closest('.chat-input-container');
      if (inputContainer) inputContainer.style.display = 'none';

      const messages = this.shadowRoot.getElementById('chat-messages');
      if (!messages) return;
      
      // Preserve greeting message if it exists
      const greetingMsg = messages.querySelector('[data-greeting="true"]');
      const greetingHTML = greetingMsg ? greetingMsg.outerHTML : '';
      
      messages.innerHTML = `
        ${greetingHTML}
        <form id="prechat-form" class="prechat-form">
          <div class="prechat-grid">
            <input class="prechat-input" id="first-name" placeholder="First name" required />
            <input class="prechat-input" id="last-name" placeholder="Last name" required />
            <input class="prechat-input full" id="email" type="email" placeholder="Email address" required />
            <input class="prechat-input full" id="phone" placeholder="Phone number" required />
          </div>
          <div class="prechat-actions">
            <button type="submit" class="prechat-submit">Start chat</button>
          </div>
        </form>
      `;

      const form = this.shadowRoot.getElementById('prechat-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const first = this.shadowRoot.getElementById('first-name').value.trim();
        const last = this.shadowRoot.getElementById('last-name').value.trim();
        const email = this.shadowRoot.getElementById('email').value.trim();
        const phone = this.shadowRoot.getElementById('phone').value.trim();
        
        // Validate all required fields
        if (!first || !last || !email || !phone) {
          alert('Please fill in all fields');
          return;
        }
        
        const ok = await this.authenticate({ name: `${first} ${last}`.trim(), email, phone });
        if (ok) {
          // Restore chat UI
          if (inputContainer) inputContainer.style.display = 'block';
          // Remove only the form, keep greeting message
          const form = messages.querySelector('#prechat-form');
          if (form) form.remove();
          this.loadMessages();
        }
      });
    }
  };

  window.AlacarteChatWidget = AlacarteChatWidget;
})();
