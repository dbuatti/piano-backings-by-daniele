import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, LinkIcon, Coffee, Music, Users, Mail, DollarSign, Clock, Headphones } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#F1E14F]/20">
      <Header />
      
      {/* Hero Section */}
      <section id="hero" className="bg-white/80 text-center py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-[#1C0357]">Piano Backings By Daniele</h1>
          <p className="text-xl md:text-2xl font-light text-[#1C0357]/90 mb-8">Professional Piano Backing Tracks for Auditions</p>
          <div className="mt-8">
            <Link to="/form-page">
              <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white text-lg px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow">
                Order Your Track Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6">
        {/* Introduction Section */}
        <section id="about" className="mb-16">
          <Card className="shadow-lg border-t-4 border-[#F538BC]">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <Music className="mr-2 text-[#F538BC]" />
                Welcome to Piano Backings by Daniele
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-700">
                Established towards the end of 2020, Piano Backings by Daniele is a small venture aimed at assisting artists as they prepare for auditions. 
                I initially offered a "pay as you feel" system, but as the business evolved, I transitioned to set prices for each track to streamline the process.
              </p>
              
              <div className="bg-[#F538BC]/10 border-l-4 border-[#F538BC] p-4 mb-6 rounded-r-lg">
                <p className="font-semibold text-[#1C0357]">
                  Please be aware that songs from Stephen Sondheim, Jason Robert Brown, or Adam Guettel may require a price adjustment, 
                  as these pieces generally necessitate additional time and effort to craft the perfect backing track.
                </p>
              </div>
              
              <p className="mb-4 text-gray-700">
                This newly created page is designed to provide all necessary information in one place. I greatly value your feedback and am constantly 
                striving to make the information more accessible and comprehensible. Feel free to drop me an email with any suggestions!
              </p>
              
              <p className="text-gray-700">
                Piano Backings by Daniele isn't a full-time pursuit. There might be periods when I'm unable to accept new projects. 
                During these times, I ask for your understanding and patience. I promise to keep you updated about my availability and any busy periods 
                where I may be unable to undertake new tasks.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Services Section */}
        <section id="services" className="mb-16">
          <Card className="shadow-lg border-t-4 border-[#F538BC]">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <Headphones className="mr-2 text-[#F538BC]" />
                Recording Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-10 h-10 flex items-center justify-center mr-3 mb-4">
                    1
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-[#1C0357]">Quick Reference (Voice Memo)</h3>
                  <p className="text-gray-700">
                    A fast and rough voice memo ideal for quick learning or audition notes, not suited for professional use.
                  </p>
                </div>
                
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-10 h-10 flex items-center justify-center mr-3 mb-4">
                    2
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-[#1C0357]">One-Take Recording</h3>
                  <p className="text-gray-700">
                    A single-pass, good-quality DAW recording with potential minor errors, suitable for self-tapes and quick references.
                  </p>
                </div>
                
                <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-10 h-10 flex items-center justify-center mr-3 mb-4">
                    3
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-[#1C0357]">Polished & Accurate Backing</h3>
                  <p className="text-gray-700">
                    A refined, accurate track with correct notes and rhythm, ideal for auditions, performances, and dedicated practice.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mb-16">
          <Card className="shadow-lg border-t-4 border-[#F538BC]">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <DollarSign className="mr-2 text-[#F538BC]" />
                Pricing Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-bold text-[#1C0357] mb-3">2-5 ☕</div>
                  <h3 className="font-bold text-xl mb-3">16 Bar Cut</h3>
                  <p className="text-gray-600">(roughly 30-45 seconds)</p>
                </div>
                
                <div className="border rounded-lg p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-bold text-[#1C0357] mb-3">3-6 ☕</div>
                  <h3 className="font-bold text-xl mb-3">32 Bar Cut</h3>
                  <p className="text-gray-600">(roughly 60-90 seconds)</p>
                </div>
                
                <div className="border rounded-lg p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-bold text-[#1C0357] mb-3">4-8 ☕</div>
                  <h3 className="font-bold text-xl mb-3">Full Song</h3>
                  <p className="text-gray-600">(entire song)</p>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-[#D1AAF2]/20 rounded-lg border border-[#D1AAF2]">
                <h3 className="font-bold text-lg mb-3 text-[#1C0357]">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <Clock className="mr-2 mt-1 text-[#F538BC]" />
                    <p><strong>Payment Timing:</strong> You can choose to pay before or after the completion of the track.</p>
                  </div>
                  <div className="flex items-start">
                    <Mail className="mr-2 mt-1 text-[#F538BC]" />
                    <p><strong>Delivery Timeline:</strong> You can expect to receive your track on the date specified in the form.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Payment & Contact Section */}
        <section id="contact" className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-lg border-t-4 border-[#F538BC]">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                  <LinkIcon className="mr-2 text-[#F538BC]" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li>
                    <a href="https://buymeacoffee.com/danielebuatti" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline flex items-center">
                      <Coffee className="mr-3 h-5 w-5 text-[#F538BC]" /> ☕ Buy Me a Coffee
                    </a>
                  </li>
                  <li className="flex items-start">
                    <Banknote className="mr-3 h-5 w-5 text-[#F538BC] mt-0.5" />
                    <div>
                      <span className="font-medium">Bank Transfer:</span>
                      <p className="text-sm text-gray-600">BSB: 923100 | Account: 301110875</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-t-4 border-[#F538BC]">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                  <Users className="mr-2 text-[#F538BC]" />
                  Follow & Connect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Youtube className="mr-3 h-5 w-5 text-[#F538BC]" />
                    <span>YouTube: Piano Backings</span>
                  </li>
                  <li className="flex items-center">
                    <Instagram className="mr-3 h-5 w-5 text-[#F538BC]" />
                    <span>Instagram: @pianobackingsbydaniele</span>
                  </li>
                  <li className="flex items-center">
                    <Mail className="mr-3 h-5 w-5 text-[#F538BC]" />
                    <span>Email: pianobackingsbydaniele@gmail.com</span>
                  </li>
                  <li className="flex items-center">
                    <Facebook className="mr-3 h-5 w-5 text-[#F538BC]" />
                    <span>Facebook: Piano Backings</span>
                  </li>
                </ul>
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="flex items-center">
                    <Lightbulb className="mr-2 h-5 w-5 text-[#F538BC]" />
                    For more information:{" "}
                    <a href="https://www.danielebuatti.com/piano-backings" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline ml-1">
                      www.danielebuatti.com/piano-backings
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Scanning Tips */}
        <section id="tips" className="mb-16">
          <Card className="shadow-lg border-t-4 border-[#F538BC]">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <FileTextIcon className="mr-2 text-[#F538BC]" />
                Scanning Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                For a concise guide on scanning your music, please <a href="https://www.danielebuatti.com/post/scanning-applications" className="text-[#1C0357] hover:underline font-medium">click here</a>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Support Section */}
        <section id="support" className="mb-16">
          <Card className="shadow-lg border-t-4 border-[#F538BC]">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <Coffee className="mr-2 text-[#F538BC]" />
                Support My Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                If you find my piano backing tracks helpful for your auditions and practice, consider supporting my work. Your support helps me continue creating quality backing tracks for the performing arts community.
              </p>
              <a 
                href="https://buymeacoffee.com/Danielebuatti" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white rounded-full px-6 py-3">
                  ☕ Buy Me a Coffee
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>

        {/* Closing */}
        <section className="text-center mb-12">
          <Card className="shadow-lg bg-[#D1AAF2]/20 border-t-4 border-[#F538BC]">
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

// Importing additional icons
import { Banknote, Youtube, Instagram, Facebook, Lightbulb } from "lucide-react";

export default Index;