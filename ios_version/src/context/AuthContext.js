import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider, signInWithCredential,
  signOut as firebaseSignOut, onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase.js';

WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// Replace with your OAuth client IDs from:
//   console.cloud.google.com → APIs & Services → Credentials
//
// expoClientId    — used in Expo Go / development
// iosClientId     — used in production iOS builds
// androidClientId — used in production Android builds
// webClientId     — Firebase web OAuth client (same project)
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_IDS = {
  expoClientId:    'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
  iosClientId:     'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  webClientId:     'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
};

const AuthContext = createContext({
  user:       null,
  loading:    true,
  signIn:     () => {},
  signOut:    () => {},
  saveStats:  async () => {},
  loadStats:  async () => null,
});

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const [, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);

  // Google OAuth response → Firebase credential
  useEffect(() => {
    if (response?.type !== 'success') return;
    const { idToken, accessToken } = response.authentication ?? {};
    if (!idToken || !auth) return;
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    signInWithCredential(auth, credential).catch(e =>
      console.warn('[Auth] signInWithCredential:', e.message)
    );
  }, [response]);

  // Firebase auth state listener
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(() => {
    promptAsync();
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    if (!auth) return;
    try { await firebaseSignOut(auth); } catch (e) { console.warn('[Auth] signOut:', e.message); }
    setUser(null);
  }, []);

  // Save stats to Firestore for the signed-in user
  const saveStats = useCallback(async (stats) => {
    if (!user || !db) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { stats }, { merge: true });
    } catch (e) { console.warn('[Auth] saveStats:', e.message); }
  }, [user]);

  // Load stats from Firestore; returns null if none found
  const loadStats = useCallback(async () => {
    if (!user || !db) return null;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      return snap.exists() ? (snap.data().stats ?? null) : null;
    } catch (e) {
      console.warn('[Auth] loadStats:', e.message);
      return null;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, saveStats, loadStats }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
