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
// Google OAuth client IDs
//   iosClientId — iOS OAuth client (console.cloud.google.com → Credentials)
//   webClientId — Web client auto-created by Firebase (same project)
// Note: Google Sign-In does not work in Expo Go (auth.expo.io proxy deprecated).
//       Test via TestFlight or a development build.
// ─────────────────────────────────────────────────────────────────────────────
// Reverse client ID scheme — hardcoded for production iOS builds.
// makeRedirectUri() returns empty string at module level in production (no
// React context available), which causes useAuthRequest to throw.
// The redirect URI for iOS Google OAuth is always the reverse client ID + :/oauthredirect.
const GOOGLE_CLIENT_IDS = {
  iosClientId: '890667045895-ibcaj8p223luguf05kh4hd5g1ful175m.apps.googleusercontent.com',
  webClientId: '890667045895-1s4b81ivbighrnvmjbll6fl0dtgfat26.apps.googleusercontent.com',
  redirectUri: 'com.googleusercontent.apps.890667045895-ibcaj8p223luguf05kh4hd5g1ful175m:/oauthredirect',
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
