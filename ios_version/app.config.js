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
//   APP_ENV=development  →  bundle ID: com.pokerdojo.app.dev
//                           app name:  "Poker Dojo [DEV]"
//   APP_ENV=production   →  bundle ID: com.pokerdojo.app
//                           app name:  "Poker Dojo"
//
// You never need to edit this file manually. Change APP_ENV in your .env file
// or pass it as a command prefix (see the deployment guide).
// =============================================================================

const IS_PROD = process.env.APP_ENV === 'production';

export default {
  expo: {
    // ── Identity ──────────────────────────────────────────────────────────────
    name:    IS_PROD ? 'Poker Dojo' : 'Poker Dojo [DEV]',
    slug:    'poker-trainer',
    version: '1.0.0',

    // ── Display ───────────────────────────────────────────────────────────────
    orientation:        'portrait',
    userInterfaceStyle: 'dark',
    icon:               './assets/icon.png',
    splash:             { backgroundColor: '#0F0F10' },

    // ── iOS ───────────────────────────────────────────────────────────────────
    ios: {
      supportsTablet:   false,
      bundleIdentifier: IS_PROD
        ? 'com.pokerdojo.app'        // ← Live App Store version
        : 'com.pokerdojo.app.dev',   // ← TestFlight / personal test build
      buildNumber: '10',
      infoPlist: {
        // Standard HTTPS/TLS only — exempt from US export compliance
        ITSAppUsesNonExemptEncryption: false,
        // Required for Google Sign-In to redirect back to the app after OAuth
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.googleusercontent.apps.890667045895-ibcaj8p223luguf05kh4hd5g1ful175m',
            ],
          },
        ],
      },
    },

    // ── Android (future) ──────────────────────────────────────────────────────
    android: {
      adaptiveIcon:    { backgroundColor: '#0a0a0a' },
      package:         IS_PROD
        ? 'com.pokerdojo.app'
        : 'com.pokerdojo.app.dev',
    },

    // ── Plugins ───────────────────────────────────────────────────────────────
    plugins: [
      ['expo-notifications', { iosDisplayInForeground: true }],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#0F0F10',
          image:           './assets/icon.png',
          imageWidth:      200,
        },
      ],
      'react-native-purchases',
    ],

    // ── Extra: expose APP_ENV to app code if needed ───────────────────────────
    extra: {
      appEnv:    process.env.APP_ENV ?? 'development',
      eas:       { projectId: '5a6aa998-5f42-46f1-8d74-ffe3f0bf6bc6' },
    },
  },
};
