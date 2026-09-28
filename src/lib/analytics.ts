import { track } from '@vercel/analytics';

type Props = Record<string, string | number | boolean | null>;

/**
 * Conversion events for Vercel Web Analytics (Analytics → Events). Custom events
 * need a Vercel Pro or Enterprise plan; on Hobby the calls are simply ignored.
 *   buy_click       a Buy / Add to cart / Order button was pressed (where, what)
 *   checkout_start  the cart went to Stripe checkout
 *   order_submitted the custom order form was submitted successfully
 */
export const trackConversion = (event: 'buy_click' | 'checkout_start' | 'order_submitted', props: Props = {}) => {
  try {
    track(event, props);
  } catch {
    // Analytics must never break a purchase.
  }
};
