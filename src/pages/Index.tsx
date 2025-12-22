"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Coffee, 
  Youtube, 
  Instagram, 
  Facebook, 
  Mail, 
  Info, 
  Music, 
  CreditCard, 
  Phone, 
  ChevronRight, 
  Star,
  Zap,
  CheckCircle2,
  ArrowDown
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const Index = () => {
  return (
    <div className="min-h-screen bg-[#FDFCF7] selection:bg-[#D1AAF2] selection:text-[#1C0357]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#D1AAF2]/20 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1C0357]/5 text-[#1C0357] text-sm font-bold mb-6 border border-[#1C0357]/10">
              <Star className="w-4 h-4 fill-current" />
              <span>Trusted by MT Performers Worldwide</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-[#1C0357] mb-6 tracking-tight leading-tight">
              Professional Piano <br />
              <span className="text-[#F538BC]">Backing Tracks</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto font-medium">
              High-quality, expressive accompaniment for Musicals, Auditions & Performances.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/form-page">
                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-10 py-7 text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all group">
                  Order Custom Track
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" className="border-2 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/5 px-10 py-7 text-lg rounded-full font-bold">
                  Browse the Shop
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-20 animate-bounce pointer-events-none">
          <ArrowDown className="text-[#1C0357]" size={32} />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32 pb-32">
        
        {/* How It Works */}
        <motion.section {...fadeInUp} className="text-center">
          <h2 className="text-3xl md:text-4xl font-black text-[#1C0357] mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                step: "01", 
                title: "Submit Music", 
                desc: "Upload your PDF and references via our custom request form.",
                icon: Mail
              },
              { 
                step: "02", 
                title: "Get a Quote", 
                desc: "Receive a transparent price and delivery date within 24-48 hours.",
                icon: Zap
              },
              { 
                step: "03", 
                title: "Record & Deliver", 
                desc: "Daniele records your track and sends it directly to your dashboard.",
                icon: Music
              }
            ].map((item, i) => (
              <div key={i} className="relative p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-2xl bg-[#F538BC] text-white flex items-center justify-center font-black text-xl shadow-lg">
                  {item.step}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#D1AAF2]/20 flex items-center justify-center text-[#1C0357] mx-auto mb-6">
                  <item.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-[#1C0357] mb-3">{item.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Track Quality Options */}
        <motion.section {...fadeInUp} id="track-options">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-[#1C0357] mb-4">Track Quality Options</h2>
            <p className="text-gray-600 font-medium">Tailored levels of production to suit your needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="shadow-lg border-none bg-white rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
              <div className="h-2 bg-gray-200" />
              <CardHeader className="text-center pt-8">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-600">
                  <Mail size={24} />
                </div>
                <CardTitle className="text-2xl font-black text-[#1C0357]">Quick Reference</CardTitle>
                <CardDescription className="font-bold text-[#F538BC]">$5 - $10</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-10">
                <p className="mb-6">Fast voice memo for learning or audition notes. Capture the phrasing quickly.</p>
                <ul className="text-sm space-y-3 font-medium">
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-400" /> Phone/Mic Recording</li>
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-400" /> Same-day potential</li>
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-400" /> For practice only</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden scale-105 z-10 border-2 border-[#D1AAF2]">
              <div className="h-2 bg-[#D1AAF2]" />
              <CardHeader className="text-center pt-8">
                <div className="w-12 h-12 bg-[#D1AAF2]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#1C0357]">
                  <Headphones size={24} />
                </div>
                <CardTitle className="text-2xl font-black text-[#1C0357]">One-Take</CardTitle>
                <CardDescription className="font-bold text-[#F538BC]">$10 - $20</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-10">
                <p className="mb-6">Single-pass DAW recording with potential minor errors. Great for self-tapes.</p>
                <ul className="text-sm space-y-3 font-medium">
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#D1AAF2]" /> High Quality Audio</li>
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#D1AAF2]" /> Reverb & EQ</li>
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#D1AAF2]" /> Audition Ready</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none bg-white rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
              <div className="h-2 bg-[#1C0357]" />
              <CardHeader className="text-center pt-8">
                <div className="w-12 h-12 bg-[#1C0357]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#1C0357]">
                  <Sparkles size={24} />
                </div>
                <CardTitle className="text-2xl font-black text-[#1C0357]">Polished</CardTitle>
                <CardDescription className="font-bold text-[#F538BC]">$15 - $35</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-10">
                <p className="mb-6">Refined, accurate track with correct notes and rhythm. Ideal for performances.</p>
                <ul className="text-sm space-y-3 font-medium">
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#1C0357]" /> Note-Perfect</li>
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#1C0357]" /> Professional Finish</li>
                  <li className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#1C0357]" /> Lifetime Support</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section {...fadeInUp} id="about" className="relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#F1E14F]/10 blur-3xl rounded-full pointer-events-none" />
          <Card className="shadow-2xl bg-white/80 backdrop-blur-md border border-white/50 rounded-[40px] overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#1C0357] flex items-center justify-center text-white">
                    <Info size={24} />
                  </div>
                  <h2 className="text-3xl font-black text-[#1C0357]">About Daniele</h2>
                </div>
                <div className="space-y-6 text-lg text-gray-700 font-medium leading-relaxed">
                  <p>
                    Since 2020, I've been creating high-quality piano backing tracks for performers preparing for auditions and shows. What started as a passion project has evolved into a professional offering for the arts community.
                  </p>
                  <p className="p-4 bg-[#F1E14F]/10 rounded-2xl border-l-4 border-[#F1E14F] text-gray-600 italic text-base">
                    "Songs by Sondheim, Jason Robert Brown, or Adam Guettel carry a complexity adjustment due to the intricate nature of their scores."
                  </p>
                  <p>
                    This platform streamlines the ordering process and keeps all your requests in one place. Your feedback helps improve the service.
                  </p>
                </div>
              </div>
              <div className="bg-[#1C0357] p-12 flex flex-col justify-center text-white">
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                  <CreditCard className="text-[#F1E14F]" />
                  Secure Payment
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 size={16} className="text-[#F1E14F]" />
                    </div>
                    <div>
                      <p className="font-bold">Transparent Pricing</p>
                      <p className="text-white/70 text-sm">Pay before or after completion via secure links.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 size={16} className="text-[#F1E14F]" />
                    </div>
                    <div>
                      <p className="font-bold">Multiple Methods</p>
                      <p className="text-white/70 text-sm">Bank transfer or 'Buy Me a Coffee' supported.</p>
                    </div>
                  </div>
                  <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/10">
                    <p className="text-sm font-bold text-[#F1E14F] uppercase tracking-widest mb-2">Direct Deposit</p>
                    <p className="font-mono text-xl">BSB: 923100</p>
                    <p className="font-mono text-xl">ACC: 301110875</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Pricing Quick Look */}
        <motion.section {...fadeInUp} id="pricing" className="text-center">
          <h2 className="text-4xl font-black text-[#1C0357] mb-4">Pricing Quick Look</h2>
          <p className="text-gray-600 font-medium mb-12">Estimates based on standard musical theatre cuts.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "16 Bar Cut", desc: "30-45 seconds", price: "2-5 ☕" },
              { title: "32 Bar Cut", desc: "60-90 seconds", price: "3-6 ☕" },
              { title: "Full Song", desc: "Entire song", price: "4-8 ☕" }
            ].map((p, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <h3 className="text-xl font-bold text-[#1C0357] mb-2">{p.title}</h3>
                <p className="text-gray-400 text-sm mb-6 font-medium">{p.desc}</p>
                <div className="text-4xl font-black text-[#1C0357] group-hover:text-[#F538BC] transition-colors">{p.price}</div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <a href="https://www.buymeacoffee.com/danielebuatti" target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 h-14 rounded-full font-bold text-lg shadow-lg">
                <Coffee className="mr-2 h-5 w-5" /> Buy Me a Coffee
              </Button>
            </a>
          </div>
        </motion.section>

        {/* Connect Section */}
        <motion.section {...fadeInUp} id="connect">
          <div className="bg-[#1C0357] rounded-[48px] p-8 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-12 relative z-10">Connect & Share</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 relative z-10">
              <a href="https://www.youtube.com/@danielebuatti" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-white/10 hover:bg-white/20 rounded-[32px] transition-all border border-white/10 backdrop-blur-sm">
                <Youtube className="h-10 w-10 text-red-500 mb-4" />
                <span className="font-bold text-sm md:text-base">YouTube</span>
              </a>
              <a href="https://www.instagram.com/danielebuatti/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-white/10 hover:bg-white/20 rounded-[32px] transition-all border border-white/10 backdrop-blur-sm">
                <Instagram className="h-10 w-10 text-pink-400 mb-4" />
                <span className="font-bold text-sm md:text-base">Instagram</span>
              </a>
              <a href="https://www.facebook.com/danielebuattimusic" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-white/10 hover:bg-white/20 rounded-[32px] transition-all border border-white/10 backdrop-blur-sm">
                <Facebook className="h-10 w-10 text-blue-400 mb-4" />
                <span className="font-bold text-sm md:text-base">Facebook</span>
              </a>
              <a href="mailto:pianobackingsbydaniele@gmail.com" className="flex flex-col items-center p-6 bg-white/10 hover:bg-white/20 rounded-[32px] transition-all border border-white/10 backdrop-blur-sm">
                <Mail className="h-10 w-10 text-gray-300 mb-4" />
                <span className="font-bold text-sm md:text-base">Email</span>
              </a>
            </div>
          </div>
        </motion.section>

      </div>
      
      <MadeWithDyad />
    </div>
  );
};

// Re-using these icons for the cards
const Headphones = ({ size, className }: { size: number, className?: string }) => <Music size={size} className={className} />;
const Sparkles = ({ size, className }: { size: number, className?: string }) => <Zap size={size} className={className} />;

export default Index;