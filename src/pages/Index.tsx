import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { MadeWithDyad } from "@/components/made-with-dyad";
import Seo from "@/components/Seo"; // Import the Seo component

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#D1AAF2] to-[#F1E14F]/30">
      <Seo
        title="Home | Piano Backings by Daniele"
        description="Get custom piano backing tracks for your auditions, performances, or practice sessions. High-quality, personalized musical accompaniment tailored to your needs."
        // Specific image for home page
        ogImage={`${window.location.origin}/images/social-share-home.jpg`} 
        ogType="website"
        twitterCard="summary_large_image"
      />
      <Header />
      <main className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center">
        <h1 className="text-5xl font-bold text-[#1C0357] mb-6">
          Your Perfect Piano Backing Track
        </h1>
        <p className="text-xl text-[#1C0357]/90 mb-8 max-w-2xl">
          Get custom-made piano accompaniments tailored for your auditions, performances, or practice sessions.
        </p>
        <div className="space-x-4">
          <Link to="/form-page">
            <Button className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-3 text-lg">
              Order Your Custom Track
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" className="border-[#1C0357] text-[#1C0357] hover:bg-[#1C0357]/10 px-8 py-3 text-lg">
              Browse Shop Tracks
            </Button>
          </Link>
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Index;