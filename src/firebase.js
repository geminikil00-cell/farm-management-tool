import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCrjDJXH5uAGLRVuGeEOJmprt06XgtKMc4",
    authDomain: "farm-management-66416.firebaseapp.com",
    projectId: "farm-management-66416",
    storageBucket: "farm-management-66416.firebasestorage.app",
    messagingSenderId: "217392479842",
    appId: "1:217392479842:web:86306ca7a50fef378b1b3b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const FirebaseHelpers = {
    signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
    createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
    addDoc: async (col, data) => await addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() }),
    updateDoc: async (col, id, data) => await updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() }),
    deleteDoc: async (col, id) => await deleteDoc(doc(db, col, id)),
    setDoc: async (col, id, data) => await setDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() }, { merge: true }),
    onSnapshot: (col, cb) => onSnapshot(collection(db, col), (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => { console.error(err); cb([]); })
};
