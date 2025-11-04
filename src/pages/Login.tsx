import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button'; // Keep Button if used in JSX
// Removed Input and Label as they were unused

const Login = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        navigate('/user-dashboard');
      } else {
        setIsAuthenticated(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        navigate('/user-dashboard');
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/user-dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Google login failed: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex flex-col items-center justify-center">
        <Header />
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="text-center bg-[#1C0357] text-white">
            <CardTitle className="text-2xl">Redirecting...</CardTitle>
            <CardDescription className="text-gray-200">You are already logged in.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p>Please wait while we take you to your dashboard.</p>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30 flex flex-col items-center justify-center">
      <Header />
      <div className="flex-grow flex items-center justify-center w-full px-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="text-center bg-[#1C0357] text-white">
            <CardTitle className="text-2xl">Login or Sign Up</CardTitle>
            <CardDescription className="text-gray-200">Access your custom tracks and requests.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Button
              onClick={handleGoogleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_Gmail_2020.svg" alt="Gmail" className="h-5 w-5 mr-2" />
              Continue with Google
            </Button>
            <div className="relative flex items-center justify-center text-xs text-gray-500">
              <span className="absolute left-0 w-full border-t border-gray-300" />
              <span className="relative bg-white px-2">OR</span>
            </div>
            <p className="text-center text-sm text-gray-600">
              If you've previously ordered as a guest, logging in with the same email will link your requests.
            </p>
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;