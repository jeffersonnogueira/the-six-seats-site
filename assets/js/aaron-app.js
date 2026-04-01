import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyB706VVHU7K0nFl_3c-I3G3w1riHlyOE0o",
  authDomain: "sixseats-aaron.firebaseapp.com",
  projectId: "sixseats-aaron",
  storageBucket: "sixseats-aaron.firebasestorage.app",
  messagingSenderId: "678216895700",
  appId: "1:678216895700:web:2836323ab00f058ae07f41"
};

const AARON_PANEL_URL = "https://aaron9-panel.vercel.app/panel.html";
const PLANS_BILLING_URL = "/subscriptions";

/*
  STEP 1 CONFIG
  --------------------------------------------------
  1) Put here the emails that you want to give FREE access.
  2) Put here any paid emails manually until Stripe is writing
     real subscription status to a database.
*/

const FREE_ACCESS_EMAILS = [
  "jeffersonnogueira2@gmail.com",
  "henrique@cavalheiro.org"
];

const PAID_ACCESS_BY_EMAIL = {
  /*
    Example:
    "client1@email.com": {
      plan: "Starter Access",
      panelAccess: false
    },

    "client2@email.com": {
      plan: "Pro AARON Access",
      panelAccess: true
    },

    "client3@email.com": {
      plan: "Elite Institutional Access",
      panelAccess: true
    }
  */
};

const FREE_ACCESS_PROFILE = {
  plan: "Complimentary Pro Access",
  panelAccess: true,
  accessLabel: "Complimentary Access Active",
  workspace: "Private AARON Workspace"
};

const DEFAULT_NO_ACCESS_PROFILE = {
  plan: "No active subscription",
  panelAccess: false,
  accessLabel: "Subscription required",
  workspace: "Plans & Billing required"
};

const PANEL_ENABLED_PLANS = new Set([
  "Complimentary Pro Access",
  "Complimentary Elite Access",
  "Pro AARON Access",
  "Elite Institutional Access",
  "Founder Access"
]);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const welcomeName = document.getElementById('welcomeName');
const appStatus = document.getElementById('appStatus');
const logoutBtn = document.getElementById('logoutBtn');

const accountName = document.getElementById('accountName');
const accountEmail = document.getElementById('accountEmail');

const planValue = document.getElementById('planValue');
const accessValue = document.getElementById('accessValue');
const workspaceValue = document.getElementById('workspaceValue');
const createdValue = document.getElementById('createdValue');

const symbolValue = document.getElementById('symbolValue');
const timeframeValue = document.getElementById('timeframeValue');
const statusValue = document.getElementById('statusValue');

const snapshotName = document.getElementById('snapshotName');
const snapshotEmail = document.getElementById('snapshotEmail');
const snapshotPlan = document.getElementById('snapshotPlan');
const snapshotSymbol = document.getElementById('snapshotSymbol');
const snapshotTimeframe = document.getElementById('snapshotTimeframe');

const openPanelBtn = document.getElementById('openPanelBtn');
const openPanelBtnBottom = document.getElementById('openPanelBtnBottom');
const settingsBtn = document.getElementById('settingsBtn');
const settingsBtnHero = document.getElementById('settingsBtnHero');
const settingsBtnBottom = document.getElementById('settingsBtnBottom');

const plansBillingButtons = [
  document.getElementById('plansBillingBtn'),
  document.getElementById('plansBillingBtnHero'),
  document.getElementById('plansBillingBtnBottom')
].filter(Boolean);

const userDefaults = {
  symbol: 'NVDA',
  timeframe: '1m'
};

let currentAccessProfile = { ...DEFAULT_NO_ACCESS_PROFILE };

function updatePanelStatus(message, type = 'neutral') {
  if (!appStatus) return;

  appStatus.textContent = message;
  appStatus.style.color =
    type === 'error' ? '#b91c1c' :
    type === 'success' ? '#166534' :
    '#64748b';
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getAccessProfile(email) {
  const normalizedEmail = normalizeEmail(email);

  if (FREE_ACCESS_EMAILS.map(normalizeEmail).includes(normalizedEmail)) {
    return { ...FREE_ACCESS_PROFILE };
  }

  if (PAID_ACCESS_BY_EMAIL[normalizedEmail]) {
    const paidProfile = PAID_ACCESS_BY_EMAIL[normalizedEmail];
    return {
      plan: paidProfile.plan || "No active subscription",
      panelAccess: Boolean(paidProfile.panelAccess),
      accessLabel: paidProfile.panelAccess ? "Private Access Active" : "Starter Access Active",
      workspace: paidProfile.panelAccess ? "Private AARON Workspace" : "Billing workspace"
    };
  }

  return { ...DEFAULT_NO_ACCESS_PROFILE };
}

function goToPlansBilling() {
  window.location.href = PLANS_BILLING_URL;
}

function bindSettingsButton(button) {
  if (!button) return;
  button.addEventListener('click', () => {
    updatePanelStatus('Next step: connect a real settings page for symbol, timeframe and plan.');
  });
}

function bindPlansBillingButton(button) {
  if (!button) return;
  button.addEventListener('click', () => {
    goToPlansBilling();
  });
}

function bindOpenPanelButton(button) {
  if (!button) return;
  button.addEventListener('click', () => {
    if (!currentAccessProfile.panelAccess) {
      updatePanelStatus(
        'Your account does not have panel access yet. Go to Plans & Billing to subscribe or upgrade.',
        'error'
      );
      goToPlansBilling();
      return;
    }

    window.location.href = AARON_PANEL_URL;
  });
}

function refreshActionButtons() {
  const canOpenPanel = Boolean(currentAccessProfile.panelAccess);

  [openPanelBtn, openPanelBtnBottom].forEach((button) => {
    if (!button) return;

    if (canOpenPanel) {
      button.textContent = 'Open AARON Panel';
      button.classList.remove('ghost');
      button.classList.add('blue');
    } else {
      button.textContent = 'Plans & Billing';
      button.classList.remove('blue');
      button.classList.add('ghost');
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '/aaron-login.html';
    return;
  }

  const name = user.displayName || 'User';
  const email = user.email || 'No email available';
  const createdAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  currentAccessProfile = getAccessProfile(email);

  setText(welcomeName, `Welcome, ${name}`);

  if (currentAccessProfile.panelAccess) {
    updatePanelStatus('Authentication active. Private dashboard ready.', 'success');
  } else {
    updatePanelStatus('Authentication active, but subscription is required for panel access.', 'error');
  }

  setText(accountName, name);
  setText(accountEmail, email);

  setText(planValue, currentAccessProfile.plan);
  setText(accessValue, currentAccessProfile.accessLabel);
  setText(workspaceValue, currentAccessProfile.workspace);
  setText(createdValue, `Workspace prepared on ${createdAt}`);

  setText(symbolValue, userDefaults.symbol);
  setText(timeframeValue, userDefaults.timeframe);
  setText(statusValue, currentAccessProfile.panelAccess ? 'Active' : 'Billing Required');

  setText(snapshotName, name);
  setText(snapshotEmail, email);
  setText(snapshotPlan, currentAccessProfile.plan);
  setText(snapshotSymbol, userDefaults.symbol);
  setText(snapshotTimeframe, userDefaults.timeframe);

  refreshActionButtons();
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = '/aaron-login.html';
    } catch (error) {
      console.error(error);
      updatePanelStatus('Logout failed.', 'error');
    }
  });
}

bindOpenPanelButton(openPanelBtn);
bindOpenPanelButton(openPanelBtnBottom);

bindSettingsButton(settingsBtn);
bindSettingsButton(settingsBtnHero);
bindSettingsButton(settingsBtnBottom);

plansBillingButtons.forEach(bindPlansBillingButton);
