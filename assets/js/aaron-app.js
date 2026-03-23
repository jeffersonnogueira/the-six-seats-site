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
const welcomeEmail = document.getElementById('welcomeEmail');
const appStatus = document.getElementById('appStatus');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '/aaron-login.html';
    return;
  }

  const name = user.displayName || 'User';
  const email = user.email || '';

  if (welcomeName) {
    welcomeName.textContent = `Welcome, ${name}`;
  }

  if (welcomeEmail) {
    welcomeEmail.textContent = email;
  }

  if (appStatus) {
    appStatus.textContent = 'Authentication active. Private area ready.';
    appStatus.style.color = '#166534';
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = '/aaron-login.html';
    } catch (error) {
      console.error(error);
      if (appStatus) {
        appStatus.textContent = 'Logout failed.';
        appStatus.style.color = '#b91c1c';
      }
    }
  });
}