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
  errors?: Record<string, string>;
}

const ContactDetailsForm: React.FC<ContactDetailsFormProps> = ({
  name,
  email,
  confirmEmail,
  onChange,
  isUserLoggedIn,
  errors
}) => {
  const err = (k: string) => errors?.[k];
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
            placeholder="Your Name"
            required
            aria-required="true"
            aria-invalid={!!err('name')}
            aria-describedby={err('name') ? 'name-error' : undefined}
            className={err('name') ? 'border-red-300 bg-red-50' : ''}
          />
          {err('name') && <p id="name-error" className="text-red-500 text-xs font-bold">{err('name')}</p>}
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
            aria-required="true"
            aria-invalid={!!err('email')}
            aria-describedby={err('email') ? 'email-error' : undefined}
            className={err('email') ? 'border-red-300 bg-red-50' : ''}
          />
          {err('email') && <p id="email-error" className="text-red-500 text-xs font-bold">{err('email')}</p>}
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
              aria-required="true"
              aria-invalid={!!err('confirmEmail')}
              aria-describedby={err('confirmEmail') ? 'confirmEmail-error' : undefined}
              className={err('confirmEmail') ? 'border-red-300 bg-red-50' : ''}
            />
            {err('confirmEmail') && <p id="confirmEmail-error" className="text-red-500 text-xs font-bold">{err('confirmEmail')}</p>}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContactDetailsForm;