import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;

/**
 * Initialize FingerprintJS (only once)
 */
const getFingerprintJS = async () => {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
};

/**
 * Generate a unique device fingerprint
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    const fp = await getFingerprintJS();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to a basic fingerprint if FingerprintJS fails
    return generateBasicFingerprint();
  }
};

/**
 * Get device name/description
 */
export const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  
  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  } else if (ua.includes('Android')) {
    os = 'Android';
  }

  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  }

  return `${os} - ${browser}`;
};

/**
 * Fallback basic fingerprint using browser characteristics
 */
const generateBasicFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.hardwareConcurrency || 'unknown',
  ];

  // Add canvas fingerprint
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser Fingerprint', 2, 15);
    components.push(canvas.toDataURL());
  }

  const fingerprint = components.join('|||');
  
  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * Store device fingerprint in localStorage for quick access
 */
export const storeDeviceFingerprint = (fingerprint: string) => {
  try {
    localStorage.setItem('admin_device_fp', fingerprint);
  } catch (error) {
    console.error('Error storing device fingerprint:', error);
  }
};

/**
 * Get stored device fingerprint
 */
export const getStoredDeviceFingerprint = (): string | null => {
  try {
    return localStorage.getItem('admin_device_fp');
  } catch (error) {
    console.error('Error retrieving device fingerprint:', error);
    return null;
  }
};
