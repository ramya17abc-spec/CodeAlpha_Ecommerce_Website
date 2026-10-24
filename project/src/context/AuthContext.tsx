import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

type AuthContextType = { user: User | null; session: Session | null; profile: Profile | null; loading: boolean; signIn: (e: string, p: string) => Promise<{ error: string | null }>; signUp: (e: string, p: string, d: string) => Promise<{ error: string | null }>; signOut: () => Promise<void>; refreshProfile: () => Promise<void>; };
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) { console.error('Profile fetch:', error.message); return; }
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) { fetchProfile(session.user.id).finally(() => setLoading(false)); } else { setLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) { (async () => { await fetchProfile(session.user.id); })(); } else { setProfile(null); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) { const { error } = await supabase.auth.signInWithPassword({ email, password }); return { error: error?.message ?? null }; }
  async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    if (error) return { error: error.message };
    if (data.user) { await new Promise(r => setTimeout(r, 500)); await fetchProfile(data.user.id); }
    return { error: null };
  }
  async function signOut() { await supabase.auth.signOut(); setProfile(null); setUser(null); setSession(null); }
  async function refreshProfile() { if (user) await fetchProfile(user.id); }

  return <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be within AuthProvider'); return ctx; }
