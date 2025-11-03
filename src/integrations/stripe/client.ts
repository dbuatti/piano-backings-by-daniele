/// <reference types="vite/client" />
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Ensure VITE_STRIPE_PUBLISHABLE_KEY is set in your .env file
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe will not function correctly.');
}

export const stripePromise: Promise<Stripe | null> | null = stripePublishableKey ? loadStripe(stripePublishableKey) : null;