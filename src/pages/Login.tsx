import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Header from "@/components/Header";
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        // Redirect to user-dashboard or the page they were trying to access
        const from = (location.state as any)?.from?.pathname || '/user-dashboard';
        navigate(from, { replace: true });
      } else {
        setIsAuthenticated(false);
      }
    });

    // Initial check for session
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        const from = (location.state as any)?.from?.pathname || '/user-dashboard';
        navigate(from, { replace: true });
      }
    };
    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  if (isAuthenticated) {
    return null; // Will redirect immediately
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex flex-col justify-center">
      <Header />
      
      <div className="max-w-md w-full mx-auto px-4 sm:px-6 py-12">
        <Card className="shadow-2xl border-none rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="text-center pt-10 pb-6 bg-[#1C0357] text-white">
            <CardTitle className="text-3xl font-black tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-purple-200 font-medium mt-2">
              Sign in to access your backing tracks, requests, and credits
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <Auth
              supabaseClient={supabase}
              providers={['google']}
              appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#1C0357',
                      brandAccent: '#F538BC',
                      brandButtonText: 'white',
                      defaultButtonBackground: 'white',
                      defaultButtonBackgroundHover: '#f9fafb',
                      defaultButtonBorder: '#e5e7eb',
                      inputBackground: 'white',
                      inputBorder: '#e5e7eb',
                      inputBorderFocus: '#1C0357',
                      inputBorderHover: '#D1AAF2',
                    },
                    radii: {
                      borderRadiusButton: '16px',
                      buttonBorderRadius: '16px',
                      inputBorderRadius: '16px',
                    }
                  }
                }
              }}
              theme="light"
              redirectTo={`${window.location.origin}/user-dashboard`}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email Address',
                    password_label: 'Password',
                    email_input_placeholder: 'Your email address',
                    password_input_placeholder: 'Your password',
                    button_label: 'Sign In',
                    social_provider_text: 'Or continue with {{provider}}',
                    link_text: 'Already have an account? Sign In',
                  },
                  sign_up: {
                    email_label: 'Email Address',
                    password_label: 'Create a Password',
                    email_input_placeholder: 'Your email address',
                    password_input_placeholder: 'Your password',
                    button_label: 'Sign Up',
                    social_provider_text: 'Or continue with {{provider}}',
                    link_text: 'Don\'t have an account? Sign Up',
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;