const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const APP_URL = (process.env.APP_URL || 'https://thesixseats.com').replace(/\/$/, '');

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  elite: process.env.STRIPE_PRICE_ELITE,
};

function normalizePlanInput(plan) {
  const raw = String(plan || '').trim().toLowerCase();

  if (raw === 'starter' || raw === 'starter access') return 'starter';
  if (raw === 'pro' || raw === 'pro aaron access') return 'pro';
  if (raw === 'elite' || raw === 'elite institutional access') return 'elite';

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan } = req.body || {};
    const normalizedPlan = normalizePlanInput(plan);

    if (!normalizedPlan) {
      return res.status(400).json({ error: 'Invalid plan.' });
    }

    const priceId = PRICE_IDS[normalizedPlan];

    if (!priceId) {
      return res.status(500).json({ error: `Missing Stripe price ID for plan: ${normalizedPlan}` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'embedded',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      return_url: `${APP_URL}/subscriptions.html?session_id={CHECKOUT_SESSION_ID}`,
      redirect_on_completion: 'if_required',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        plan: normalizedPlan,
        source: 'the-six-seats-site',
      },
      subscription_data: {
        metadata: {
          plan: normalizedPlan,
          source: 'the-six-seats-site',
        },
      },
    });

    return res.status(200).json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('create-subscription-session error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to create checkout session.',
    });
  }
};
