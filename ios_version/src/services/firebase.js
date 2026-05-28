// ─────────────────────────────────────────────────────────────────────────────
// Firebase service — project: poker-dojo-4d129
// Auth: Google Sign-In enabled
// Firestore: production mode, security rules restrict reads/writes to owner uid
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyA2NsBQEORxKTy-WSjnGzAj5BtibpLxR4g',
  authDomain:        'poker-dojo-4d129.firebaseapp.com',
  projectId:         'poker-dojo-4d129',
  storageBucket:     'poker-dojo-4d129.firebasestorage.app',
  messagingSenderId: '890667045895',
  appId:             '1:890667045895:web:41226597979aa3505386a2',
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
