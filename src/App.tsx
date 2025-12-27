"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import FormPage from './pages/FormPage';
import UserDashboard from './pages/UserDashboard'; // Import the new UserDashboard
import Shop from './pages/Shop'; // Assuming a Shop page exists
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/form-page" element={<FormPage />} />
        <Route path="/user-dashboard" element={<UserDashboard />} /> {/* New route */}
        <Route path="/shop" element={<Shop />} /> {/* Assuming a Shop page exists */}
        {/* Add other routes here */}
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;