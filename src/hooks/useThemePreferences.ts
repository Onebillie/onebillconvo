import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ThemePreferences {
  id?: string;
  primary_color: string;
  primary_foreground: string;
  secondary_color: string;
  secondary_foreground: string;
  accent_color: string;
  accent_foreground: string;
  background_color: string;
  foreground_color: string;
  card_color: string;
  card_foreground: string;
  muted_color: string;
  muted_foreground: string;
  border_color: string;
}

const defaultTheme: ThemePreferences = {
  primary_color: '222.2 47.4% 11.2%',
  primary_foreground: '210 40% 98%',
  secondary_color: '210 40% 96.1%',
  secondary_foreground: '222.2 47.4% 11.2%',
  accent_color: '210 40% 96.1%',
  accent_foreground: '222.2 47.4% 11.2%',
  background_color: '0 0% 100%',
  foreground_color: '222.2 47.4% 11.2%',
  card_color: '0 0% 100%',
  card_foreground: '222.2 47.4% 11.2%',
  muted_color: '210 40% 96.1%',
  muted_foreground: '215.4 16.3% 46.9%',
  border_color: '214.3 31.8% 91.4%',
};

export const useThemePreferences = (businessId: string | null) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<ThemePreferences>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !businessId) {
      setLoading(false);
      return;
    }

    loadTheme();
  }, [user, businessId]);

  const loadTheme = async () => {
    if (!user || !businessId) return;

    try {
      const { data, error } = await supabase
        .from('user_theme_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading theme:', error);
      } else if (data) {
        setTheme(data);
        applyTheme(data);
      } else {
        applyTheme(defaultTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (themeData: ThemePreferences) => {
    const root = document.documentElement;
    
    root.style.setProperty('--primary', themeData.primary_color);
    root.style.setProperty('--primary-foreground', themeData.primary_foreground);
    root.style.setProperty('--secondary', themeData.secondary_color);
    root.style.setProperty('--secondary-foreground', themeData.secondary_foreground);
    root.style.setProperty('--accent', themeData.accent_color);
    root.style.setProperty('--accent-foreground', themeData.accent_foreground);
    root.style.setProperty('--background', themeData.background_color);
    root.style.setProperty('--foreground', themeData.foreground_color);
    root.style.setProperty('--card', themeData.card_color);
    root.style.setProperty('--card-foreground', themeData.card_foreground);
    root.style.setProperty('--muted', themeData.muted_color);
    root.style.setProperty('--muted-foreground', themeData.muted_foreground);
    root.style.setProperty('--border', themeData.border_color);
  };

  const saveTheme = async (newTheme: Partial<ThemePreferences>) => {
    if (!user || !businessId) {
      toast.error('User not authenticated');
      return;
    }

    const updatedTheme = { ...theme, ...newTheme };

    try {
      const { data, error } = await supabase
        .from('user_theme_preferences')
        .upsert({
          user_id: user.id,
          business_id: businessId,
          ...updatedTheme,
        }, {
          onConflict: 'user_id,business_id'
        })
        .select()
        .single();

      if (error) throw error;

      setTheme(data);
      applyTheme(data);
      toast.success('Theme updated successfully');
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    }
  };

  const resetTheme = async () => {
    if (!user || !businessId) return;

    try {
      await supabase
        .from('user_theme_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('business_id', businessId);

      setTheme(defaultTheme);
      applyTheme(defaultTheme);
      toast.success('Theme reset to default. Refreshing page...');
      
      // Reload page after a short delay to ensure theme fully resets
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error('Error resetting theme:', error);
      toast.error('Failed to reset theme');
    }
  };

  return {
    theme,
    loading,
    saveTheme,
    resetTheme,
  };
};
