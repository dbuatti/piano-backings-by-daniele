"use client";

import React from 'react';
import Header from '@/components/Header';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Seo from '@/components/Seo';

const UserDashboard = () => {
  return (
    <div className="min-h-screen bg-[#FDFCF7] flex flex-col">
      <Seo 
        title="User Dashboard"
        description="Manage your custom backing track requests and orders."
      />
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-[#1C0357] mb-4">
          Welcome to Your <span className="text-[#F538BC]">Dashboard</span>
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md">
          This is where you'll manage your custom backing track requests and view your order history.
        </p>
        <Button asChild className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white px-8 py-6 text-lg rounded-full shadow-lg">
          <Link to="/form-page">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back to Form
          </Link>
        </Button>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default UserDashboard;