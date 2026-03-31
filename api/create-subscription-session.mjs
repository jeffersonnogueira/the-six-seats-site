import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  starter: 'price_1TFyoHLTeLq64Ep1LOceRS1h',
  pro: 'price_1TFyonHTeLq64Ep1C4xT7eAT',
  elite: 'price_1TFypFHTeLq64Ep1M5ZHWo5A',
};

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const body = await request.json();
      const { plan, customerEmail } = body || {};

      if (!plan || !PRICE_MAP[plan]) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const origin = request.headers.get('origin') || 'https://the-six-seats-site.vercel.app';

      const session = await stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        mode: 'subscription',
        line_items: [
          {
            price: PRICE_MAP[plan],
            quantity: 1,
          },
        ],
        customer_email: customerEmail || undefined,
        return_url: `${origin}/subscriptions.html?session_id={CHECKOUT_SESSION_ID}`,
      });

      return new Response(
        JSON.stringify({ clientSecret: session.client_secret }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Stripe session error:', error);

      return new Response(
        JSON.stringify({
          error: error.message || 'Failed to create session',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};