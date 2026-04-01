import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB706VVHU7K0nFl_3c-I3G3w1riHlyOE0o',
  authDomain: 'sixseats-aaron.firebaseapp.com',
  projectId: 'sixseats-aaron',
  storageBucket: 'sixseats-aaron.firebasestorage.app',
  messagingSenderId: '678216895700',
  appId: '1:678216895700:web:2836323ab00f058ae07f41'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'en';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

const googleLoginBtn = document.getElementById('googleLoginBtn');
const continueBtn = document.getElementById('continueBtn');
const loginStatus = document.getElementById('loginStatus');

function setStatus(message, type = 'neutral') {
  if (!loginStatus) return;

  loginStatus.textContent = message;
  loginStatus.style.color =
    type === 'error' ? '#b91c1c' :
    type === 'success' ? '#166534' :
    '#64748b';
}

function setSignedInUI(user) {
  const name = user.displayName || 'User';
  const email = user.email || '';

  setStatus(`Signed in as ${name}${email ? ' · ' + email : ''}`, 'success');

  if (continueBtn) {
    continueBtn.textContent = 'Secure access ready';
  }
}

function setSignedOutUI() {
  setStatus('Sign in with Google to activate secure access.');

  if (continueBtn) {
    continueBtn.textContent = 'Continue to secure access';
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    setSignedInUI(user);
  } else {
    setSignedOutUI();
  }
});

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    try {
      googleLoginBtn.disabled = true;
      setStatus('Opening Google sign-in...');

      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      setStatus(error?.message || 'Google sign-in failed.', 'error');
    } finally {
      googleLoginBtn.disabled = false;
    }
  });
}

if (continueBtn) {
  continueBtn.addEventListener('click', () => {
    const user = auth.currentUser;

    if (!user) {
      setStatus('First sign in with Google.', 'error');
      return;
    }

    window.location.href = '/aaron-app.html';
  });
}
