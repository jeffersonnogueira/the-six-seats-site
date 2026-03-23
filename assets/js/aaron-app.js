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

const userDefaults = {
  plan: 'Founder Access',
  symbol: 'NVDA',
  timeframe: '1m',
  workspace: 'Private AARON Workspace'
};

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

function bindSettingsButton(button) {
  if (!button) return;
  button.addEventListener('click', () => {
    updatePanelStatus('Next step: connect a real settings page for symbol, timeframe and plan.');
  });
}

function bindOpenPanelButton(button) {
  if (!button) return;
  button.addEventListener('click', () => {
    updatePanelStatus('Next step: connect the real AARON panel URL for this user.', 'success');
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

  setText(welcomeName, `Welcome, ${name}`);
  updatePanelStatus('Authentication active. Private dashboard ready.', 'success');

  setText(accountName, name);
  setText(accountEmail, email);

  setText(planValue, userDefaults.plan);
  setText(accessValue, 'Private Access Active');
  setText(workspaceValue, userDefaults.workspace);
  setText(createdValue, `Workspace prepared on ${createdAt}`);

  setText(symbolValue, userDefaults.symbol);
  setText(timeframeValue, userDefaults.timeframe);
  setText(statusValue, 'Active');

  setText(snapshotName, name);
  setText(snapshotEmail, email);
  setText(snapshotPlan, userDefaults.plan);
  setText(snapshotSymbol, userDefaults.symbol);
  setText(snapshotTimeframe, userDefaults.timeframe);
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