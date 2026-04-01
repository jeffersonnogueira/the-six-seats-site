import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB706VVHU7K0nFl_3c-I3G3w1riHlyOE0o',
  authDomain: 'sixseats-aaron.firebaseapp.com',
  projectId: 'sixseats-aaron',
  storageBucket: 'sixseats-aaron.firebasestorage.app',
  messagingSenderId: '678216895700',
  appId: '1:678216895700:web:2836323ab00f058ae07f41'
};

const AARON_PANEL_URL = 'https://aaron9-panel.vercel.app/panel.html';
const PLANS_BILLING_URL = '/subscriptions';
const ACCESS_COLLECTION = 'aaron_access';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, 'aaron-access');

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

const DEFAULT_ACCESS_PROFILE = {
  plan: 'No active subscription',
  panelAccess: false,
  dashboardAccess: true,
  accessLabel: 'Subscription required',
  workspace: 'Plans & Billing required',
  symbol: 'NVDA',
  timeframe: '1m',
  subscriptionStatus: 'inactive',
  createdAtLabel: 'Waiting for account access profile'
};

let currentAccessProfile = { ...DEFAULT_ACCESS_PROFILE };

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

function formatTimestamp(value) {
  try {
    if (!value) return '';

    if (typeof value.toDate === 'function') {
      return value.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    if (value.seconds) {
      return new Date(value.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  } catch (error) {
    console.warn('Timestamp formatting warning:', error);
  }

  return '';
}

function normalizeAccessProfile(data = {}) {
  const dashboardAccess = data.dashboardAccess !== false;
  const panelAccess = Boolean(data.panelAccess);
  const plan = String(data.plan || DEFAULT_ACCESS_PROFILE.plan);
  const subscriptionStatus = String(data.subscriptionStatus || DEFAULT_ACCESS_PROFILE.subscriptionStatus);
  const workspace = String(
    data.workspace || (panelAccess ? 'Private AARON Workspace' : 'Plans & Billing required')
  );
  const symbol = String(data.symbol || DEFAULT_ACCESS_PROFILE.symbol);
  const timeframe = String(data.timeframe || DEFAULT_ACCESS_PROFILE.timeframe);

  let accessLabel = 'Subscription required';
  if (panelAccess) {
    accessLabel = 'Private Access Active';
  } else if (dashboardAccess) {
    accessLabel = 'Dashboard Access Active';
  }

  const createdAtLabel = formatTimestamp(data.createdAt || data.updatedAt) || 'Access profile loaded';

  return {
    plan,
    panelAccess,
    dashboardAccess,
    accessLabel,
    workspace,
    symbol,
    timeframe,
    subscriptionStatus,
    createdAtLabel
  };
}

async function loadAccessProfile(uid) {
  const ref = doc(db, ACCESS_COLLECTION, uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeAccessProfile(snapshot.data());
}

function renderUserState(user, accessProfile) {
  const name = user.displayName || 'User';
  const email = user.email || 'No email available';

  currentAccessProfile = accessProfile || { ...DEFAULT_ACCESS_PROFILE };

  setText(welcomeName, `Welcome, ${name}`);
  setText(accountName, name);
  setText(accountEmail, email);

  setText(planValue, currentAccessProfile.plan);
  setText(accessValue, currentAccessProfile.accessLabel);
  setText(workspaceValue, currentAccessProfile.workspace);
  setText(createdValue, currentAccessProfile.createdAtLabel);

  setText(symbolValue, currentAccessProfile.symbol);
  setText(timeframeValue, currentAccessProfile.timeframe);
  setText(statusValue, currentAccessProfile.panelAccess ? 'Active' : 'Billing Required');

  setText(snapshotName, name);
  setText(snapshotEmail, email);
  setText(snapshotPlan, currentAccessProfile.plan);
  setText(snapshotSymbol, currentAccessProfile.symbol);
  setText(snapshotTimeframe, currentAccessProfile.timeframe);

  if (currentAccessProfile.panelAccess) {
    updatePanelStatus('Authentication active. Firestore access profile loaded. Panel access is active.', 'success');
  } else {
    updatePanelStatus('Authentication active, but subscription is required for panel access.', 'error');
  }

  refreshActionButtons();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/aaron-login.html';
    return;
  }

  try {
    updatePanelStatus('Authentication active. Loading Firestore access profile...');

    const accessProfile = await loadAccessProfile(user.uid);

    if (!accessProfile) {
      renderUserState(user, {
        ...DEFAULT_ACCESS_PROFILE,
        createdAtLabel: 'No Firestore access profile found for this account'
      });
      return;
    }

    renderUserState(user, accessProfile);
  } catch (error) {
    console.error(error);

    renderUserState(user, {
      ...DEFAULT_ACCESS_PROFILE,
      createdAtLabel: 'Access profile could not be loaded'
    });

    updatePanelStatus('Authenticated, but Firestore access profile could not be read. Check Rules and document path.', 'error');
  }
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
