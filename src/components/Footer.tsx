"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Music, 
  Mail, 
  Phone, 
  ExternalLink, 
  Instagram, 
  Youtube, 
  Facebook, 
  Globe, 
  Heart, 
  Cpu,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Backing Tracks",
      links: [
        { label: "Order Custom Track", path: "/form-page" },
        { label: "Browse the Shop", path: "/shop" },
        { label: "My Tracks", path: "/user-dashboard" },
        { label: "Pricing Matrix", path: "/#pricing" },
      ]
    },
    {
      title: "Professional Services",
      links: [
        { label: "Vocal Coaching", href: "https://www.danielebuatti.com/coaching", icon: Music },
        { label: "Resonance Kinesiology", href: "https://resonance-kinesiology.vercel.app", icon: Heart },
        { label: "Digital Architecture", href: "https://db-it.vercel.app", icon: Cpu },
        { label: "Live Piano & Vocals", href: "https://www.danielebuatti.com", icon: Music },
      ]
    }
  ];

  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/danielebuatti/", label: "Instagram" },
    { icon: Youtube, href: "https://www.youtube.com/@danielebuatti", label: "YouTube" },
    { icon: Facebook, href: "https://www.facebook.com/danielebuattimusic", label: "Facebook" },
  ];

  return (
    <footer className="bg-[#1C0357] text-white pt-20 pb-10 overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#F538BC]/5 blur-[100px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="inline-block">
              <img 
                src="/pasted-image-2025-09-19T05-15-20-729Z.png" 
                alt="Daniele Buatti Logo" 
                className="h-16 w-auto rounded-xl shadow-lg border border-white/10"
              />
            </Link>
            <div className="space-y-4">
              <h3 className="text-xl font-black tracking-tight">Daniele Buatti</h3>
              <p className="text-white/60 text-sm font-medium leading-relaxed">
                Pianist • Vocal Coach • Music Director • Embodiment Practitioner. 
                Helping performers connect body, breath, and voice for authentic expression.
              </p>
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a 
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#F538BC] transition-all duration-300 group"
                    aria-label={social.label}
                  >
                    <social.icon size={18} className="group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Columns */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F538BC]">
                {section.title}
              </h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.path ? (
                      <Link 
                        to={link.path} 
                        className="text-white/70 hover:text-white text-sm font-bold flex items-center group transition-colors"
                      >
                        <ChevronRight size={14} className="mr-2 text-[#F538BC] opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                        {link.label}
                      </Link>
                    ) : (
                      <a 
                        href={link.href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white/70 hover:text-white text-sm font-bold flex items-center group transition-colors"
                      >
                        {link.icon && <link.icon size={14} className="mr-2 text-white/30 group-hover:text-[#F538BC] transition-colors" />}
                        {link.label}
                        <ExternalLink size={10} className="ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Column */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F538BC]">
              Get In Touch
            </h4>
            <div className="space-y-4">
              <a 
                href="mailto:info@danielebuatti.com" 
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-[#F538BC]/20 flex items-center justify-center text-[#F538BC]">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Email</p>
                  <p className="text-sm font-bold">info@danielebuatti.com</p>
                </div>
              </a>
              <a 
                href="tel:+61424174067" 
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-[#F1E14F]/20 flex items-center justify-center text-[#F1E14F]">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Phone</p>
                  <p className="text-sm font-bold">+61 424 174 067</p>
                </div>
              </a>
              <a 
                href="https://www.danielebuatti.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-[#D1AAF2]/20 flex items-center justify-center text-[#D1AAF2]">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Main Website</p>
                  <p className="text-sm font-bold">danielebuatti.com</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        <Separator className="bg-white/10 mb-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
          <p>© {currentYear} Daniele Buatti. All rights reserved.</p>
          <div className="flex gap-8">
            <Link to="/shop" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/shop" className="hover:text-white transition-colors">Privacy Policy</Link>
            <a href="https://db-it.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              Built by DB Digital <ExternalLink size={8} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;