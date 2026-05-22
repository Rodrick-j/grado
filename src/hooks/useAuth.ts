'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import type { UserRole } from '@/lib/data';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          const sessionUser = session?.user ?? null;
          setUser(sessionUser);
          if (sessionUser) {
            setRole(sessionUser.user_metadata?.role as UserRole || 'RECEPTIONIST');
          } else if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) {
          setUser(null);
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          setRole(sessionUser.user_metadata?.role as UserRole || 'RECEPTIONIST');
        } else {
          setRole(null);
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return { user, role, loading, signOut };
}
