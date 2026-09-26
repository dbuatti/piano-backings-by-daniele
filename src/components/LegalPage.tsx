import React from 'react';
import { Link } from 'react-router-dom';
import Header from "@/components/Header";
import Seo from "@/components/Seo";

export const LEGAL_LAST_UPDATED = '26 September 2026';
export const CONTACT_EMAIL = 'info@danielebuatti.com';

interface LegalPageProps {
  title: string;
  seoTitle: string;
  description: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}

export const LegalSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl md:text-2xl font-black text-[#1C0357] mb-4 tracking-tight">{title}</h2>
    <div className="space-y-4 text-gray-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-[#1C0357] [&_a]:font-bold [&_a]:underline">
      {children}
    </div>
  </section>
);

const LegalPage = ({ title, seoTitle, description, intro, children }: LegalPageProps) => (
  <div className="min-h-screen bg-[#FDFCF7]">
    <Seo title={seoTitle} description={description} />
    <Header />
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24">
      <p className="text-xs font-black uppercase tracking-widest text-[#F538BC] mb-3">
        Last updated {LEGAL_LAST_UPDATED}
      </p>
      <h1 className="text-4xl md:text-5xl font-black text-[#1C0357] mb-6 tracking-tighter">{title}</h1>
      <div className="text-lg text-gray-600 font-medium mb-12 leading-relaxed">{intro}</div>
      {children}
      <div className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500 flex flex-wrap gap-x-6 gap-y-2">
        <Link to="/terms" className="font-bold text-[#1C0357] hover:underline">Terms of Service</Link>
        <Link to="/privacy" className="font-bold text-[#1C0357] hover:underline">Privacy Policy</Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#1C0357] hover:underline">{CONTACT_EMAIL}</a>
      </div>
    </main>
  </div>
);

export default LegalPage;
