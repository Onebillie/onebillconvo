import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { getTierFromProductId, type SubscriptionTier } from "@/lib/stripeConfig";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  is_active: boolean;
}

interface UserRole {
  role: 'superadmin' | 'admin' | 'agent';
}

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  productId: string | null;
  subscriptionEnd: Date | null;
  isFrozen: boolean;
  seatCount: number;
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  currentBusinessId: string | null;
  userRole: 'superadmin' | 'admin' | 'agent' | null;
  subscriptionState: SubscriptionState;
  checkSubscription: () => Promise<void>;
  isAdminSession: boolean;
  startAdminSession: () => Promise<void>;
  endAdminSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'superadmin' | 'admin' | 'agent' | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    subscribed: false,
    tier: 'starter',
    productId: null,
    subscriptionEnd: null,
    isFrozen: false,
    seatCount: 1,
    loading: true,
  });
  const navigate = useNavigate();

  const checkSubscription = async () => {
    try {
      setSubscriptionState(prev => ({ ...prev, loading: true }));
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        setSubscriptionState(prev => ({ ...prev, loading: false }));
        return;
      }

      const tier = getTierFromProductId(data.product_id);
      setSubscriptionState({
        subscribed: data.subscribed || false,
        tier,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end ? new Date(data.subscription_end) : null,
        isFrozen: data.isFrozen || false,
        seatCount: data.seatCount || 1,
        loading: false,
      });
    } catch (error) {
      console.error("Error in checkSubscription:", error);
      setSubscriptionState(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchProfile = async (userId: string) => {
    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profileError && profileData) {
      setProfile(profileData as Profile);
    }

    // Fetch user roles and set highest privilege with fallback to RPC
    let roleSet: string[] = [];
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!rolesError && roles?.length) {
      roleSet = roles.map(r => r.role);
    } else {
      // Fallback: use secure RPC checks that bypass RLS via SECURITY DEFINER
      const [{ data: isSuper }, { data: isAdmin }] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'superadmin' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      ]);
      if (isSuper) roleSet.push('superadmin');
      else if (isAdmin) roleSet.push('admin');
      else roleSet.push('agent');
    }

    if (roleSet.includes('superadmin')) {
      setUserRole('superadmin');
    } else if (roleSet.includes('admin')) {
      setUserRole('admin');
    } else {
      setUserRole('agent');
    }

    // Fetch user's business (first business they're a member of)
    const { data: businessData } = await supabase
      .from("business_users")
      .select("business_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (businessData) {
      setCurrentBusinessId(businessData.business_id);
    }

    // Check subscription after fetching profile
    await checkSubscription();
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only trigger navigation on actual sign-in/sign-out events, not token refreshes
        const shouldNavigate = event === 'SIGNED_IN' || event === 'SIGNED_OUT';
        
        if (session?.user) {
          setLoading(true);
          setTimeout(() => {
            fetchProfile(session.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );


    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
        
        // Check for active admin session
        supabase
          .from('admin_sessions')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .single()
          .then(({ data }) => {
            setIsAdminSession(!!data);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Navigation is handled by onAuthStateChange for SIGNED_IN event
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string = 'agent') => {
    const redirectUrl = `${window.location.origin}/app/onboarding`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    
    // Check if user is immediately confirmed or needs email verification
    if (!error && data.user && data.session) {
      // User is logged in immediately (email confirmation disabled)
      navigate("/app/onboarding");
    } else if (!error && data.user && !data.session) {
      // Email confirmation required
      // Don't navigate, let the calling component handle the flow
    }
    
    return { error };
  };

  const startAdminSession = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('admin_sessions')
      .insert({ user_id: user.id })
      .select()
      .single();
    
    if (data) setIsAdminSession(true);
  };

  const endAdminSession = async () => {
    if (!user) return;
    
    await supabase
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    setIsAdminSession(false);
  };

  const signOut = async () => {
    // End admin session if active
    if (isAdminSession) {
      await endAdminSession();
    }
    
    await supabase.auth.signOut();
    setProfile(null);
    
    // Redirect based on session type
    navigate(isAdminSession ? "/admin/login" : "/auth");
  };

  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  // Auto-refresh subscription every 60 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        isSuperAdmin,
        isAdmin,
        currentBusinessId,
        userRole,
        subscriptionState,
        checkSubscription,
        isAdminSession,
        startAdminSession,
        endAdminSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
