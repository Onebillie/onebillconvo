import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// VAPID public key is fetched from the server (edge function)
let CACHED_VAPID_PUBLIC_KEY: string | null = null;

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      // Listen for messages from SW (e.g., resubscribe requests)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PUSH_RESUBSCRIBE_REQUIRED') {
          subscribeToPush();
        }
      });
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  const getVapidPublicKey = async (): Promise<string | null> => {
    try {
      if (CACHED_VAPID_PUBLIC_KEY) return CACHED_VAPID_PUBLIC_KEY;
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (error) throw error;
      const key = (data as any)?.publicKey as string;
      CACHED_VAPID_PUBLIC_KEY = key;
      return key;
    } catch (e) {
      console.error('Failed to fetch VAPID public key', e);
      toast.error('Push setup error: missing VAPID key');
      return null;
    }
  };

  const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = () => (window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone;

  const subscribeToPush = async (): Promise<boolean> => {
    try {
      // iOS Safari requires installation to Home Screen for push
      if (isIos() && !isStandalone()) {
        toast.message('Install to Home Screen to enable push on iPhone');
        setPermission(Notification.permission);
        return false;
      }

      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      // Fetch VAPID key
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) return false;

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        toast.error('Failed to register service worker');
        return false;
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      setSubscription(pushSubscription);

      // Save subscription to database
      const subscriptionData = pushSubscription.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('User not authenticated');
        return false;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint!,
          p256dh: subscriptionData.keys!.p256dh,
          auth: subscriptionData.keys!.auth,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('Error saving subscription:', error);
        toast.error('Failed to save notification subscription');
        return false;
      }

      toast.success('Push notifications enabled!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  };

  const unsubscribeFromPush = async (): Promise<boolean> => {
    try {
      if (!subscription) {
        return true;
      }

      await subscription.unsubscribe();
      
      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      if (error) {
        console.error('Error removing subscription:', error);
      }

      setSubscription(null);
      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
      return false;
    }
  };
  return {
    isSupported,
    permission,
    subscription,
    subscribeToPush,
    unsubscribeFromPush
  };
};
