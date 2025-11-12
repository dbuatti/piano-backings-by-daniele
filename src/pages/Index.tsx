import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, LinkIcon, Coffee, Music, Users, Mail, DollarSign, Headphones, Instagram, Facebook, Youtube, UserCheck, Lock, Eye, Edit, Plane, Loader2, Mic, Sparkles } from "lucide-react"; // Import Mic and Sparkles
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHolidayMode } from '@/hooks/useHolidayMode'; // Import useHolidayMode
import { format } from 'date-fns';
import Seo from "@/components/Seo"; // Import Seo component

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { isHolidayModeActive, holidayReturnDate, isLoading: isLoadingHolidayMode } = useHolidayMode(); // Use the hook

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoadingAuth(false);
    };

    checkAuthStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const orderButtonContent = isHolidayModeActive ? (
    <span className="flex items-center">
      <Plane className="mr-2 h-5 w-5" />
      Holiday Mode Active
    </span>
  ) : (
    <span className="flex items-center">
      <Music className="mr-2 h-5 w-5" />
      Order Custom Track
    </span>
  );

  const holidayMessage = holidayReturnDate
    ? `We're on holiday until ${format(holidayReturnDate, 'MMMM d, yyyy')}.`
    : `We're currently on holiday.`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo 
        title="Piano Backings by Daniele - Custom Tracks for Musicals, Auditions & Performances"
        description="Get high-quality custom piano backing tracks for musicals, auditions, and performances. Order personalized tracks or browse our shop for instant downloads."
        keywords="piano backing tracks, musical theatre, audition tracks, custom piano tracks, Daniele Buatti, performance tracks, sheet music, vocal ranges"
        ogImage="/pasted-image-2025-09-19T05-15-20-729Z.png"
        canonicalUrl={window.location.origin}
      />
      <Header />
      
      {/* Hero Section */}
      <section id="hero" className="bg-white/50 text-center py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-[#1C0357]">Professional Piano Backing Tracks</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90 mb-8">For Musicals, Auditions & Performances</p>
          
          <Link to="/form-page">
            <Button 
              className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-8 py-3"
              disabled={isHolidayModeActive || isLoadingHolidayMode} // Keep disabled while loading holiday mode
            >
              {isLoadingHolidayMode ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
                </>
              ) : (
                orderButtonContent
              )}
            </Button>
          </Link>

          {isHolidayModeActive && (
            <p className="mt-4 text-red-600 font-semibold text-lg">
              {holidayMessage} New orders will be processed upon our return.
            </p>
          )}
        </div>
      </section>

      {/* Why Create an Account Section - NEW (Conditional) */}
      {!session && !loadingAuth && (
        <section className="py-12 px-4 sm:px-6 bg-[#1C0357] text-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 flex items-center justify-center">
              <UserCheck className="mr-3" />
              Why Create an Account?
            </h2>
            <p className="text-xl mb-10 max-w-3xl mx-auto">
              Unlock the full potential of your Piano Backings experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Eye className="h-12 w-12 mb-4 text-[#F538BC]" />
                  <h3 className="text-xl font-bold mb-2">Track Your Orders</h3>
                  <p>View the status of all your requests in one convenient dashboard.</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Lock className="h-12 w-12 mb-4 text-[#F538BC]" />
                  <h3 className="text-xl font-bold mb-2">Secure Access</h3>
                  <p>Download your tracks anytime, from any device, with a secure login.</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Edit className="h-12 w-12 mb-4 text-[#F538BC]" />
                  <h3 className="text-xl font-bold mb-2">Manage Requests</h3>
                  <p>Easily review and update your order details after submission.</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="bg-white text-[#1C0357] hover:bg-gray-200 text-lg px-8 py-3">
                  Create Your Free Account
                </Button>
              </Link>
              <Link to="/form-page#request-guidelines">
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="bg-transparent border border-white text-white hover:bg-white/10 text-lg px-8 py-3"
                  disabled={isHolidayModeActive} // Disable if holiday mode is active
                >
                  Order Track Anonymously
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6">
        {/* Introduction Section */}
        <section id="about" className="mb-16 pt-20 -mt-20">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">About Piano Backings by Daniele</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Since 2020, I've been creating high-quality piano backing tracks for performers preparing for auditions and shows. 
                What started as a "pay what you feel" service has evolved into a professional offering with transparent pricing.
              </p>
              
              <div className="bg-[#F538BC]/10 border-l-4 border-[#F538BC] p-4 mb-6">
                <p className="font-semibold text-[#1C0357]">
                  Note: Songs by Stephen Sondheim, Jason Robert Brown, or Adam Guettel may require additional time and carry a price adjustment due to their complexity.
                </p>
              </div>
              
              <p>
                This platform streamlines the ordering process and keeps all your requests in one place. 
                Your feedback helps improve the service—feel free to reach out with suggestions.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Services Section */}
        <section id="services" className="mb-16 pt-20 -mt-20">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Track Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow text-center">
                  <Mic className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Quick Reference</h3>
                  <p className="text-sm">
                    Fast voice memo for learning or audition notes. Not suitable for professional use.
                  </p>
                </div>
                
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow text-center">
                  <Headphones className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">One-Take Recording</h3>
                  <p className="text-sm">
                    Single-pass DAW recording with potential minor errors. Suitable for self-tapes and quick references.
                  </p>
                </div>
                
                <div className="border rounded-lg p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <Sparkles className="h-10 w-10 text-[#F538BC] mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Polished Backing</h3>
                  <p className="text-sm">
                    Refined, accurate track with correct notes and rhythm. Ideal for auditions, performances, and dedicated practice.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mb-16 pt-20 -mt-20">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-[#1C0357] mb-3">2-5 ☕</div>
                  <h3 className="font-bold text-lg mb-2">16 Bar Cut</h3>
                  <p className="text-sm">(roughly 30-45 seconds)</p>
                </div>
                
                <div className="border rounded-lg p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-[#1C0357] mb-3">3-6 ☕</div>
                  <h3 className="font-bold text-lg mb-2">32 Bar Cut</h3>
                  <p className="text-sm">(roughly 60-90 seconds)</p>
                </div>
                
                <div className="border rounded-lg p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-[#1C0357] mb-3">4-8 ☕</div>
                  <h3 className="font-bold text-lg mb-2">Full Song</h3>
                  <p className="text-sm">(entire song)</p>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-[#D1AAF2]/30 rounded-lg">
                <h3 className="font-bold text-lg mb-3">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2"><strong>Timing:</strong> Pay before or after completion</p>
                    <p><strong>Delivery:</strong> On the date specified in your order</p>
                  </div>
                  <div>
                    <p className="mb-2"><strong>Methods:</strong> Bank transfer or Buy Me a Coffee</p>
                    <p><strong>Bank Details:</strong> BSB: 923100 | Account: 301110875</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact Section */}
        <section id="contact" className="mb-16 pt-20 -mt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357]">Connect</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Youtube className="mr-3 h-5 w-5 text-red-600" />
                    <a href="https://www.youtube.com/channel/UCVJkC6aGbh2gIeZvd2tmcIg" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline">
                      YouTube Channel
                    </a>
                  </li>
                  <li className="flex items-center">
                    <Instagram className="mr-3 h-5 w-5 text-pink-500" />
                    <a href="https://www.instagram.com/pianobackingsbydaniele/" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline">
                      Instagram
                    </a>
                  </li>
                  <li className="flex items-center">
                    <Facebook className="mr-3 h-5 w-5 text-blue-600" />
                    <a href="https://www.facebook.com/PianoBackingsbyDaniele" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline">
                      Facebook Page
                    </a>
                  </li>
                  <li className="flex items-center">
                    <Mail className="mr-3 h-5 w-5" />
                    <span><a href="mailto:pianobackingsbydaniele@gmail.com" className="text-[#1C0357] hover:underline">pianobackingsbydaniele@gmail.com</a></span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357]">Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Your support helps me continue creating quality backing tracks for the performing arts community.
                </p>
                <a 
                  href="https://buymeacoffee.com/Danielebuatti" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white">
                    ☕ Buy Me a Coffee
                  </Button>
                </a>
                <div className="mt-6 pt-4 border-t">
                  <p>
                    For more information:{" "}
                    <a href="https://www.danielebuatti.com/piano-backings" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline">
                      www.danielebuatti.com/piano-backings
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Closing */}
        <section className="text-center mb-12 pt-20 -mt-20">
          <Card className="shadow-lg bg-[#D1AAF2] border-0">
            <CardContent className="py-8">
              <p className="text-xl text-[#1C0357] font-medium">
                Thank you for choosing Piano Backings by Daniele. I look forward to crafting your perfect backing track!
              </p>
            </CardContent>
          </Card>
        </section>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;