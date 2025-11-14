/**
 * Embed Resize Utility
 * Handles dynamic iframe resizing via postMessage API
 */

export interface ResizeMessage {
  type: 'embed-resize';
  height: number;
  width?: number;
}

/**
 * Send resize message to parent window
 */
export const sendResizeMessage = (height: number, width?: number) => {
  if (window.parent === window) {
    // Not in an iframe
    return;
  }

  const message: ResizeMessage = {
    type: 'embed-resize',
    height,
    width,
  };

  window.parent.postMessage(message, '*');
};

/**
 * Setup ResizeObserver to automatically send resize messages
 */
export const setupAutoResize = (element: HTMLElement) => {
  if (!element || window.parent === window) {
    return () => {}; // Return cleanup function
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const height = entry.contentRect.height;
      const width = entry.contentRect.width;
      sendResizeMessage(height, width);
    }
  });

  resizeObserver.observe(element);

  // Return cleanup function
  return () => {
    resizeObserver.disconnect();
  };
};

/**
 * Parent window script to handle resize messages
 * Usage: Add this script to the parent page that embeds the iframe
 */
export const getParentListenerScript = (iframeId: string) => {
  return `
<script>
  window.addEventListener('message', function(event) {
    if (event.data.type === 'embed-resize') {
      const iframe = document.getElementById('${iframeId}');
      if (iframe && event.data.height) {
        iframe.style.height = event.data.height + 'px';
        if (event.data.width) {
          iframe.style.width = event.data.width + 'px';
        }
      }
    }
  });
</script>
  `.trim();
};
