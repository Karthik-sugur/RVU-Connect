import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app-check.js";

import { CONFIG } from "./config.js";

export const app = initializeApp(CONFIG.firebase);

self.FIREBASE_APPCHECK_DEBUG_TOKEN = CONFIG.appCheck.debugToken;
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(CONFIG.appCheck.reCaptchaKey),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const analytics = await analyticsIsSupported().then((supported) => supported ? getAnalytics(app) : null);
