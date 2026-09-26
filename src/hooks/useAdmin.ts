"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_EMAILS } from '@/utils/helpers';
import type { User } from '@supabase/supabase-js';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      setIsAdmin(!!currentUser?.email && ADMIN_EMAILS.includes(currentUser.email));
      setIsLoading(false);
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setIsAdmin(!!currentUser?.email && ADMIN_EMAILS.includes(currentUser.email));
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, isLoading, user };
};