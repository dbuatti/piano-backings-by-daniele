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
      <section className="relative pt-32 pb-40 px-4 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#D1AAF2]/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#F538BC]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#F1E14F]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#1C0357]/5 text-[#1C0357] text-sm font-black mb-10 border border-[#1C0357]/10 shadow-sm backdrop-blur-sm"
            >
              <Star className="w-4 h-4 fill-[#F538BC] text-[#F538BC]" />
              <span className="tracking-wide uppercase text-[10px]">Trusted by MT Performers Worldwide</span>
            </motion.div>

            <h1 className="text-6xl md:text-9xl font-black text-[#1C0357] mb-10 tracking-tighter leading-[0.85]">
              Professional Piano <br />
              <span className="text-[#F538BC] relative inline-block">
                Backing Tracks
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.8, duration: 1.2, ease: "circOut" }}
                  className="absolute -bottom-2 left-0 h-3 bg-[#F1E14F]/40 -z-10 rounded-full"
                />
              </span>
            </h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-xl md:text-2xl text-gray-600 mb-14 max-w-2xl mx-auto font-medium leading-relaxed"
            >
              High-quality, expressive accompaniment tailored for Musicals, Auditions & Performances.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <Link to="/form-page">
                <Button className="bg-[#1C0357] hover:bg-[#2D0B8C] text-white px-12 py-8 text-xl font-black rounded-2xl shadow-2xl hover:shadow-[#1C0357]/30 hover:-translate-y-1 active:translate-y-0 transition-all group">
                  Order Custom Track
                  <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" className="border-2 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/5 px-12 py-8 text-xl rounded-2xl font-black transition-all">
                  Browse the Shop
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce pointer-events-none"
        >
          <ArrowDown className="text-[#1C0357]" size={32} />
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-48 pb-48">
        
        {/* How it Works Section */}
        <motion.section {...fadeInUp} className="relative">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-6 tracking-tighter">How it Works</h2>
            <p className="text-xl text-gray-600 font-medium">Getting your professional track is simple.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-[#D1AAF2]/20 rounded-[36px] flex items-center justify-center text-[#1C0357] mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <ClipboardList size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#1C0357] mb-4">1. Submit Request</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Fill out the form with your song details, sheet music, and any specific notes.</p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-[#F538BC]/10 rounded-[36px] flex items-center justify-center text-[#F538BC] mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Music size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#1C0357] mb-4">2. Daniele Records</h3>
              <p className="text-gray-600 font-medium leading-relaxed">I'll record your track with professional equipment and expressive musicality.</p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-[#F1E14F]/20 rounded-[36px] flex items-center justify-center text-[#1C0357] mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Download size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#1C0357] mb-4">3. Download & Sing</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Receive your high-quality MP3 via your personal dashboard and email.</p>
            </div>
          </div>
        </motion.section>

        {/* Pricing Tiers */}
        <motion.section {...fadeInUp} id="pricing">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-6 tracking-tighter">Simple Pricing</h2>
            <p className="text-xl text-gray-600 font-medium">Choose the tier that fits your needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Card className="shadow-xl border-none bg-white rounded-[48px] overflow-hidden hover:shadow-2xl transition-all duration-500">
              <div className="h-3 bg-gray-100" />
              <CardHeader className="text-center pt-14">
                <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-gray-400">
                  <Mic size={36} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Note Bash</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-xl mt-2">$15</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-14 px-10">
                <p className="mb-10 font-medium leading-relaxed">A simple, one-pass recording with the melody "bashed out". Functional and easy.</p>
                <ul className="space-y-5 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Melody Focused</li>
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Quick Reference</li>
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Not for Performance</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-none bg-white rounded-[48px] overflow-hidden scale-105 z-10 border-2 border-[#D1AAF2] ring-[12px] ring-[#D1AAF2]/10">
              <div className="h-3 bg-[#D1AAF2]" />
              <CardHeader className="text-center pt-14">
                <div className="w-20 h-20 bg-[#D1AAF2]/20 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-[#1C0357]">
                  <Headphones size={36} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Audition Ready</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-xl mt-2">$30</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-14 px-10">
                <p className="mb-10 font-medium leading-relaxed">A detailed, comprehensive recording of your 16 or 32 bar cut. Expressive and note-perfect.</p>
                <ul className="space-y-5 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Performance Quality</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Expressive Playing</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Perfect for Self-Tapes</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-none bg-white rounded-[48px] overflow-hidden hover:shadow-2xl transition-all duration-500">
              <div className="h-3 bg-[#1C0357]" />
              <CardHeader className="text-center pt-14">
                <div className="w-20 h-20 bg-[#1C0357]/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-[#1C0357]">
                  <Sparkles size={36} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Full Song</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-xl mt-2">$50</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-14 px-10">
                <p className="mb-10 font-medium leading-relaxed">A concert-level, comprehensive performance of the complete piece. Fully voiced.</p>
                <ul className="space-y-5 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Complete Piece</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Dynamic Shaping</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Performance Ready</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Season Pack Callout */}
          <motion.div {...fadeInUp} className="mt-24 max-w-5xl mx-auto">
            <div className="bg-[#1C0357] text-white rounded-[60px] p-12 md:p-20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#F538BC]/10 blur-[100px] rounded-full -mr-48 -mt-48" />
              <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="h-20 w-20 bg-[#F538BC] rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                    <Package size={40} />
                  </div>
                  <h3 className="text-5xl font-black mb-6 tracking-tight">Season Pack — $75</h3>
                  <p className="text-xl text-white/80 font-medium leading-relaxed mb-10">
                    Get 3 Audition Ready tracks and save $15. Perfect for showcase prep or busy audition seasons.
                  </p>
                  <Link to="/shop">
                    <Button className="bg-white text-[#1C0357] hover:bg-gray-100 font-black rounded-2xl px-12 py-7 text-xl shadow-xl transition-transform active:scale-95">
                      <ShoppingCart className="mr-3" /> Buy Pack in Shop
                    </Button>
                  </Link>
                </div>
                <div className="bg-white/5 rounded-[40px] p-10 border border-white/10 backdrop-blur-md">
                  <h4 className="text-sm font-black mb-8 uppercase tracking-[0.2em] text-[#F538BC]">How to Redeem</h4>
                  <ul className="space-y-8">
                    <li className="flex items-start gap-5">
                      <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-black flex-shrink-0">1</div>
                      <p className="text-white/90 font-medium text-lg">Purchase the Season Pack from the <Link to="/shop" className="text-[#F538BC] hover:underline">Shop</Link>.</p>
                    </li>
                    <li className="flex items-start gap-5">
                      <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-black flex-shrink-0">2</div>
                      <p className="text-white/90 font-medium text-lg">Credits are automatically added to your account.</p>
                    </li>
                    <li className="flex items-start gap-5">
                      <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-black flex-shrink-0">3</div>
                      <p className="text-white/90 font-medium text-lg">Redeem them on the <Link to="/form-page" className="text-[#F538BC] hover:underline">Request Form</Link> by toggling "Use Credit".</p>
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
          <Card className="shadow-2xl bg-white/90 backdrop-blur-xl border border-white/50 rounded-[64px] overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-16 md:p-24 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-16 h-16 rounded-3xl bg-[#1C0357] flex items-center justify-center text-white shadow-lg">
                    <Info size={32} />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-[#1C0357] tracking-tighter">About Daniele</h2>
                </div>
                <div className="space-y-10 text-xl text-gray-700 font-medium leading-relaxed">
                  <p>
                    Since 2020, I've been creating high-quality piano backing tracks for performers preparing for auditions and shows. What started as a passion project has evolved into a professional offering for the arts community.
                  </p>
                  <div className="p-10 bg-[#F1E14F]/10 rounded-[40px] border-l-[12px] border-[#F1E14F] text-gray-600 italic text-xl shadow-inner">
                    "Dense scores by Sondheim, Jason Robert Brown, or Adam Guettel carry a complexity adjustment due to the intricate nature of their scores."
                  </div>
                </div>
              </div>
              <div className="bg-[#1C0357] p-16 md:p-24 flex flex-col justify-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#F538BC]/10 blur-[100px] rounded-full" />
                <h3 className="text-3xl font-black mb-12 flex items-center gap-4 relative z-10">
                  <CreditCard className="text-[#F1E14F] w-10 h-10" />
                  Optional Add-ons
                </h3>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                    <span className="text-lg font-bold">Rush Order (24h)</span>
                    <span className="text-[#F1E14F] font-black text-xl">+$15</span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                    <span className="text-lg font-bold">Complex Score</span>
                    <span className="text-[#F1E14F] font-black text-xl">+$10</span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                    <span className="text-lg font-bold">Exclusive Ownership</span>
                    <span className="text-[#F1E14F] font-black text-xl">+$40</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Connect Section */}
        <motion.section {...fadeInUp} id="connect">
          <div className="bg-[#1C0357] rounded-[64px] p-16 md:p-32 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>
            <h2 className="text-5xl md:text-8xl font-black mb-20 relative z-10 tracking-tighter">Connect & Share</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 relative z-10">
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
                  className="flex flex-col items-center p-10 bg-white/5 hover:bg-white/10 rounded-[48px] transition-all duration-500 border border-white/10 backdrop-blur-md group hover:-translate-y-3"
                >
                  <social.icon className={cn("h-14 w-14 mb-8 transition-transform group-hover:scale-110", social.color)} />
                  <span className="font-black text-sm md:text-base tracking-[0.2em] uppercase">{social.label}</span>
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