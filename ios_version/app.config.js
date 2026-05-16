// =============================================================================
// app.config.js — Dynamic Expo Configuration
// =============================================================================
//
// This file replaces app.json. It reads the APP_ENV variable from your .env
// file and switches the app's bundle identifier, display name, and icon so
// that the development build and the production build are treated as two
// completely separate apps — both can be installed on your phone at once.
//
// HOW IT WORKS:
//   APP_ENV=development  →  bundle ID: com.tagpoker.trainer.dev
//                           app name:  "TAG Poker [DEV]"
//   APP_ENV=production   →  bundle ID: com.tagpoker.trainer
//                           app name:  "TAG Poker Trainer"
//
// You never need to edit this file manually. Change APP_ENV in your .env file
// or pass it as a command prefix (see the deployment guide).
// =============================================================================

const IS_PROD = process.env.APP_ENV === 'production';

export default {
  expo: {
    // ── Identity ──────────────────────────────────────────────────────────────
    name:    IS_PROD ? 'TAG Poker Trainer'  : 'TAG Poker [DEV]',
    slug:    'poker-trainer',
    version: '1.0.0',

    // ── Display ───────────────────────────────────────────────────────────────
    orientation:        'portrait',
    userInterfaceStyle: 'dark',
    icon:               './assets/icon.png',
    splash:             { backgroundColor: '#0a0a0a' },

    // ── iOS ───────────────────────────────────────────────────────────────────
    ios: {
      supportsTablet:   false,
      bundleIdentifier: IS_PROD
        ? 'com.tagpoker.trainer'        // ← Live App Store version
        : 'com.tagpoker.trainer.dev',   // ← TestFlight / personal test build
    },

    // ── Android (future) ──────────────────────────────────────────────────────
    android: {
      adaptiveIcon:    { backgroundColor: '#0a0a0a' },
      package:         IS_PROD
        ? 'com.tagpoker.trainer'
        : 'com.tagpoker.trainer.dev',
    },

    // ── Extra: expose APP_ENV to app code if needed ───────────────────────────
    extra: {
      appEnv: process.env.APP_ENV ?? 'development',
    },
  },
};
