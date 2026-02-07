import { supabase } from './supabaseClient';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export const authService = {
  /**
   * Sign up a new user with email and password
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get the current user session
   */
  async getCurrentUser(): Promise<{ user: User | null; session: Session | null }> {
    const { data: { session } } = await supabase.auth.getSession();
    return { user: session?.user ?? null, session };
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session);
    });

    return subscription;
  },
};
