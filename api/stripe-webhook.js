const Stripe = require('stripe');
const { getApps, getApp, initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'aaron-access';
const ACCESS_COLLECTION = 'aaron_access';

function getFirebaseApp() {
  if (getApps().length) return getApp();

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

function getDb() {
  return getFirestore(getFirebaseApp(), FIRESTORE_DATABASE_ID);
}

function getPlanFromPriceId(priceId) {
  if (!priceId) return null;

  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'Starter Access';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'Pro AARON Access';
  if (priceId === process.env.STRIPE_PRICE_ELITE) return 'Elite Institutional Access';

  return null;
}

function getPlanFromMetadata(plan) {
  const raw = String(plan || '').trim().toLowerCase();

  if (raw === 'starter' || raw === 'starter access') return 'Starter Access';
  if (raw === 'pro' || raw === 'pro aaron access') return 'Pro AARON Access';
  if (raw === 'elite' || raw === 'elite institutional access') return 'Elite Institutional Access';
  if (raw === 'founder' || raw === 'founder access') return 'Founder Access';

  return null;
}

function buildAccessByPlan(plan, subscriptionStatus = 'active') {
  const normalizedPlan = String(plan || 'No active subscription');

  if (normalizedPlan === 'Starter Access') {
    return {
      plan: normalizedPlan,
      subscriptionStatus,
      dashboardAccess: true,
      panelAccess: false,
      workspace: 'Starter Workspace',
    };
  }

  if (
    normalizedPlan === 'Pro AARON Access' ||
    normalizedPlan === 'Elite Institutional Access' ||
    normalizedPlan === 'Founder Access' ||
    normalizedPlan === 'Complimentary Pro Access'
  ) {
    return {
      plan: normalizedPlan,
      subscriptionStatus,
      dashboardAccess: true,
      panelAccess: true,
      workspace: 'Private AARON Workspace',
    };
  }

  return {
    plan: 'No active subscription',
    subscriptionStatus,
    dashboardAccess: true,
    panelAccess: false,
    workspace: 'Plans & Billing required',
  };
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function getUserRefByEmail(email) {
  const auth = getAuth(getFirebaseApp());
  const db = getDb();

  const userRecord = await auth.getUserByEmail(email);
  return db.collection(ACCESS_COLLECTION).doc(userRecord.uid);
}

async function getUserRefByStripeIds({ customerId, subscriptionId }) {
  const db = getDb();

  if (subscriptionId) {
    const bySub = await db
      .collection(ACCESS_COLLECTION)
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (!bySub.empty) return bySub.docs[0].ref;
  }

  if (customerId) {
    const byCustomer = await db
      .collection(ACCESS_COLLECTION)
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (!byCustomer.empty) return byCustomer.docs[0].ref;
  }

  return null;
}

async function upsertAccessByEmail({ email, plan, customerId, subscriptionId, subscriptionStatus }) {
  const ref = await getUserRefByEmail(email);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};
  const access = buildAccessByPlan(plan, subscriptionStatus);

  await ref.set(
    {
      email,
      plan: access.plan,
      subscriptionStatus: access.subscriptionStatus,
      dashboardAccess: access.dashboardAccess,
      panelAccess: access.panelAccess,
      workspace: access.workspace,
      stripeCustomerId: customerId || existing.stripeCustomerId || '',
      stripeSubscriptionId: subscriptionId || existing.stripeSubscriptionId || '',
      symbol: existing.symbol || 'NVDA',
      timeframe: existing.timeframe || '1m',
      createdAt: existing.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function updateAccessByRef(ref, { plan, customerId, subscriptionId, subscriptionStatus }) {
  const snap = await ref.get();
  if (!snap.exists) return;

  const existing = snap.data() || {};
  const access = buildAccessByPlan(plan || existing.plan, subscriptionStatus || existing.subscriptionStatus || 'active');

  await ref.set(
    {
      email: existing.email || '',
      plan: access.plan,
      subscriptionStatus: access.subscriptionStatus,
      dashboardAccess: access.dashboardAccess,
      panelAccess: access.panelAccess,
      workspace: access.workspace,
      stripeCustomerId: customerId || existing.stripeCustomerId || '',
      stripeSubscriptionId: subscriptionId || existing.stripeSubscriptionId || '',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  let event;

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('stripe webhook signature error:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        const email =
          session.customer_details?.email ||
          session.customer_email ||
          null;

        const plan = getPlanFromMetadata(session.metadata?.plan);

        if (email && plan) {
          await upsertAccessByEmail({
            email,
            plan,
            customerId: session.customer || '',
            subscriptionId: session.subscription || '',
            subscriptionStatus: 'active',
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer || '';
        const subscriptionId = invoice.subscription || '';
        const priceId = invoice.lines?.data?.[0]?.price?.id || null;
        const plan = getPlanFromPriceId(priceId);

        let ref = await getUserRefByStripeIds({ customerId, subscriptionId });

        if (!ref && customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          const email = !customer.deleted ? customer.email : null;
          if (email && plan) {
            await upsertAccessByEmail({
              email,
              plan,
              customerId,
              subscriptionId,
              subscriptionStatus: 'active',
            });
            break;
          }
        }

        if (ref) {
          await updateAccessByRef(ref, {
            plan,
            customerId,
            subscriptionId,
            subscriptionStatus: 'active',
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer || '';
        const subscriptionId = subscription.id || '';
        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        const plan = getPlanFromPriceId(priceId) || getPlanFromMetadata(subscription.metadata?.plan);
        const status = subscription.status || (event.type === 'customer.subscription.deleted' ? 'canceled' : 'inactive');

        let ref = await getUserRefByStripeIds({ customerId, subscriptionId });

        if (!ref && customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          const email = !customer.deleted ? customer.email : null;
          if (email && plan) {
            await upsertAccessByEmail({
              email,
              plan,
              customerId,
              subscriptionId,
              subscriptionStatus: status,
            });
            break;
          }
        }

        if (ref) {
          await updateAccessByRef(ref, {
            plan,
            customerId,
            subscriptionId,
            subscriptionStatus: status,
          });
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('stripe webhook handler error:', error);
    return res.status(500).json({ error: error?.message || 'Webhook handler failed.' });
  }
};
