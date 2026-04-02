"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  ArrowDown,
  Sparkles,
  Headphones
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
        
        {/* How It Works */}
        <motion.section {...fadeInUp} className="text-center">
          <h2 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-16 tracking-tighter">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { 
                step: "01", 
                title: "Submit Music", 
                desc: "Upload your PDF and references via our custom request form.",
                icon: Mail,
                color: "bg-[#D1AAF2]/20"
              },
              { 
                step: "02", 
                title: "Get a Quote", 
                desc: "Receive a transparent price and delivery date within 24-48 hours.",
                icon: Zap,
                color: "bg-[#F1E14F]/20"
              },
              { 
                step: "03", 
                title: "Record & Deliver", 
                desc: "Daniele records your track and sends it directly to your dashboard.",
                icon: Music,
                color: "bg-[#F538BC]/10"
              }
            ].map((item, i) => (
              <div key={i} className="relative p-10 rounded-[40px] bg-white border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 group">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-[#1C0357] text-white flex items-center justify-center font-black text-xl shadow-xl group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-[#1C0357] mx-auto mb-8 transition-transform group-hover:rotate-6", item.color)}>
                  <item.icon size={36} />
                </div>
                <h3 className="text-2xl font-black text-[#1C0357] mb-4">{item.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Track Quality Options */}
        <motion.section {...fadeInUp} id="track-options">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-6 tracking-tighter">Track Quality Options</h2>
            <p className="text-xl text-gray-600 font-medium">Tailored levels of production to suit your specific needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Card className="shadow-xl border-none bg-white rounded-[40px] overflow-hidden hover:scale-[1.02] transition-all duration-500">
              <div className="h-3 bg-gray-100" />
              <CardHeader className="text-center pt-12">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                  <Mail size={32} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Quick Reference</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-lg mt-2">$5 - $10</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-12 px-8">
                <p className="mb-8 font-medium leading-relaxed">Fast voice memo for learning or audition notes. Capture the phrasing quickly.</p>
                <ul className="space-y-4 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Phone/Mic Recording</li>
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> Same-day potential</li>
                  <li className="flex items-center justify-center gap-3 text-gray-400"><CheckCircle2 className="w-5 h-5" /> For practice only</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-none bg-white rounded-[40px] overflow-hidden scale-105 z-10 border-2 border-[#D1AAF2] ring-8 ring-[#D1AAF2]/10">
              <div className="h-3 bg-[#D1AAF2]" />
              <CardHeader className="text-center pt-12">
                <div className="w-16 h-16 bg-[#D1AAF2]/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#1C0357]">
                  <Headphones size={32} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">One-Take</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-lg mt-2">$10 - $20</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-12 px-8">
                <p className="mb-8 font-medium leading-relaxed">Single-pass DAW recording with potential minor errors. Great for self-tapes.</p>
                <ul className="space-y-4 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> High Quality Audio</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Reverb & EQ</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5 text-[#D1AAF2]" /> Audition Ready</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-none bg-white rounded-[40px] overflow-hidden hover:scale-[1.02] transition-all duration-500">
              <div className="h-3 bg-[#1C0357]" />
              <CardHeader className="text-center pt-12">
                <div className="w-16 h-16 bg-[#1C0357]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#1C0357]">
                  <Sparkles size={32} />
                </div>
                <CardTitle className="text-3xl font-black text-[#1C0357]">Full Production</CardTitle>
                <CardDescription className="font-black text-[#F538BC] text-lg mt-2">$15 - $35</CardDescription>
              </CardHeader>
              <CardContent className="text-center text-gray-600 pb-12 px-8">
                <p className="mb-8 font-medium leading-relaxed">A premium pianistic upgrade focusing on intricate voicing, expressive dynamics, and professional shaping.</p>
                <ul className="space-y-4 font-bold text-sm">
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Note-Perfect</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Expressive Voicing</li>
                  <li className="flex items-center justify-center gap-3 text-[#1C0357]"><CheckCircle2 className="w-5 h-5" /> Professional Shaping</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-gray-400 text-xs mt-12 font-bold uppercase tracking-widest">Note: All tracks are solo piano recordings. No additional instruments are included.</p>
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
                    "Songs by Sondheim, Jason Robert Brown, or Adam Guettel carry a complexity adjustment due to the intricate nature of their scores."
                  </div>
                  <p>
                    This platform streamlines the ordering process and keeps all your requests in one place. Your feedback helps improve the service.
                  </p>
                </div>
              </div>
              <div className="bg-[#1C0357] p-16 flex flex-col justify-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#F538BC]/10 blur-[80px] rounded-full" />
                <h3 className="text-3xl font-black mb-10 flex items-center gap-4 relative z-10">
                  <CreditCard className="text-[#F1E14F] w-8 h-8" />
                  Secure Payment
                </h3>
                <div className="space-y-8 relative z-10">
                  <div className="flex items-start gap-5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 size={20} className="text-[#F1E14F]" />
                    </div>
                    <div>
                      <p className="text-lg font-black">Transparent Pricing</p>
                      <p className="text-white/60 font-medium">Pay before or after completion via secure links.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 size={20} className="text-[#F1E14F]" />
                    </div>
                    <div>
                      <p className="text-lg font-black">Multiple Methods</p>
                      <p className="text-white/60 font-medium">Bank transfer or 'Buy Me a Coffee' supported.</p>
                    </div>
                  </div>
                  <div className="mt-12 p-8 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-sm shadow-inner">
                    <p className="text-xs font-black text-[#F1E14F] uppercase tracking-[0.3em] mb-4">Direct Deposit</p>
                    <div className="space-y-2">
                      <p className="font-mono text-2xl tracking-wider">BSB: 923100</p>
                      <p className="font-mono text-2xl tracking-wider">ACC: 301110875</p>
                    </div>
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
                { icon: Youtube, label: "YouTube", color: "text-red-500", href: "https://www.youtube.com/@danielebuatti" },
                { icon: Instagram, label: "Instagram", color: "text-pink-400", href: "https://www.instagram.com/danielebuatti/" },
                { icon: Facebook, label: "Facebook", color: "text-blue-400", href: "https://www.facebook.com/danielebuattimusic" },
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
      
      <MadeWithDyad />
    </div>
  );
};

export default Index;