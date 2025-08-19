import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, MusicIcon, LinkIcon, Coffee } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import NavigationMenu from "@/components/NavigationMenu";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      {/* Header Section - Using brand colors */}
      <header className="bg-[#1C0357] text-white py-8 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          {/* Placeholder for potential piano image or decorative element */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/public/placeholder.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          
          <div className="relative z-10 flex-grow text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-2 tracking-tight">Piano Backings By Daniele</h1>
            <p className="text-xl md:text-2xl font-light opacity-90">Professional Piano Backing Tracks for Auditions</p>
          </div>
          
          <div className="relative z-10 flex items-center space-x-2">
            <NavigationMenu />
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="text-white hover:text-[#F538BC] font-medium transition-colors">
                Home
              </Link>
              <Link to="/form-page" className="text-white hover:text-[#F538BC] font-medium transition-colors">
                Request Form
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        {/* Introduction Section */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Welcome to Piano Backings by Daniele</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Established towards the end of 2020, Piano Backings by Daniele is a small venture aimed at assisting artists as they prepare for auditions. 
                I initially offered a "pay as you feel" system, but as the business evolved, I transitioned to set prices for each track to streamline the process.
              </p>
              
              <div className="bg-[#F538BC]/10 border-l-4 border-[#F538BC] p-4 mb-6">
                <p className="font-semibold text-[#1C0357]">
                  Please be aware that songs from Stephen Sondheim, Jason Robert Brown, or Adam Guettel may require a price adjustment, 
                  as these pieces generally necessitate additional time and effort to craft the perfect backing track.
                </p>
              </div>
              
              <p className="mb-4">
                This newly created page is designed to provide all necessary information in one place. I greatly value your feedback and am constantly 
                striving to make the information more accessible and comprehensible. Feel free to drop me an email with any suggestions!
              </p>
              
              <p>
                Piano Backings by Daniele isn't a full-time pursuit. There might be periods when I'm unable to accept new projects. 
                During these times, I ask for your understanding and patience. I promise to keep you updated about my availability and any busy periods 
                where I may be unable to undertake new tasks.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Payment & Pricing Section */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <LinkIcon className="mr-2" />
                Payment & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">📌 Payment Methods</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://buymeacoffee.com/danielebuatti" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline flex items-center">
                        <Coffee className="mr-2 h-5 w-5" /> ☕ Buy Me a Coffee
                      </a>
                    </li>
                    <li>
                      <span className="font-medium">Bank Transfer:</span> BSB: 923100 | Account: 301110875
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">🔗 Follow & Connect</h3>
                  <ul className="space-y-1">
                    <li>📺 YouTube: Piano Backings</li>
                    <li>📸 Instagram: @pianobackingsbydaniele</li>
                    <li>📧 Email: pianobackingsbydaniele@gmail.com</li>
                    <li>📘 Facebook: Piano Backings</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p>
                  💡 For more information:{" "}
                  <a href="https://www.danielebuatti.com/piano-backings" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline">
                    www.danielebuatti.com/piano-backings
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recording Types Section */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">RECORDING TYPES</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold">Quick Reference (Voice Memo)</span> – A fast and rough voice memo ideal for quick learning or audition notes, not suited for professional use.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold">One-Take Recording</span> – A single-pass, good-quality DAW recording with potential minor errors, suitable for self-tapes and quick references.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-[#D1AAF2] text-[#1C0357] font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1 flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold">Polished & Accurate Backing</span> – A refined, accurate track with correct notes and rhythm, ideal for auditions, performances, and dedicated practice.
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Scanning Tips */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                <FileTextIcon className="mr-2" />
                Scanning Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                For a concise guide on scanning your music, please <a href="https://www.danielebuatti.com/post/scanning-applications" className="text-[#1C0357] hover:underline font-medium">click here</a>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Support Section */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Support My Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                If you find my piano backing tracks helpful for your auditions and practice, consider supporting my work. Your support helps me continue creating quality backing tracks for the performing arts community.
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
            </CardContent>
          </Card>
        </section>

        {/* Pricing Structure */}
        <section className="mb-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-[#1C0357]">Pricing Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  <span className="text-[#1C0357] font-bold mr-2">•</span>
                  <span><strong>2-5 Coffees:</strong> 16 Bar Cut (roughly 30-45 seconds)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1C0357] font-bold mr-2">•</span>
                  <span><strong>3-6 Coffees:</strong> 32 Bar Cut (roughly 60-90 seconds)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1C0357] font-bold mr-2">•</span>
                  <span><strong>4-8 Coffees:</strong> Full Song</span>
                </li>
              </ul>
              
              <p className="mb-2"><strong>Payment Timing:</strong> You can choose to pay before or after the completion of the track.</p>
              <p><strong>Delivery Timeline:</strong> You can expect to receive your track on the date specified in the form.</p>
            </CardContent>
          </Card>
        </section>

        {/* Closing */}
        <section className="text-center mb-12">
          <Card className="shadow-lg bg-[#D1AAF2]">
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