import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  starter: 'price_1TFyoHLTeLq64Ep1LOceRS1h',
  pro: 'price_1TFyonHTeLq64Ep1C4xT7eAT',
  elite: 'price_1TFypFHTeLq64Ep1M5ZHWo5A',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, customerEmail } = req.body || {};

    if (!plan || !PRICE_MAP[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const origin =
      req.headers.origin ||
      'https://the-six-seats-site.vercel.app';

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

    return res.status(200).json({
      clientSecret: session.client_secret,
    });
  } catch (error) {
    console.error('Stripe session error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create session',
    });
  }
}