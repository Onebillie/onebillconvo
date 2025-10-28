/**
 * À La Carte Chat Widget SDK
 * For programmatic control of embedded chat widget
 */

(function(window) {
  'use strict';

  class AlacarteChatWidget {
    constructor() {
      this.iframe = null;
      this.config = {};
      this.eventHandlers = {};
      this.isOpen = false;
    }

    /**
     * Initialize the widget
     * @param {Object} config - Configuration object
     * @param {string} config.siteId - Your site ID
     * @param {string} config.embedUrl - Embed URL (optional, defaults to current domain)
     * @param {Object} config.customer - Pre-fill customer data
     * @param {boolean} config.autoOpen - Auto-open chat on load
     */
    init(config) {
      this.config = { ...config };
      
      // Listen for messages from iframe
      window.addEventListener('message', this._handleMessage.bind(this));
      
      if (config.autoOpen) {
        this.openChat();
      }
    }

    /**
     * Open the chat widget
     */
    openChat() {
      this._sendMessage({ action: 'open' });
      this.isOpen = true;
      this._emit('chatOpened');
    }

    /**
     * Close the chat widget
     */
    closeChat() {
      this._sendMessage({ action: 'close' });
      this.isOpen = false;
      this._emit('chatClosed');
    }

    /**
     * Toggle chat widget
     */
    toggleChat() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }

    /**
     * Send a message programmatically
     * @param {string} text - Message text
     */
    sendMessage(text) {
      this._sendMessage({ 
        action: 'sendMessage', 
        payload: { text } 
      });
    }

    /**
     * Update customer information
     * @param {Object} customer - Customer data
     * @param {string} customer.name - Customer name
     * @param {string} customer.email - Customer email
     * @param {string} customer.phone - Customer phone
     */
    setCustomer(customer) {
      this._sendMessage({ 
        action: 'setCustomer', 
        payload: customer 
      });
      this._emit('customerUpdated', customer);
    }

    /**
     * Get current conversation ID
     * @returns {Promise<string>} Conversation ID
     */
    async getConversationId() {
      return new Promise((resolve) => {
        const handler = (data) => {
          if (data.conversationId) {
            resolve(data.conversationId);
          }
        };
        this.once('conversationInfo', handler);
        this._sendMessage({ action: 'getConversationId' });
      });
    }

    /**
     * Register event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
      if (!this.eventHandlers[event]) {
        this.eventHandlers[event] = [];
      }
      this.eventHandlers[event].push(handler);
    }

    /**
     * Register one-time event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    once(event, handler) {
      const wrapper = (...args) => {
        handler(...args);
        this.off(event, wrapper);
      };
      this.on(event, wrapper);
    }

    /**
     * Unregister event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    off(event, handler) {
      if (!this.eventHandlers[event]) return;
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }

    /**
     * Resize the widget programmatically
     * @param {Object} dimensions - Width/height configuration
     * @param {string} dimensions.width - Width (e.g., '100%', '450px')
     * @param {string} dimensions.height - Height (e.g., '100%', '600px')
     * @param {string} dimensions.maxWidth - Max width
     * @param {string} dimensions.maxHeight - Max height
     */
    resize(dimensions) {
      this._sendMessage({ 
        action: 'resize', 
        payload: dimensions 
      });
    }

    /**
     * Set layout mode
     * @param {string} mode - 'floating', 'embedded', 'fullscreen', 'sidebar'
     */
    setLayoutMode(mode) {
      this._sendMessage({ 
        action: 'setLayoutMode', 
        payload: { mode } 
      });
    }

    /**
     * Set sizing mode
     * @param {string} mode - 'fixed', 'responsive', 'fullscreen', 'custom'
     */
    setSizingMode(mode) {
      this._sendMessage({ 
        action: 'setSizingMode', 
        payload: { mode } 
      });
    }

    /**
     * Destroy widget and clean up
     */
    destroy() {
      window.removeEventListener('message', this._handleMessage.bind(this));
      this.eventHandlers = {};
      this.iframe = null;
    }

    // Private methods

    _handleMessage(event) {
      // Verify origin if needed
      // if (event.origin !== this.config.embedUrl) return;

      const { type, data } = event.data;
      
      switch (type) {
        case 'alacarte:messageReceived':
          this._emit('messageReceived', data);
          break;
        case 'alacarte:messageSent':
          this._emit('messageSent', data);
          break;
        case 'alacarte:conversationCreated':
          this._emit('conversationCreated', data);
          break;
        case 'alacarte:chatOpened':
          this.isOpen = true;
          this._emit('chatOpened');
          break;
        case 'alacarte:chatClosed':
          this.isOpen = false;
          this._emit('chatClosed');
          break;
        case 'alacarte:conversationInfo':
          this._emit('conversationInfo', data);
          break;
        case 'alacarte:ready':
          this._emit('ready');
          break;
      }
    }

    _sendMessage(message) {
      const iframe = document.getElementById('alacarte-chat-iframe') || 
                     document.querySelector('iframe[src*="embed"]');
      
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'alacarte:command',
          ...message
        }, '*');
      }
    }

    _emit(event, data) {
      if (!this.eventHandlers[event]) return;
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  // Export as global
  window.AlacarteChatWidget = new AlacarteChatWidget();

  // Auto-init if config is present
  if (window.alacarteChatConfig) {
    window.AlacarteChatWidget.init(window.alacarteChatConfig);
  }

})(window);

/**
 * Usage Examples:
 * 
 * // Initialize
 * AlacarteChatWidget.init({
 *   siteId: 'your-site-id',
 *   customer: {
 *     name: 'John Doe',
 *     email: 'john@example.com'
 *   }
 * });
 * 
 * // Listen for events
 * AlacarteChatWidget.on('messageReceived', (message) => {
 *   console.log('New message:', message);
 *   // Update your CRM
 *   CRM.createActivity({
 *     type: 'chat_message',
 *     content: message.text
 *   });
 * });
 * 
 * // Programmatic control
 * document.getElementById('open-chat-btn').addEventListener('click', () => {
 *   AlacarteChatWidget.openChat();
 * });
 * 
 * // Send message from CRM
 * function sendFromCRM(text) {
 *   AlacarteChatWidget.sendMessage(text);
 * }
 */