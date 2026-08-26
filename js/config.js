export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyAo6Ah7dLSOav1qBkHVphkI8BOdzYypHZU",
    authDomain: "rvuconnect-26c39.firebaseapp.com",
    projectId: "rvuconnect-26c39",
    storageBucket: "rvuconnect-26c39.firebasestorage.app",
    messagingSenderId: "303032234483",
    appId: "1:303032234483:web:2391fcdd5cd5d1d9466286",
    measurementId: "G-1G6Z0B4SY0",
  },
  auth: {
    // Hosts that proxy /__/auth to Firebase (see vercel.json). Listing a host here makes
    // the OAuth handler first-party, which is what iOS Safari needs to keep its
    // sessionStorage. EMPTY ON PURPOSE: Google returns redirect_uri_mismatch until
    // https://<host>/__/auth/handler is added to the OAuth client's authorised redirect
    // URIs in Google Cloud Console. Add the URI there first, then list the host here.
    sameOriginAuthDomainHosts: [],
  },
  appCheck: {
    debugToken: true,
    reCaptchaKey: "6LecNzwtAAAAALKoPE5_oR1otalznBFmPRfH1pDo",
    productionHosts: ["rvu-connect.vercel.app"]
  },
  features: {
    applicationsEnabled: true,
    rsvpEnabled: true
  }
};
