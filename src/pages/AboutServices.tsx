"use client";

import React from 'react';
import Header from "@/components/Header";
import Seo from "@/components/Seo";
import { motion } from 'framer-motion';
import { 
  Music, 
  CheckCircle2, 
  Info, 
  Mic, 
  Headphones, 
  Sparkles, 
  Clock, 
  HelpCircle,
  ChevronRight,
  Heart,
  Cpu,
  Star,
  Download,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const AboutServices = () => {
  return (
    <div className="min-h-screen bg-[#FDFCF7]">
      <Seo 
        title="About & Services | Piano Backings by Daniele"
        description="Learn more about Daniele Buatti and the professional piano backing track services offered."
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-24"
        >
          <Badge className="mb-6 bg-[#D1AAF2]/20 text-[#1C0357] border-[#D1AAF2] px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
            Professional Musical Services
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black text-[#1C0357] mb-6 tracking-tighter">
            More Than Just <br />
            <span className="text-[#F538BC]">Backing Tracks</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed">
            High-quality, expressive accompaniment tailored for Musicals, Auditions & Performances, 
            backed by over 12 years of experience in the industry.
          </p>
        </motion.div>

        {/* About Daniele Section */}
        <section className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <motion.div {...fadeInUp}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#1C0357] text-white mb-8 shadow-lg">
              <Star className="w-4 h-4 fill-[#F1E14F] text-[#F1E14F]" />
              <span className="text-xs font-black uppercase tracking-widest">Meet Daniele</span>
            </div>
            <h2 className="text-4xl font-black text-[#1C0357] mb-6 tracking-tight">Pianist, Coach & Music Director</h2>
            <div className="space-y-6 text-lg text-gray-700 font-medium leading-relaxed">
              <p>
                I help singers, performers, and speakers connect body, breath, and voice for authentic and easeful expression. 
                With over 12 years as a music director, pianist, and vocal coach, I combine musical theatre expertise with kinesiology and somatic practices.
              </p>
              <p>
                Since 2020, I've been creating high-quality piano backing tracks for performers preparing for auditions and shows. 
                What started as a passion project has evolved into a professional offering for the arts community worldwide.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="https://www.danielebuatti.com" target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 rounded-xl px-8 py-6 font-black">
                  Visit Main Website <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </motion.div>
          <motion.div 
            {...fadeInUp}
            className="relative"
          >
            <div className="aspect-square rounded-[60px] bg-[#1C0357] overflow-hidden shadow-2xl rotate-3 group">
              <img 
                src="/daniele-profile.png" 
                alt="Daniele Buatti - Pianist & Music Director"
                className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C0357]/40 to-transparent" />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-white p-8 rounded-[40px] shadow-xl max-w-xs -rotate-3 border border-gray-100">
              <p className="text-[#1C0357] font-black italic text-lg leading-tight">
                "Daniele is an exceptional teacher, leader, and encourager..."
              </p>
              <p className="text-gray-400 text-xs font-bold mt-4 uppercase tracking-widest">— Colleague</p>
            </div>
          </motion.div>
        </section>

        {/* Detailed Tier Breakdown */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#1C0357] mb-4 tracking-tight">Understanding the Tiers</h2>
            <p className="text-gray-600 font-medium">Choose the level of detail that matches your needs.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: 'note-bash',
                icon: Mic,
                title: 'Note Bash',
                price: '$15',
                desc: 'A simple, one-pass recording with the melody "bashed out".',
                features: ['Melody focused', 'Quick learning tool', 'Functional reference', 'Not for performance'],
                color: 'gray'
              },
              {
                id: 'audition-ready',
                icon: Headphones,
                title: 'Audition Ready',
                price: '$30',
                desc: 'A detailed, comprehensive recording of your 16 or 32 bar cut.',
                features: ['Performance quality', 'Expressive playing', 'Perfect for self-tapes', 'Note-perfect accuracy'],
                color: 'purple',
                featured: true
              },
              {
                id: 'full-song',
                icon: Sparkles,
                title: 'Full Song',
                price: '$50',
                desc: 'A concert-level, comprehensive performance of the complete piece.',
                features: ['Complete piece', 'Dynamic shaping', 'Performance ready', 'Fully voiced'],
                color: 'pink'
              }
            ].map((tier) => (
              <Card key={tier.id} className={cn(
                "rounded-[40px] border-none shadow-xl overflow-hidden transition-all duration-500 hover:-translate-y-2",
                tier.featured ? "ring-4 ring-[#D1AAF2] scale-105 z-10" : "bg-white"
              )}>
                <div className={cn(
                  "h-3",
                  tier.color === 'purple' ? "bg-[#D1AAF2]" : tier.color === 'pink' ? "bg-[#F538BC]" : "bg-gray-200"
                )} />
                <CardHeader className="text-center pt-10">
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6",
                    tier.color === 'purple' ? "bg-[#D1AAF2]/20 text-[#1C0357]" : tier.color === 'pink' ? "bg-[#F538BC]/10 text-[#F538BC]" : "bg-gray-50 text-gray-400"
                  )}>
                    <tier.icon size={32} />
                  </div>
                  <CardTitle className="text-2xl font-black text-[#1C0357]">{tier.title}</CardTitle>
                  <p className="text-2xl font-black text-[#F538BC] mt-2">{tier.price}</p>
                </CardHeader>
                <CardContent className="px-8 pb-10">
                  <p className="text-center text-gray-600 font-medium mb-8 leading-relaxed">
                    {tier.desc}
                  </p>
                  <ul className="space-y-4">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-500">
                        <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", tier.featured ? "text-[#D1AAF2]" : "text-gray-200")} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Other Services Grid */}
        <section className="mb-32">
          <div className="bg-[#1C0357] rounded-[60px] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#F538BC]/10 blur-[100px] rounded-full -mr-48 -mt-48" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black mb-12 tracking-tighter">Professional Ecosystem</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                  <div className="h-14 w-14 rounded-2xl bg-[#F538BC] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    <Music size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-4">Vocal Coaching</h3>
                  <p className="text-white/60 font-medium mb-6">Technique, repertoire, theory, and audition prep for expressive performance.</p>
                  <a href="https://www.danielebuatti.com/coaching" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[#F538BC] font-black uppercase tracking-widest text-xs hover:underline">
                    Learn More <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>

                <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                  <div className="h-14 w-14 rounded-2xl bg-[#D1AAF2] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform text-[#1C0357]">
                    <Heart size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-4">Kinesiology</h3>
                  <p className="text-white/60 font-medium mb-6">Somatic support and nervous system regulation to release tension and support resonance.</p>
                  <a href="https://resonance-kinesiology.vercel.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[#D1AAF2] font-black uppercase tracking-widest text-xs hover:underline">
                    Explore Somatics <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>

                <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                  <div className="h-14 w-14 rounded-2xl bg-[#F1E14F] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform text-[#1C0357]">
                    <Cpu size={28} />
                  </div>
                  <h3 className="text-2xl font-black mb-4">Digital Architecture</h3>
                  <p className="text-white/60 font-medium mb-6">Setting up calm, secure, and reliable digital systems for high-stakes professionals.</p>
                  <a href="https://db-it.vercel.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[#F1E14F] font-black uppercase tracking-widest text-xs hover:underline">
                    View IT Services <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto mb-32">
          <div className="text-center mb-16">
            <div className="h-16 w-16 bg-[#F1E14F]/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#1C0357]">
              <HelpCircle size={32} />
            </div>
            <h2 className="text-4xl font-black text-[#1C0357] mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-gray-600 font-medium">Everything you need to know about the process.</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                q: "How long does it take to receive my track?",
                a: "Standard delivery is typically within 3-5 business days. If you're in a hurry, you can select the 'Rush Order' add-on for guaranteed 24-hour delivery."
              },
              {
                q: "Can I request a transposition (different key)?",
                a: "Absolutely! You can specify the original key and your requested key on the order form. I'm happy to provide the track in whatever key suits your voice best."
              },
              {
                q: "What file format will I receive?",
                a: "All tracks are delivered as high-quality MP3 files (320kbps). If you require a WAV file for a specific performance, just let me know in the special requests."
              },
              {
                q: "What if I need a small adjustment after delivery?",
                a: "I want you to be 100% happy with your track. Small adjustments to tempo or dynamics are included. Just reply to your delivery email and I'll take care of it."
              },
              {
                q: "How do I pay for my track?",
                a: "You can pay via Stripe (Credit/Debit Card) directly on the site, or use 'Buy Me a Coffee' or Direct Bank Transfer. Details are provided on your personal track dashboard."
              }
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-none bg-white rounded-3xl px-8 shadow-sm">
                <AccordionTrigger className="text-lg font-black text-[#1C0357] hover:no-underline py-6">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 font-medium pb-6 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-br from-[#D1AAF2] to-[#F538BC] p-1 rounded-[50px] inline-block shadow-2xl">
            <div className="bg-white rounded-[46px] px-12 py-16 md:px-24">
              <h2 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-8 tracking-tighter">Ready to sing?</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/form-page">
                  <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-12 py-8 text-xl font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all">
                    Order Custom Track
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button variant="outline" className="border-2 border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/5 px-12 py-8 text-xl rounded-2xl font-black transition-all">
                    Browse the Shop
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AboutServices;