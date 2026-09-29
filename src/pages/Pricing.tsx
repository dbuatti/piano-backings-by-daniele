"use client";

import React from 'react';
import Header from "@/components/Header";
import Seo from "@/components/Seo";
import seoPages from "@/lib/seo-pages.json";
import PricingMatrix from "@/components/PricingMatrix";
import { motion } from 'framer-motion';
import { CONTACT_EMAIL } from "@/lib/site";

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-[#FDFCF7]">
      <Seo 
        title={seoPages['/pricing'].title}
        description={seoPages['/pricing'].description}
      />
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-black text-[#1C0357] mb-4 tracking-tighter">
            Transparent <span className="text-[#F538BC]">Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto">
            Simple, fair pricing based on the level of detail and length of the track you need.
          </p>
        </motion.div>

        <PricingMatrix />
        
        <div className="mt-16 text-center text-gray-500 text-sm font-medium">
          <p>All prices are in Australian Dollars (AUD).</p>
          <p className="mt-2">Need something unique? <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#F538BC] hover:underline">Contact me</a> for a custom quote.</p>
        </div>
      </main>
    </div>
  );
};

export default PricingPage;