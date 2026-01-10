import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation(); // Use useLocation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        // Only navigate if the event is SIGNED_IN and we are not already on the target page
        if (event === 'SIGNED_IN' && location.pathname !== '/user-dashboard') {
          navigate('/user-dashboard');
        }
      } else {
        setIsAuthenticated(false);
      }
    });

    // Initial check for session
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        // Only navigate if not already on the user dashboard
        if (location.pathname !== '/user-dashboard') {
          navigate('/user-dashboard');
        }
      }
    };
    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]); // Add location.pathname to dependencies

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You have been logged in successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Check your email to confirm your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return null; // Will redirect immediately
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Login</h1>
          <p className="text-xl font-light text-[#1C0357]/90">Access your account</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-[#1C0357]">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your backing tracks and requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              providers={['google']}
              appearance={{ theme: ThemeSupa }}
              theme="light"
              redirectTo={`${window.location.origin}/user-dashboard`}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email address',
                    password_label: 'Your password',
                    email_input_placeholder: 'Enter your email address',
                    password_input_placeholder: 'Enter your password',
                    button_label: 'Sign In',
                    social_provider_text: 'Or continue with {{provider}}',
                    link_text: 'Already have an account? Sign In',
                  },
                  sign_up: {
                    email_label: 'Email address',
                    password_label: 'Create a password',
                    email_input_placeholder: 'Enter your email address',
                    password_input_placeholder: 'Create a password',
                    button_label: 'Sign Up',
                    social_provider_text: 'Or continue with {{provider}}',
                    link_text: 'Don\'t have an account? Sign Up',
                  },
                },
              }}
            />
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Don't have an account? Create one to save your requests and access all your tracks in one place.</p>
            </div>
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Login;