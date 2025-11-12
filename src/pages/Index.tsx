import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
// Seo is no longer needed here for social media meta tags, as they are in index.html
// import Seo from "@/components/Seo"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coffee, Youtube, Instagram, Facebook, Mail, Info, Music, DollarSign, CreditCard, Phone } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      {/* Seo component removed for home page social media meta tags, now handled in public/index.html */}
      <Header />
      <main className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center">
        <h1 className="text-5xl font-bold text-[#1C0357] mb-6">
          Professional Piano Backing Tracks
        </h1>
        <p className="text-xl text-[#1C0357]/90 mb-8 max-w-2xl">
          For Musicals, Auditions & Performances
        </p>
        <div className="space-x-4">
          <Link to="/form-page">
            <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3 text-lg">
              Order Custom Track
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" className="border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/10 px-8 py-3 text-lg">
              Browse Shop Tracks
            </Button>
          </Link>
        </div>
      </main>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
        {/* About Section */}
        <section id="about" className="text-center">
          <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-[#1C0357] flex items-center justify-center">
                <Info className="mr-2 h-7 w-7" />
                About Piano Backings by Daniele
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg text-gray-700 space-y-4">
              <p>
                Since 2020, I've been creating high-quality piano backing tracks for performers preparing for auditions and shows. What started as a "pay what you feel" service has evolved into a professional offering with transparent pricing.
              </p>
              <p className="italic text-gray-600">
                Note: Songs by Stephen Sondheim, Jason Robert Brown, or Adam Guettel may require additional time and carry a price adjustment due to their complexity.
              </p>
              <p>
                This platform streamlines the ordering process and keeps all your requests in one place. Your feedback helps improve the service—feel free to reach out with suggestions.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Track Options Section */}
        <section id="track-options">
          <h2 className="text-4xl font-bold text-[#1C0357] text-center mb-8">Track Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-6 w-6" />
                  Quick Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                Fast voice memo for learning or audition notes. Not suitable for professional use.
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-6 w-6" />
                  One-Take Recording
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                Single-pass DAW recording with potential minor errors. Suitable for self-tapes and quick references.
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357] flex items-center">
                  <Music className="mr-2 h-6 w-6" />
                  Polished Backing
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                Refined, accurate track with correct notes and rhythm. Ideal for auditions, performances, and dedicated practice.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing">
          <h2 className="text-4xl font-bold text-[#1C0357] text-center mb-8">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-lg bg-white/80 backdrop-blur-sm text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357]">16 Bar Cut</CardTitle>
                <CardDescription className="text-gray-600">(roughly 30-45 seconds)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-[#1C0357]">2-5 ☕</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-white/80 backdrop-blur-sm text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357]">32 Bar Cut</CardTitle>
                <CardDescription className="text-gray-600">(roughly 60-90 seconds)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-[#1C0357]">3-6 ☕</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-white/80 backdrop-blur-sm text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1C0357]">Full Song</CardTitle>
                <CardDescription className="text-gray-600">(entire song)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-[#1C0357]">4-8 ☕</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Payment Information Section */}
        <section id="payment">
          <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-[#1C0357] flex items-center justify-center">
                <CreditCard className="mr-2 h-7 w-7" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg text-gray-700 space-y-4">
              <p><span className="font-semibold">Timing:</span> Pay before or after completion</p>
              <p><span className="font-semibold">Delivery:</span> On the date specified in your order</p>
              <p><span className="font-semibold">Methods:</span> Bank transfer or Buy Me a Coffee</p>
              <p><span className="font-semibold">Bank Details:</span> BSB: 923100 | Account: 301110875</p>
            </CardContent>
          </Card>
        </section>

        {/* Connect Section */}
        <section id="connect">
          <h2 className="text-4xl font-bold text-[#1C0357] text-center mb-8">Connect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="https://www.youtube.com/@danielebuatti" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Youtube className="h-12 w-12 text-red-600 mb-3" />
              <span className="text-lg font-semibold text-[#1C0357]">YouTube Channel</span>
            </a>
            <a href="https://www.instagram.com/danielebuatti/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Instagram className="h-12 w-12 text-pink-600 mb-3" />
              <span className="text-lg font-semibold text-[#1C0357]">Instagram</span>
            </a>
            <a href="https://www.facebook.com/danielebuattimusic" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Facebook className="h-12 w-12 text-blue-600 mb-3" />
              <span className="text-lg font-semibold text-[#1C0357]">Facebook Page</span>
            </a>
            <a href="mailto:pianobackingsbydaniele@gmail.com" className="flex flex-col items-center p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Mail className="h-12 w-12 text-gray-700 mb-3" />
              <span className="text-lg font-semibold text-[#1C0357]">Email</span>
            </a>
          </div>
        </section>

        {/* Support Section */}
        <section id="support" className="text-center">
          <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-[#1C0357] flex items-center justify-center">
                <Phone className="mr-2 h-7 w-7" />
                Support
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg text-gray-700 space-y-4">
              <p>
                Your support helps me continue creating quality backing tracks for the performing arts community.
              </p>
              <a href="https://www.buymeacoffee.com/danielebuatti" target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3 text-lg">
                  <Coffee className="mr-2 h-5 w-5" /> Buy Me a Coffee
                </Button>
              </a>
              <p className="pt-4">
                For more information: <a href="https://www.danielebuatti.com/piano-backings" target="_blank" rel="noopener noreferrer" className="text-[#1C0357] hover:underline">www.danielebuatti.com/piano-backings</a>
              </p>
              <p className="font-semibold text-[#1C0357]">
                Thank you for choosing Piano Backings by Daniele. I look forward to crafting your perfect backing track!
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;