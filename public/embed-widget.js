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
    styleEl: null,
    prechatStyleEl: null,
    cachedCustomization: null,
    supabaseClient: null,
    presenceChannel: null,
    presenceInterval: null,
    cleanupTimer: null,
    sessionStatus: 'online',
    presenceHeartbeatInterval: null,
    notificationSound: null,

    init: async function(options) {
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

      // PRIVACY-FIRST: No session persistence across page loads
      // Always start with a clean slate - fetch customization and show prechat form
      const config = await this.fetchCustomization(this.config.siteId);
      this.requirePrechat = true;
      this.initialized = true;
      
      // Inject with fetched customization
      this.injectWidget(config?.customization || {}, config?.business_name || 'Support');
      this.showPrechatForm();

      // Cleanup presence when page unloads
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });

      // Cleanup on visibility change (tab close/switch)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // User switched tabs or closed - clean up presence after 30 seconds
          this.cleanupTimer = setTimeout(() => {
            this.cleanup();
          }, 30000);
        } else if (document.visibilityState === 'visible') {
          // User came back - cancel cleanup
          if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
          }
        }
      });
    },

    fetchCustomization: async function(siteId) {
      try {
        console.log('[AlacarteChat] Fetching customization before widget injection...');
        const response = await fetch(`${this.config.apiUrl}/embed-auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-site-id': siteId
          },
          body: JSON.stringify({ action: 'get_config' })
        });

        if (!response.ok) {
          console.warn('[AlacarteChat] Failed to fetch config:', response.status);
          return null;
        }

        const data = await response.json();
        console.log('[AlacarteChat] Customization fetched successfully');
        this.cachedCustomization = data.customization;
        return data;
      } catch (error) {
        console.error('[AlacarteChat] Error fetching customization:', error);
        return null;
      }
    },

    // PRIVACY-FIRST: No session persistence
    // Sessions are in-memory only and clear on page unload/refresh
    // This ensures customers always start with a clean slate

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

        console.log('[AlacarteChat] Auth response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[AlacarteChat] Auth failed:', response.status, errorText);
          
          // Try to parse error details for better debugging
          try {
            const errorJson = JSON.parse(errorText);
            console.error('[AlacarteChat] Error details:', errorJson);
          } catch {}
          
          // Ensure widget UI exists
          if (!this.shadowRoot) {
            this.injectWidget({}, 'Support');
          }
          
          // Show user-friendly error message in the chat
          const messages = this.shadowRoot.getElementById('chat-messages');
          if (messages) {
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
              padding: 12px; 
              margin: 8px 16px; 
              background: #fee2e2; 
              color: #991b1b; 
              border-radius: 8px; 
              font-size: 13px; 
              text-align: center;
              border: 1px solid #fca5a5;
            `;
            errorMsg.innerHTML = `
              <strong>Connection failed</strong><br/>
              <small>Please check your details and try again. If the problem persists, refresh the page.</small>
            `;
            messages.appendChild(errorMsg);
            
            // Auto-remove after 8 seconds
            setTimeout(() => errorMsg.remove(), 8000);
          }
          
          // Keep the form visible but don't regenerate it - preserves user's entered data
          const form = this.shadowRoot?.getElementById('prechat-form');
          const submitBtn = form?.querySelector('.prechat-submit');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Try again';
          } else {
            // Form doesn't exist yet, show it
            this.showPrechatForm();
          }
          
          return false;
        }

        const data = await response.json();
        console.log('[AlacarteChat] Auth response data:', data);

        // Check if duplicate customer was found
        if (data.duplicate_found) {
          console.log('[AlacarteChat] Duplicate customer detected');
          this.showMergeDialog(data.existing_customer, data.new_details);
          return false;
        }

        console.log('[AlacarteChat] Auth successful', {
          conversationId: data.session.conversation_id,
          customerId: data.session.customer_id
        });

        this.sessionToken = data.session.session_token;
        this.conversationId = data.session.conversation_id;
        this.customerId = data.session.customer_id;
        this.isAuthenticated = true;
        this.sessionStatus = 'online';

        // PRIVACY-FIRST: Store session in memory only (no cookies, no persistence)
        // Session will be cleared when page unloads or widget closes

        // Initialize presence tracking
        this.initializePresence(data.session.conversation_id);
        this.startPresenceHeartbeat();
        
        if (!this.shadowRoot) {
          this.injectWidget(data.customization || {}, data.business_name || 'Support');
        } else {
          // Widget already exists - re-apply customization if it changed
          this.applyCustomization(data.customization || {}, data.business_name);
          
          // Enable input now that we're authenticated
          const sendBtn = this.shadowRoot.getElementById('send-btn');
          if (sendBtn) {
            sendBtn.disabled = false;
            console.log('[AlacarteChat] Send button enabled');
          }
        }
        
        // Show greeting with conversation starters
        this.showGreeting(data.customization || {});
        
        this.loadMessages();
        this.startPolling();
        this.updateSessionStatus('online');
        return true;
      } catch (error) {
        console.error('[AlacarteChat] Authentication failed:', error);
        
        // Ensure widget UI exists
        if (!this.shadowRoot) {
          this.injectWidget({}, 'Support');
        }
        
        // Show user-friendly error message
        const messages = this.shadowRoot.getElementById('chat-messages');
        if (messages) {
          const errorMsg = document.createElement('div');
          errorMsg.style.cssText = `
            padding: 12px; 
            margin: 8px 16px; 
            background: #fee2e2; 
            color: #991b1b; 
            border-radius: 8px; 
            font-size: 13px; 
            text-align: center;
            border: 1px solid #fca5a5;
          `;
          errorMsg.innerHTML = `
            <strong>Connection failed</strong><br/>
            <small>Please check your details and try again. If the problem persists, refresh the page.</small>
          `;
          messages.appendChild(errorMsg);
          
          // Auto-remove after 8 seconds
          setTimeout(() => errorMsg.remove(), 8000);
        }
        
        // Keep the form visible but don't regenerate it - preserves user's data
        const form = this.shadowRoot?.getElementById('prechat-form');
        const submitBtn = form?.querySelector('.prechat-submit');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Try again';
        } else {
          // Form doesn't exist yet, show it
          this.showPrechatForm();
        }
        
        return false;
      }
    },

    buildStyles: function(customization) {
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

      return `
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
          gap: 8px;
        }
        
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
        }
        
        .chat-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          flex: 1;
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
          color: #1f2937 !important;
          background: #ffffff !important;
        }
        
        .chat-input::placeholder {
          color: #9ca3af !important;
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
    },

    injectWidget: function(customization, businessName) {
      // Store customization for later use
      this.cachedCustomization = customization;

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

      // Build and inject styles
      const styles = this.buildStyles(customization);
      this.styleEl = document.createElement('style');
      this.styleEl.textContent = styles;
      this.shadowRoot.appendChild(this.styleEl);

      // Get widget size for button HTML
      const sizeMap = {
        small: { size: '48px', iconSize: '24px' },
        medium: { size: '60px', iconSize: '28px' },
        large: { size: '80px', iconSize: '36px' }
      };
      const widgetSize = sizeMap[customization.widget_size || 'medium'] || sizeMap.medium;

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
              <div class="status-indicator" id="status-dot"></div>
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
        // Don't clean up presence when minimizing - keep showing as online
        // Only clean up on actual browser close or page unload
      }
    },

    initializePresence: function(conversationId) {
      console.log('[AlacarteChat] Initializing presence tracking...', conversationId);
      
      // Use the public anon key (same as in src/integrations/supabase/client.ts)
      const SUPABASE_URL = 'https://jrtlrnfdqfkjlkpfirzr.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs';
      
      // Dynamically import Supabase from CDN
      if (!window.supabase) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
          this.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          this.startPresenceTracking(conversationId);
        };
        script.onerror = () => {
          console.error('[AlacarteChat] Failed to load Supabase SDK');
        };
        document.head.appendChild(script);
      } else {
        this.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.startPresenceTracking(conversationId);
      }
    },

    startPresenceTracking: function(conversationId) {
      console.log('[AlacarteChat] Starting presence tracking for conversation:', conversationId);
      
      this.presenceChannel = this.supabaseClient
        .channel(`embed-presence-${conversationId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = this.presenceChannel.presenceState();
          console.log('[AlacarteChat] Presence synced:', state);
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          console.log('[AlacarteChat] Presence joined:', key);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('[AlacarteChat] Presence left:', key);
        })
        .subscribe(async (status) => {
          console.log('[AlacarteChat] Presence channel status:', status);
          if (status === 'SUBSCRIBED') {
            // Initial presence track
            await this.presenceChannel.track({
              online_at: new Date().toISOString(),
              conversation_id: conversationId,
              user_agent: navigator.userAgent,
              page: 'embed_widget'
            });
            console.log('[AlacarteChat] Initial presence tracked');
          }
        });
      
      // Heartbeat every 15 seconds to keep presence alive
      this.presenceInterval = setInterval(async () => {
        if (this.presenceChannel && this.isAuthenticated) {
          await this.presenceChannel.track({
            online_at: new Date().toISOString(),
            conversation_id: conversationId,
            user_agent: navigator.userAgent,
            page: 'embed_widget'
          });
          console.log('[AlacarteChat] Presence heartbeat sent');
        }
      }, 15000);
    },

    cleanup: function() {
      console.log('[AlacarteChat] Cleaning up presence and resources');
      
      // Stop presence heartbeat
      if (this.presenceInterval) {
        clearInterval(this.presenceInterval);
        this.presenceInterval = null;
      }
      
      // Stop custom presence heartbeat
      if (this.presenceHeartbeatInterval) {
        clearInterval(this.presenceHeartbeatInterval);
        this.presenceHeartbeatInterval = null;
      }
      
      // Untrack presence
      if (this.presenceChannel) {
        this.presenceChannel.untrack();
        this.supabaseClient.removeChannel(this.presenceChannel);
        this.presenceChannel = null;
      }
      
      // Stop polling
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      
      // Clear cleanup timer
      if (this.cleanupTimer) {
        clearTimeout(this.cleanupTimer);
        this.cleanupTimer = null;
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

    renderMessages: function(messages, playSound = false) {
      const container = this.shadowRoot.getElementById('chat-messages');
      // Remove all messages except the greeting
      const existingMessages = container.querySelectorAll('.message:not([data-greeting="true"])');
      const oldCount = existingMessages.length;
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
      
      // Play notification sound if new messages arrived
      if (playSound && messages.length > oldCount) {
        this.playNotificationSound();
      }
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

    validateSession: async function(sessionToken) {
      try {
        const response = await fetch(`${this.config.apiUrl}/embed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionToken
          },
          body: JSON.stringify({ action: 'validate_session' })
        });
        return response.ok;
      } catch {
        return false;
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
          this.renderMessages(data.messages, true); // Play sound on new messages
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

    applyCustomization: function(customization, businessName) {
      if (!this.shadowRoot || !this.styleEl) {
        console.warn('[AlacarteChat] Cannot apply customization - widget not injected');
        return;
      }

      console.log('[AlacarteChat] Applying fresh customization to existing widget');
      
      // Update styles
      this.styleEl.textContent = this.buildStyles(customization);

      // Also update prechat form styles if present
      const pc = (customization && customization.primary_color) || '#6366f1';
      if (this.prechatStyleEl) {
      this.prechatStyleEl.textContent = `
        .prechat-form { padding: 16px; }
        .prechat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .prechat-grid .full { grid-column: span 2; }
        .prechat-input { 
          width: 100%; 
          padding: 10px 12px; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          font-size: 14px;
          color: #1f2937 !important;
          background: #ffffff !important;
        }
        .prechat-input::placeholder {
          color: #9ca3af !important;
        }
        .prechat-input:focus { border-color: ${pc}; outline: none; box-shadow: 0 0 0 2px ${pc}22; }
        .prechat-actions { margin-top: 12px; display: flex; justify-content: flex-end; }
        .prechat-submit { padding: 10px 16px; background: ${pc}; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .prechat-submit:hover { opacity: 0.9; }
        .prechat-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `;
      }
      
      // Update header text
      const header = this.shadowRoot.querySelector('.chat-header h3');
      if (header && businessName) {
        header.textContent = businessName;
      }

      // Update button text if visible
      const buttonText = this.shadowRoot.querySelector('.chat-button-text');
      if (buttonText && customization.show_button_text) {
        buttonText.textContent = customization.button_text || 'Chat';
      }

      this.cachedCustomization = customization;
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    showMergeDialog: function(existingCustomer, newDetails) {
      const messages = this.shadowRoot.getElementById('chat-messages');
      if (!messages) return;
      
      messages.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h4 style="margin: 0 0 12px; font-size: 16px; font-weight: 600;">Welcome back!</h4>
          <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
            We found an existing account with these details:
          </p>
          <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin: 0 0 16px; text-align: left;">
            <strong style="display: block; margin-bottom: 4px;">${this.escapeHtml(existingCustomer.name)}</strong>
            ${existingCustomer.email ? `<div style="font-size: 13px; color: #6b7280;">${this.escapeHtml(existingCustomer.email)}</div>` : ''}
            ${existingCustomer.phone ? `<div style="font-size: 13px; color: #6b7280;">${this.escapeHtml(existingCustomer.phone)}</div>` : ''}
          </div>
          <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
            Would you like to continue with your previous conversations?
          </p>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="merge-btn" data-action="merge" style="flex: 1; padding: 10px 16px; background: ${this.cachedCustomization?.primary_color || '#6366f1'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
              Continue with existing
            </button>
            <button class="merge-btn" data-action="new" style="flex: 1; padding: 10px 16px; background: #e5e7eb; color: #374151; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
              Start fresh
            </button>
          </div>
        </div>
      `;
      
      this.shadowRoot.querySelectorAll('.merge-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const action = e.target.dataset.action;
          // Disable buttons
          this.shadowRoot.querySelectorAll('.merge-btn').forEach(b => b.disabled = true);
          
          if (action === 'new') {
            // User chose to start fresh - show prechat form again
            this.showPrechatForm();
          } else {
            // User chose to merge - authenticate with existing customer ID
            // TODO: This needs backend support to accept customer_id directly
            // For now, we'll create new and let admin merge later
            this.showPrechatForm();
          }
        });
      });
    },

    showGreeting: function(customization) {
      if (!customization.greeting_message && !customization.conversation_starters?.length) return;
      
      const messages = this.shadowRoot.getElementById('chat-messages');
      if (!messages) return;
      
      // Check if greeting already exists
      if (messages.querySelector('[data-greeting="true"]')) return;
      
      const greetingEl = document.createElement('div');
      greetingEl.className = 'message outbound';
      greetingEl.setAttribute('data-greeting', 'true');
      
      let startersHTML = '';
      if (customization.conversation_starters?.length) {
        const starters = Array.isArray(customization.conversation_starters) 
          ? customization.conversation_starters 
          : [];
        startersHTML = `
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
            ${starters.map(starter => `
              <button class="quick-reply-btn" data-text="${this.escapeHtml(starter.text || '')}" 
                style="padding: 8px 12px; background: white; border: 1px solid ${customization.primary_color || '#6366f1'}; 
                color: ${customization.primary_color || '#6366f1'}; border-radius: 8px; cursor: pointer; font-size: 13px; 
                text-align: left; transition: all 0.2s;">
                ${this.escapeHtml(starter.text || '')}
              </button>
            `).join('')}
          </div>
        `;
      }
      
      greetingEl.innerHTML = `
        <div class="message-bubble">${this.escapeHtml(customization.greeting_message || 'Hi! How can we help?')}</div>
        ${startersHTML}
      `;
      
      messages.appendChild(greetingEl);
      messages.scrollTop = messages.scrollHeight;
      
      // Add click handlers for quick replies
      this.shadowRoot.querySelectorAll('.quick-reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.dataset.text;
          const input = this.shadowRoot.getElementById('message-input');
          if (input && text) {
            input.value = text;
            this.sendMessage();
          }
        });
        
        // Hover effects
        btn.addEventListener('mouseenter', (e) => {
          e.target.style.background = customization.primary_color || '#6366f1';
          e.target.style.color = 'white';
        });
        btn.addEventListener('mouseleave', (e) => {
          e.target.style.background = 'white';
          e.target.style.color = customization.primary_color || '#6366f1';
        });
      });
    },

    startPresenceHeartbeat: function() {
      if (this.presenceHeartbeatInterval) return;
      
      this.presenceHeartbeatInterval = setInterval(async () => {
        if (!this.sessionToken) return;
        
        try {
          const response = await fetch(`${this.config.apiUrl}/embed-presence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-token': this.sessionToken
            },
            body: JSON.stringify({ 
              action: 'heartbeat',
              timestamp: new Date().toISOString()
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.session_valid) {
              this.updateSessionStatus('online');
            }
          } else {
            this.updateSessionStatus('offline');
          }
        } catch (err) {
          console.warn('[AlacarteChat] Presence heartbeat failed:', err);
          this.updateSessionStatus('away');
        }
      }, 10000); // Every 10 seconds
    },

    updateSessionStatus: function(status) {
      this.sessionStatus = status;
      const dot = this.shadowRoot?.getElementById('status-dot');
      if (!dot) return;
      
      dot.className = 'status-indicator';
      if (status === 'online') {
        dot.style.background = '#10b981';
        dot.title = 'Connected';
      } else if (status === 'offline') {
        dot.style.background = '#ef4444';
        dot.title = 'Disconnected';
      } else if (status === 'away') {
        dot.style.background = '#f59e0b';
        dot.title = 'Away';
      }
    },

    playNotificationSound: function() {
      const customization = this.cachedCustomization || {};
      if (!customization.sound_notifications) return;
      
      const chatWindow = this.shadowRoot?.getElementById('chat-window');
      if (chatWindow?.classList.contains('open')) return; // Don't play if window is open
      
      if (!this.notificationSound) {
        // Create audio element with notification sound (simple beep)
        this.notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDBz0PPXezAgEGa/7+2mUxQJR5fiz3I/Dwc9o+fvrl0SE0Si4vK8bSMGKIPR8tmORggYarvvtJZLFAtOp+LvvG8pBzaV2PPNfSoHJXvJ8duRPQkWYLnr7KZUEQpHn+HywXAiBDJ20fPYeTEfDma97uymVBQKR5jiz3FAEAg9o+jxrVwQEUSj4u+9cyQHKoTR8tqPRAgWaLvusmJMEAxKqOLwvWsjBi6H0fLXjUEJE2G8' + '7OukUhELSJ/h8r9yIwUwdNHz2noyCRBivu7vpVIRCkee4c9+Pw8HPKPo8a5bEBJEo+LvvnQnBymE0fHZj0UIFWi77rNmTBEOSqjh8LxrIwYuh9Hy140/CRNgve7rpVMSC0if4fK+ciQFMXXR89x8LwcPY77u66ZVEQpHn+HPfj8PBzyj6PGuWxAR');
      }
      
      this.notificationSound.play().catch(err => 
        console.log('[AlacarteChat] Could not play notification sound:', err)
      );
      
      // Desktop notification
      this.showDesktopNotification('New message');
    },

    showDesktopNotification: function(message) {
      if (!('Notification' in window)) return;
      
      if (Notification.permission === 'granted') {
        new Notification(this.config.businessName || 'New Message', {
          body: message,
          icon: this.cachedCustomization?.custom_icon_url || '/favicon.png',
          badge: '/favicon.png',
          tag: 'alacarte-chat-' + this.conversationId,
          requireInteraction: false
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    },

    showPrechatForm: function() {
      if (!this.shadowRoot) return;

      // Ensure chat window exists
      const chatWindow = this.shadowRoot.getElementById('chat-window');
      if (chatWindow && !chatWindow.classList.contains('open')) {
        chatWindow.classList.add('open');
      }

      // Add minimal styles for prechat form (uses primary_color)
      const primaryColor = (this.cachedCustomization && this.cachedCustomization.primary_color) || '#6366f1';
      if (!this.prechatStyleEl) {
        this.prechatStyleEl = document.createElement('style');
        this.shadowRoot.appendChild(this.prechatStyleEl);
      }
      this.prechatStyleEl.textContent = `
        .prechat-form { padding: 16px; }
        .prechat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .prechat-grid .full { grid-column: span 2; }
        .prechat-input { 
          width: 100%; 
          padding: 10px 12px; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          font-size: 14px;
          color: #1f2937 !important;
          background: #ffffff !important;
        }
        .prechat-input::placeholder {
          color: #9ca3af !important;
        }
        .prechat-input:focus { border-color: ${primaryColor}; outline: none; box-shadow: 0 0 0 2px ${primaryColor}22; }
        .prechat-actions { margin-top: 12px; display: flex; justify-content: flex-end; }
        .prechat-submit { padding: 10px 16px; background: ${primaryColor}; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .prechat-submit:hover { opacity: 0.9; }
        .prechat-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `;

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
            <input class="prechat-input" id="first-name" placeholder="First name *" required pattern="[A-Za-z\\s]{2,}" title="At least 2 letters" />
            <input class="prechat-input" id="last-name" placeholder="Last name *" required pattern="[A-Za-z\\s]{2,}" title="At least 2 letters" />
            <input class="prechat-input full" id="email" type="email" placeholder="Email address *" required pattern="[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$" title="Valid email required" />
            <input class="prechat-input full" id="phone" placeholder="Phone number *" required pattern="[0-9+\\-\\s()]{10,}" title="Valid phone number (min 10 digits)" />
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
        
        // Disable submit button during authentication
        const submitBtn = form.querySelector('.prechat-submit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Connecting...';
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
        // If authentication failed, the error handler will re-enable the button
      });
    }
  };

  window.AlacarteChatWidget = AlacarteChatWidget;
})();
