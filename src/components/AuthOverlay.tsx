"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // User is signed in, close the overlay and navigate to dashboard
        onClose();
        navigate('/user-dashboard');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [onClose, navigate]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-2xl bg-white shadow-xl border-none">
        <DialogHeader className="text-center mb-6">
          <DialogTitle className="text-2xl font-bold text-[#1C0357]">Welcome Back!</DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">Sign in or create an account to manage your requests.</DialogDescription>
        </DialogHeader>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]} // Only email/password by default
          redirectTo={`${window.location.origin}/user-dashboard`} // Redirect to the user dashboard after login
          magicLink={true}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email Address',
                password_label: 'Password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Your password',
                button_label: 'Sign In',
                social_provider_text: 'Sign in with {{provider}}',
                link_text: 'Already have an account? Sign In',
              },
              sign_up: {
                email_label: 'Email Address',
                password_label: 'Create a Password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Your password',
                button_label: 'Sign Up',
                social_provider_text: 'Sign up with {{provider}}',
                link_text: 'Don\'t have an account? Sign Up',
              },
              forgotten_password: {
                email_label: 'Email Address',
                email_input_placeholder: 'Your email address',
                button_label: 'Send Reset Instructions',
                link_text: 'Forgot your password?',
              },
              update_password: {
                password_label: 'New Password',
                password_input_placeholder: 'Your new password',
                button_label: 'Update Password',
              },
              magic_link: {
                email_input_placeholder: 'Your email address',
                button_label: 'Send Magic Link',
                link_text: 'Send a magic link email',
              },
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AuthOverlay;