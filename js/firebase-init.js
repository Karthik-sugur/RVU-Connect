import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app-check.js";

import { CONFIG } from "./config.js";

function resolveFirebaseConfig() {
  const config = { ...CONFIG.firebase };
  const hostname = window.location.hostname;
  // Safari partitions storage per top-level site, so an auth handler on
  // *.firebaseapp.com cannot reach the sessionStorage it wrote. Serving /__/auth
  // from our own origin keeps the handler first-party. Needs the rewrite in vercel.json.
  if (CONFIG.auth?.sameOriginAuthDomainHosts?.includes(hostname)) {
    config.authDomain = hostname;
  }
  return config;
}

export const app = initializeApp(resolveFirebaseConfig());

function shouldUseAppCheckDebugToken(hostname) {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const productionHosts = new Set(CONFIG.appCheck.productionHosts || []);
  const isLocal = localHosts.has(hostname);
  const isVercelPreview = hostname.endsWith(".vercel.app") && !productionHosts.has(hostname);
  return Boolean(CONFIG.appCheck.debugToken && (isLocal || isVercelPreview));
}

if (shouldUseAppCheckDebugToken(window.location.hostname)) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = CONFIG.appCheck.debugToken;
}

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(CONFIG.appCheck.reCaptchaKey),
  isTokenAutoRefreshEnabled: true
});

// Explicit persistence order: IndexedDB first, localStorage where IndexedDB is blocked
// (iOS private browsing). Without this a returning user is asked to sign in again.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Deliberately not awaited. A top-level await here blocked the whole module graph,
// and nothing reads this binding before it settles.
export let analytics = null;
analyticsIsSupported()
  .then((supported) => { if (supported) analytics = getAnalytics(app); })
  .catch(() => { analytics = null; });
