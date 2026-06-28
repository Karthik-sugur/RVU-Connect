import { db } from "./firebase-init.js";
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
