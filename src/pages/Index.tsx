"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Youtube, 
  Instagram, 
  Facebook, 
  Mail, 
  Info, 
  Music, 
  CreditCard, 
  ChevronRight, 
  Star,
  Zap,
  CheckCircle2,
  ArrowDown,
  Sparkles,
  Headphones,
  Mic,
  Package,
  ShoppingCart,
  ClipboardList,
  Download
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: "easeOut" }
} as const;

const Index = () => {
  return (
    <div className="min-h-screen bg-[#FDFCF7] selection:bg-[#D1AAF2] selection:text-[#1C0357]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-36 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#D1AAF2]/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#1C0357]/5 text-[#1C0357] text-sm font-black mb-8 border border-[#1C0357]/10 shadow-sm">
              <Star className="w-4 h-4 fill-[#F538BC] text-[#F538BC]" />
              <span className="tracking-wide uppercase text-[10px]">Trusted by MT Performers Worldwide</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-[#1C0357] mb-8 tracking-tighter leading-[0.9]">
              Professional Piano <br />
              <span className="text-[#F538BC] relative">
                Backing Tracks
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="absolute -bottom-2 left-0 h-2 bg-[#F1E14F]/40 -z-10"
                />
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              High-quality, expressive accompaniment tailored for Musicals, Auditions & Performances.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/form-page">
                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-12 py-8 text-xl font-black rounded-2xl shadow-2xl hover:shadow-[#1C0357]/20 hover:-translate-y-1 active:translate-y-0 transition-all group">
                  Order Custom Track
                  <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" className="border-2 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/5 px-12 py-8 text-xl rounded-2xl font-black transition-all">
                  Browse the Shop
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-30 animate-bounce pointer-events-none">
          <ArrowDown className="text-[#1C0357]" size={40} />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-48 pb-48">
        
        {/* How it Works Section */}
        <motion.section {...fadeInUp} className="relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-6 tracking-tighter">How it Works</h2>
            <p className="text-xl text-gray-600 font-medium">Getting your professional track is simple.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#D1AAF2]/20 rounded-[32px] flex items-center justify-center text-[#1C0357] mb-8 shadow-inner">
                <ClipboardList size={36} />
              </div>
              <h3 className="text-2xl font-black text-[#1C0357] mb-4">1. Submit Request</h3>
              <p className="text-gray-600 font-medium">Fill out the form with your song details, sheet music, and any specific notes.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#F538BC]/10 rounded-[32px] flex items-center justify-center text-[#F538BC] mb-8 shadow-inner">
                <Music size={36} />
              </div>
              <h3 className="text-2xl font-black text-[#1C0357] mb-4">2. Daniele Records</h3>
              <p className="text-gray-600 font-medium">I'll record your track with professional equipment and expressive musicality.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#F1E14F]/20 rounded-[32px] flex items-center justify-center text-[#1C0357] mb-8 shadow-inner">
                <Download size={36} />
              </div>
              <h3 className="text-2xl font-black text-[#1C0357] mb-4">3. Download & Sing</h3>
              <p className="text-gray-600 font-medium">Receive your high-quality MP3 via your personal dashboard and email.</p>
            </div>
          </div>
        </motion.section>

        {/* Pricing Tiers */}
        <motion.section {...fadeInUp} id="pricing">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-6 tracking-tighter">Simple Pricing</h2>
            <p className="text-xl text-gray-600 font-medium">Choose the tier that fits your needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Card className="shadow-xl border-none bg-white rounded-[40px] overflow-hidden hover:scale-[1.02] transition-all duration-500">
              <div className="h-3 bg-gray-100" />
              <CardHeader className="text-center pt-12">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                  <Mic size={32} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Note Bash</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-lg mt-2">$15</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-12 px-8">
                <p className="mb-8 font-medium leading-relaxed">A simple, one-pass recording with the melody "bashed out". Functional and easy.</p>
                <ul className="space-y-4 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Melody Focused</li>
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Quick Reference</li>
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Not Performance Focused</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-none bg-white rounded-[40px] overflow-hidden scale-105 z-10 border-2 border-[#D1AAF2] ring-8 ring-[#D1AAF2]/10">
              <div className="h-3 bg-[#D1AAF2]" />
              <CardHeader className="text-center pt-12">
                <div className="w-16 h-16 bg-[#D1AAF2]/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#1C0357]">
                  <Headphones size={32} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Audition Ready</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-lg mt-2">$30</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-12 px-8">
                <p className="mb-8 font-medium leading-relaxed">A detailed, comprehensive recording of your 16 or 32 bar cut. Expressive and note-perfect.</p>
                <ul className="space-y-4 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Performance Quality</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Expressive Playing</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Perfect for Self-Tapes</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-none bg-white rounded-[40px] overflow-hidden hover:scale-[1.02] transition-all duration-500">
              <div className="h-3 bg-[#1C0357]" />
              <CardHeader className="text-center pt-12">
                <div className="w-16 h-16 bg-[#1C0357]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#1C0357]">
                  <Sparkles size={32} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Full Song</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-lg mt-2">$50</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-12 px-8">
                <p className="mb-8 font-medium leading-relaxed">A concert-level, comprehensive performance of the complete piece. Fully voiced.</p>
                <ul className="space-y-4 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Complete Piece</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Dynamic Shaping</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Performance Ready</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Season Pack Callout */}
          <motion.div {...fadeInUp} className="mt-16 max-w-4xl mx-auto">
            <div className="bg-[#1C0357] text-white rounded-[40px] p-10 md:p-16 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F538BC]/10 blur-[80px] rounded-full" />
              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="h-16 w-16 bg-[#F538BC] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Package size={32} />
                  </div>
                  <h3 className="text-4xl font-black mb-4 tracking-tight">Season Pack — $95</h3>
                  <p className="text-xl text-white/80 font-medium leading-relaxed mb-8">
                    Get 3 Audition Ready tracks and save $15. Perfect for showcase prep or busy audition seasons.
                  </p>
                  <Link to="/shop">
                    <Button className="bg-white text-[#1C0357] hover:bg-gray-100 font-black rounded-2xl px-10 py-6 text-lg shadow-xl">
                      <ShoppingCart className="mr-2" /> Buy Pack in Shop
                    </Button>
                  </Link>
                </div>
                <div className="bg-white/5 rounded-[32px] p-8 border border-white/10 backdrop-blur-md">
                  <h4 className="text-lg font-black mb-6 uppercase tracking-widest text-[#F538BC]">How to Redeem</h4>
                  <ul className="space-y-6">
                    <li className="flex items-start gap-4">
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-black flex-shrink-0">1</div>
                      <p className="text-white/90 font-medium">Purchase the Season Pack from the <Link to="/shop" className="text-[#F538BC] hover:underline">Shop</Link>.</p>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-black flex-shrink-0">2</div>
                      <p className="text-white/90 font-medium">Credits are automatically added to your account.</p>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-black flex-shrink-0">3</div>
                      <p className="text-white/90 font-medium">Redeem them on the <Link to="/form-page" className="text-[#F538BC] hover:underline">Request Form</Link> by toggling "Use Credit".</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* About Section */}
        <motion.section {...fadeInUp} id="about" className="relative">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#F1E14F]/10 blur-[120px] rounded-full pointer-events-none" />
          <Card className="shadow-2xl bg-white/90 backdrop-blur-xl border border-white/50 rounded-[60px] overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-16 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#1C0357] flex items-center justify-center text-white shadow-lg">
                    <Info size={28} />
                  </div>
                  <h2 className="text-4xl font-black text-[#1C0357] tracking-tighter">About Daniele</h2>
                </div>
                <div className="space-y-8 text-xl text-gray-700 font-medium leading-relaxed">
                  <p>
                    Since 2020, I've been creating high-quality piano backing tracks for performers preparing for auditions and shows. What started as a passion project has evolved into a professional offering for the arts community.
                  </p>
                  <div className="p-8 bg-[#F1E14F]/10 rounded-[32px] border-l-8 border-[#F1E14F] text-gray-600 italic text-lg shadow-inner">
                    "Dense scores by Sondheim, Jason Robert Brown, or Adam Guettel carry a complexity adjustment due to the intricate nature of their scores."
                  </div>
                </div>
              </div>
              <div className="bg-[#1C0357] p-16 flex flex-col justify-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#F538BC]/10 blur-[80px] rounded-full" />
                <h3 className="text-3xl font-black mb-10 flex items-center gap-4 relative z-10">
                  <CreditCard className="text-[#F1E14F] w-8 h-8" />
                  Optional Add-ons
                </h3>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="font-bold">Rush Order (24h)</span>
                    <span className="text-[#F1E14F] font-black">+$15</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="font-bold">Complex Score</span>
                    <span className="text-[#F1E14F] font-black">+$10</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <span className="font-bold">Exclusive Ownership</span>
                    <span className="text-[#F1E14F] font-black">+$40</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Connect Section */}
        <motion.section {...fadeInUp} id="connect">
          <div className="bg-[#1C0357] rounded-[60px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>
            <h2 className="text-4xl md:text-7xl font-black mb-16 relative z-10 tracking-tighter">Connect & Share</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 relative z-10">
              {[
                { icon: Youtube, label: "YouTube", color: "text-red-500", href: "https://www.youtube.com/@pianobackingsbydaniele" },
                { icon: Instagram, label: "Instagram", color: "text-pink-400", href: "https://www.instagram.com/pianobackingsbydaniele/" },
                { icon: Facebook, label: "Facebook", color: "text-blue-400", href: "https://www.facebook.com/PianoBackingsbyDaniele/" },
                { icon: Mail, label: "Email", color: "text-gray-300", href: "mailto:pianobackingsbydaniele@gmail.com" }
              ].map((social, i) => (
                <a 
                  key={i}
                  href={social.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex flex-col items-center p-8 bg-white/5 hover:bg-white/10 rounded-[40px] transition-all duration-300 border border-white/10 backdrop-blur-md group hover:-translate-y-2"
                >
                  <social.icon className={cn("h-12 w-12 mb-6 transition-transform group-hover:scale-110", social.color)} />
                  <span className="font-black text-sm md:text-base tracking-widest uppercase">{social.label}</span>
                </a>
              ))}
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
};

export default Index;