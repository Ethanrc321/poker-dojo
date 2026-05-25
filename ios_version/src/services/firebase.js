// ─────────────────────────────────────────────────────────────────────────────
// Firebase service
//
// Replace the placeholder values below with your actual Firebase project config:
//   console.firebase.google.com → Project Settings → Your apps → Web app
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

let auth = null;
let db   = null;

try {
  const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  db = getFirestore(app);
} catch (e) {
  // App will run without cloud sync until real config is provided
  console.warn('[Firebase] Init skipped — replace placeholder config:', e.message);
}

export { auth, db };
