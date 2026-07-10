import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
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
