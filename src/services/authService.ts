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
    // Check if current user is anonymous — if so, upgrade instead of creating new user
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.data.session?.user?.is_anonymous) {
      const { data, error } = await supabase.auth.updateUser({ email, password });
      return {
        user: data.user,
        session: sessionResult.data.session,
        error,
      };
    }

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

  /**
   * Verify OTP code for signup or login
   */
  async verifyOtp(email: string, token: string, type: 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' = 'signup'): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Resend OTP code
   */
  async resendOtp(email: string, type: 'signup' | 'email_change' = 'signup'): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resend({
      email,
      type,
    });
    return { error };
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  },

  /**
   * Update the user's password (used in the recovery flow)
   */
  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  },

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    return { error };
  },

  /**
   * Sign in anonymously (for live demo)
   */
  async signInAnonymously(): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInAnonymously();
    return {
      user: data.user,
      session: data.session,
      error,
    };
  }
};
