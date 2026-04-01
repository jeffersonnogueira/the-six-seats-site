import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
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
const APP_URL = '/aaron-app.html';

const COMMON_SYMBOLS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'SPY', 'QQQ', 'META', 'AMZN'];
const COMMON_TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D'];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

const pageStatus = document.getElementById('pageStatus');
const accountName = document.getElementById('accountName');
const accountEmail = document.getElementById('accountEmail');
const currentPlan = document.getElementById('currentPlan');
const currentAccess = document.getElementById('currentAccess');
const currentWorkspace = document.getElementById('currentWorkspace');
const currentSymbol = document.getElementById('currentSymbol');
const currentTimeframe = document.getElementById('currentTimeframe');
const settingsForm = document.getElementById('settingsForm');
const symbolInput = document.getElementById('symbolInput');
const timeframeSelect = document.getElementById('timeframeSelect');
const customTimeframeInput = document.getElementById('customTimeframeInput');
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const presetSymbolWrap = document.getElementById('presetSymbolWrap');
const presetTimeframeWrap = document.getElementById('presetTimeframeWrap');

let currentUser = null;
let currentDocRef = null;
let currentProfile = null;

function setStatus(message, type = 'neutral') {
  if (!pageStatus) return;

  pageStatus.textContent = message;
  pageStatus.style.color =
    type === 'error' ? '#b91c1c' :
    type === 'success' ? '#166534' :
    '#64748b';
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function normalizeProfile(data) {
  return {
    plan: String(data?.plan || 'No active subscription'),
    panelAccess: Boolean(data?.panelAccess),
    dashboardAccess: data?.dashboardAccess === undefined ? true : Boolean(data.dashboardAccess),
    workspace: String(data?.workspace || (data?.panelAccess ? 'Private AARON Workspace' : 'Plans & Billing required')),
    symbol: String(data?.symbol || 'NVDA').trim().toUpperCase(),
    timeframe: String(data?.timeframe || '1m').trim(),
    accessLabel: Boolean(data?.panelAccess) ? 'Private Access Active' : 'Subscription required'
  };
}

function renderPresetButtons(container, values, onClick) {
  if (!container) return;
  container.innerHTML = '';

  values.forEach((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn ghost settings-chip';
    button.textContent = value;
    button.addEventListener('click', () => onClick(value));
    container.appendChild(button);
  });
}

function syncTimeframeInputs(value) {
  const normalized = String(value || '').trim();
  const isCommon = COMMON_TIMEFRAMES.includes(normalized);

  timeframeSelect.value = isCommon ? normalized : 'custom';
  customTimeframeInput.style.display = timeframeSelect.value === 'custom' ? 'block' : 'none';
  customTimeframeInput.value = timeframeSelect.value === 'custom' ? normalized : '';
}

function getChosenTimeframe() {
  if (timeframeSelect.value === 'custom') {
    return customTimeframeInput.value.trim();
  }
  return timeframeSelect.value.trim();
}

async function loadProfile(user) {
  currentDocRef = doc(db, ACCESS_COLLECTION, user.uid);
  const snap = await getDoc(currentDocRef);

  if (!snap.exists()) {
    throw new Error('Access profile not found in Firestore.');
  }

  currentProfile = normalizeProfile(snap.data());

  setText(accountName, user.displayName || 'User');
  setText(accountEmail, user.email || 'No email available');
  setText(currentPlan, currentProfile.plan);
  setText(currentAccess, currentProfile.accessLabel);
  setText(currentWorkspace, currentProfile.workspace);
  setText(currentSymbol, currentProfile.symbol);
  setText(currentTimeframe, currentProfile.timeframe);

  symbolInput.value = currentProfile.symbol;
  syncTimeframeInputs(currentProfile.timeframe);

  setStatus('Profile loaded. You can now change your symbol and timeframe.', 'success');
}

async function saveSettings(event) {
  event.preventDefault();

  if (!currentUser || !currentDocRef) {
    setStatus('No authenticated user found.', 'error');
    return;
  }

  const symbol = symbolInput.value.trim().toUpperCase();
  const timeframe = getChosenTimeframe();

  if (!symbol) {
    setStatus('Enter a valid symbol.', 'error');
    symbolInput.focus();
    return;
  }

  if (!timeframe) {
    setStatus('Choose a valid timeframe.', 'error');
    customTimeframeInput.focus();
    return;
  }

  saveBtn.disabled = true;
  setStatus('Saving your settings...');

  try {
    await updateDoc(currentDocRef, {
      symbol,
      timeframe,
      updatedAt: serverTimestamp()
    });

    currentProfile.symbol = symbol;
    currentProfile.timeframe = timeframe;

    setText(currentSymbol, symbol);
    setText(currentTimeframe, timeframe);

    setStatus(`Saved. Your profile is now set to ${symbol} · ${timeframe}.`, 'success');
  } catch (error) {
    console.error(error);
    setStatus(
      'Save failed. If Rules are still locked, publish the settings write rules first.',
      'error'
    );
  } finally {
    saveBtn.disabled = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/aaron-login.html';
    return;
  }

  currentUser = user;

  try {
    await loadProfile(user);
  } catch (error) {
    console.error(error);
    setStatus(
      'Authenticated, but your Firestore profile could not be loaded. Check Rules, database ID, and document path.',
      'error'
    );
  }
});

renderPresetButtons(presetSymbolWrap, COMMON_SYMBOLS, (value) => {
  symbolInput.value = value;
});

renderPresetButtons(presetTimeframeWrap, COMMON_TIMEFRAMES, (value) => {
  syncTimeframeInputs(value);
});

timeframeSelect.addEventListener('change', () => {
  customTimeframeInput.style.display = timeframeSelect.value === 'custom' ? 'block' : 'none';
  if (timeframeSelect.value !== 'custom') {
    customTimeframeInput.value = '';
  }
});

settingsForm?.addEventListener('submit', saveSettings);

backBtn?.addEventListener('click', () => {
  window.location.href = APP_URL;
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = '/aaron-login.html';
  } catch (error) {
    console.error(error);
    setStatus('Logout failed.', 'error');
  }
});
