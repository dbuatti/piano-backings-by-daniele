"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon } from 'lucide-react';

interface ContactDetailsFormProps {
  name: string;
  email: string;
  confirmEmail: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUserLoggedIn: boolean;
}

const ContactDetailsForm: React.FC<ContactDetailsFormProps> = ({
  name,
  email,
  confirmEmail,
  onChange,
  isUserLoggedIn
}) => {
  return (
    <Card className="rounded-3xl p-8">
      <h2 className="text-xl font-bold text-[#1C0357] mb-6 flex items-center gap-2">
        <UserIcon size={20} /> Contact Details
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name"
            name="name" 
            value={name} 
            onChange={onChange} 
            disabled={isUserLoggedIn} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email"
            name="email" 
            type="email" 
            value={email} 
            onChange={onChange} 
            disabled={isUserLoggedIn} 
            required 
          />
        </div>
        {!isUserLoggedIn && (
          <div className="space-y-2">
            <Label htmlFor="confirmEmail">Confirm Email</Label>
            <Input 
              id="confirmEmail"
              name="confirmEmail" 
              type="email" 
              value={confirmEmail} 
              onChange={onChange} 
              required 
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContactDetailsForm;