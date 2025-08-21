import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, LinkIcon, Coffee, Music, Users, Mail, DollarSign, Headphones, Instagram, Facebook, Youtube, Chrome } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/form-page`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Header />
      
      {/* Hero Section */}
      <section id="hero" className="bg-white/50 text-center py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-[#1C0357]">Professional Piano Backing Tracks</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90 mb-8">For Musicals, Auditions & Performances</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/form-page">
              <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-8 py-3">
                Order Custom Track
              </Button>
            </Link>
            <Button 
              onClick={handleGoogleSignIn}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-3 flex items-center justify-center"
            >
              <Chrome className="mr-2 h-5 w-5 text-blue-500" />
              Sign in with Google
            </Button>
          </div>
        </div>
      </section>

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
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-8 h-8 flex items-center justify-center mr-3 mb-4">
                    1
                  </div>
                  <h3 className="font-bold text-lg mb-3">Quick Reference</h3>
                  <p className="text-sm">
                    Fast voice memo for learning or audition notes. Not suitable for professional use.
                  </p>
                </div>
                
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-8 h-8 flex items-center justify-center mr-3 mb-4">
                    2
                  </div>
                  <h3 className="font-bold text-lg mb-3">One-Take Recording</h3>
                  <p className="text-sm">
                    Single-pass DAW recording with potential minor errors. Suitable for self-tapes and quick references.
                  </p>
                </div>
                
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-8 h-8 flex items-center justify-center mr-3 mb-4">
                    3
                  </div>
                  <h3 className="font-bold text-lg mb-3">Polished Backing</h3>
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