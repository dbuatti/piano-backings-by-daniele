import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

const TestFunction = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  const testFunction = async () => {
    setIsTesting(true);
    setResult(null);
    
    try {
      const testData = {
        formData: {
          email: "test@example.com",
          name: "Test User",
          songTitle: "Test Song",
          musicalOrArtist: "Test Musical",
          songKey: "C Major (0)",
          differentKey: "No",
          keyForTrack: "",
          youtubeLink: "https://www.youtube.com/watch?v=test",
          voiceMemo: "",
          trackPurpose: "personal-practise",
          backingType: "full-song",
          deliveryDate: "2023-12-31",
          additionalServices: ["rush-order"],
          specialRequests: "This is a test request for Dropbox folder creation"
        }
      };

      // Get the session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to test this function');
      }
      
      const response = await fetch(
        `https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/create-backing-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(testData),
        }
      );
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Function executed successfully. Check Dropbox for new folder.",
        });
      } else {
        throw new Error(data.error || `Function failed with status ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error testing function:', error);
      toast({
        title: "Error",
        description: `There was a problem testing the function: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-[#1C0357]">Test Dropbox Integration</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90">Test the backing track request function with Dropbox folder creation</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#1C0357]">Function Test</CardTitle>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-[#1C0357]">Authentication Required</h3>
                <p className="mb-4">
                  You need to be logged in to test this function. Please log in first and then return to this page.
                </p>
                <Button 
                  onClick={() => navigate('/login')}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
                >
                  Go to Login Page
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="mb-4">
                    This page tests the Supabase function that handles backing track requests. 
                    When you click the button below, it will create a new folder in Dropbox for the request.
                  </p>
                  <Button 
                    onClick={testFunction} 
                    disabled={isTesting}
                    className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white"
                  >
                    {isTesting ? 'Testing...' : 'Test Dropbox Folder Creation'}
                  </Button>
                </div>
                
                {result && (
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-2 text-[#1C0357]">Test Result</h3>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default TestFunction;