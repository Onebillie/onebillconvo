import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'superadmin' | 'admin' | 'agent' | null>(null);
  const navigate = useNavigate();

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

    // Fetch user role from user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData) {
      setUserRole(roleData.role as 'superadmin' | 'admin' | 'agent');
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
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
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
    
    if (!error) {
      navigate("/app/dashboard");
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string = 'agent') => {
    const redirectUrl = `${window.location.origin}/app/dashboard`;
    
    const { error } = await supabase.auth.signUp({
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
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    navigate("/auth");
  };

  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

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
