import re
import os

with open("firebase.js", "r") as f:
    content = f.read()

# 1. Firebase init
firebase_init = """import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-appcheck.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

import { CONFIG } from "./config.js";

export const app = initializeApp(CONFIG.firebase);

self.FIREBASE_APPCHECK_DEBUG_TOKEN = CONFIG.appCheck.debugToken;
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(CONFIG.appCheck.reCaptchaKey),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const functions = getFunctions(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const analytics = await analyticsIsSupported().then((supported) => supported ? getAnalytics(app) : null);
"""

with open("js/firebase-init.js", "w") as f:
    f.write(firebase_init)

# The rest of the functions can just be exposed via services.js
# For now, to avoid breaking the entire app, we can just map RVUFirebase to services
# But wait, the user asked to Modularize: "Recommended order: router.js, dialogs.js, repositories, services, render modules".

# I will just write a simpler approach:
# Create a repository.js with raw operations.
repository = """import { db } from "./firebase-init.js";
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { handleFirebaseError } from "./errors.js";

export async function getDocument(collectionName, docId) {
    try {
        const snap = await getDoc(doc(db, collectionName, docId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch(err) {
        handleFirebaseError(err, `Failed to get ${collectionName}`);
        return null;
    }
}

export async function createDocument(collectionName, data) {
    try {
        const ref = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { id: ref.id, ...data, createdAt: new Date().toISOString() };
    } catch(err) {
        handleFirebaseError(err, `Failed to create ${collectionName}`);
        throw err;
    }
}

export async function updateDocument(collectionName, docId, data) {
    try {
        await updateDoc(doc(db, collectionName, docId), {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch(err) {
        handleFirebaseError(err, `Failed to update ${collectionName}`);
        throw err;
    }
}

export async function deleteDocument(collectionName, docId) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
    } catch(err) {
        handleFirebaseError(err, `Failed to delete ${collectionName}`);
        throw err;
    }
}
"""

with open("js/repository.js", "w") as f:
    f.write(repository)

print("Created firebase-init.js and repository.js")
