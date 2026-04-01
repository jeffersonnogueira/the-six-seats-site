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

const FIRESTORE_DATABASE_ID = 'aaron-access';
const ACCESS_COLLECTION = 'aaron_access';
const AARON_PANEL_URL = 'https://aaron9-panel.vercel.app/panel.html';
const PLANS_BILLING_URL = '/subscriptions';
const SETTINGS_URL = '/aaron-settings.html';

const DEFAULT_NO_ACCESS_PROFILE = {
  plan: 'No active subscription',
  panelAccess: false,
  dashboardAccess: false,
  accessLabel: 'Subscription required',
  workspace: 'Plans & Billing required',
  symbol: 'NVDA',
  timeframe: '1m',
  statusLabel: 'Billing Required'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

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

let currentUser = null;
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

function normalizeProfile(data) {
  const plan = String(data?.plan || DEFAULT_NO_ACCESS_PROFILE.plan);
  const panelAccess = Boolean(data?.panelAccess);
  const dashboardAccess = data?.dashboardAccess === undefined ? true : Boolean(data.dashboardAccess);
  const workspace = String(
    data?.workspace ||
    (panelAccess ? 'Private AARON Workspace' : DEFAULT_NO_ACCESS_PROFILE.workspace)
  );
  const symbol = String(data?.symbol || DEFAULT_NO_ACCESS_PROFILE.symbol).trim().toUpperCase();
  const timeframe = String(data?.timeframe || DEFAULT_NO_ACCESS_PROFILE.timeframe).trim();
  const subscriptionStatus = String(data?.subscriptionStatus || 'inactive');

  return {
    plan,
    panelAccess,
    dashboardAccess,
    workspace,
    symbol: symbol || DEFAULT_NO_ACCESS_PROFILE.symbol,
    timeframe: timeframe || DEFAULT_NO_ACCESS_PROFILE.timeframe,
    subscriptionStatus,
    accessLabel: panelAccess ? 'Private Access Active' : 'Subscription required',
    statusLabel: panelAccess ? 'Active' : 'Billing Required'
  };
}

async function loadAccessProfile(uid) {
  const ref = doc(db, ACCESS_COLLECTION, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Access profile not found in Firestore.');
  }

  return normalizeProfile(snap.data());
}

function goToPlansBilling() {
  window.location.href = PLANS_BILLING_URL;
}

function goToSettings() {
  window.location.href = SETTINGS_URL;
}

function buildPanelUrl() {
  const url = new URL(AARON_PANEL_URL);
  url.searchParams.set('symbol', currentAccessProfile.symbol || DEFAULT_NO_ACCESS_PROFILE.symbol);
  url.searchParams.set('timeframe', currentAccessProfile.timeframe || DEFAULT_NO_ACCESS_PROFILE.timeframe);

  if (currentUser?.uid) {
    url.searchParams.set('uid', currentUser.uid);
  }

  return url.toString();
}

function bindSettingsButton(button) {
  if (!button) return;
  button.addEventListener('click', () => {
    goToSettings();
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

    window.location.href = buildPanelUrl();
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

function renderUser(user, profile) {
  const name = user.displayName || 'User';
  const email = user.email || 'No email available';
  const createdAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  setText(welcomeName, `Welcome, ${name}`);

  if (profile.panelAccess) {
    updatePanelStatus(
      `Authentication active. Firestore profile loaded. Panel ready for ${profile.symbol} · ${profile.timeframe}.`,
      'success'
    );
  } else {
    updatePanelStatus(
      'Authentication active, but subscription is required for panel access.',
      'error'
    );
  }

  setText(accountName, name);
  setText(accountEmail, email);

  setText(planValue, profile.plan);
  setText(accessValue, profile.accessLabel);
  setText(workspaceValue, profile.workspace);
  setText(createdValue, `Workspace prepared on ${createdAt}`);

  setText(symbolValue, profile.symbol);
  setText(timeframeValue, profile.timeframe);
  setText(statusValue, profile.statusLabel);

  setText(snapshotName, name);
  setText(snapshotEmail, email);
  setText(snapshotPlan, profile.plan);
  setText(snapshotSymbol, profile.symbol);
  setText(snapshotTimeframe, profile.timeframe);

  refreshActionButtons();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/aaron-login.html';
    return;
  }

  currentUser = user;

  try {
    currentAccessProfile = await loadAccessProfile(user.uid);

    if (!currentAccessProfile.dashboardAccess) {
      updatePanelStatus('Authenticated, but dashboard access is disabled for this account.', 'error');
      goToPlansBilling();
      return;
    }

    renderUser(user, currentAccessProfile);
  } catch (error) {
    console.error(error);
    currentAccessProfile = { ...DEFAULT_NO_ACCESS_PROFILE };

    setText(welcomeName, `Welcome, ${user.displayName || 'User'}`);
    setText(accountName, user.displayName || 'User');
    setText(accountEmail, user.email || 'No email available');
    setText(planValue, currentAccessProfile.plan);
    setText(accessValue, currentAccessProfile.accessLabel);
    setText(workspaceValue, currentAccessProfile.workspace);
    setText(symbolValue, currentAccessProfile.symbol);
    setText(timeframeValue, currentAccessProfile.timeframe);
    setText(statusValue, currentAccessProfile.statusLabel);
    setText(snapshotName, user.displayName || 'User');
    setText(snapshotEmail, user.email || 'No email available');
    setText(snapshotPlan, currentAccessProfile.plan);
    setText(snapshotSymbol, currentAccessProfile.symbol);
    setText(snapshotTimeframe, currentAccessProfile.timeframe);

    updatePanelStatus(
      'Authenticated, but Firestore access profile could not be read. Check Rules, database ID, and document path.',
      'error'
    );

    refreshActionButtons();
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
