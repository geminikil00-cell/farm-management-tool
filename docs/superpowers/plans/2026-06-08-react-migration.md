# React Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-file HTML/JS Farm Management tool into a modern, production-ready Vite React application with proper ES modules.

**Architecture:** Initialize Vite for build tooling, install TailwindCSS for styling, and modularize the existing inline components into `src/components/`. We'll migrate Firebase configuration to an env-based singleton and ensure all business logic functions correctly.

**Tech Stack:** React 18, Vite, TailwindCSS, Firebase.

---

### Task 1: Scaffolding Vite and TailwindCSS

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`
- Create: `src/main.jsx`, `src/App.jsx`, `src/index.css`
- Modify: `index.html` (Vite's root)

- [x] **Step 1: Create Vite project in a temp folder and move it to root**
```bash
npx -y create-vite@5 temp-app --template react
mv temp-app/* ./
mv temp-app/.[!.]* ./
rm -rf temp-app
```

- [x] **Step 2: Install dependencies**
```bash
npm install
npm install firebase
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [x] **Step 3: Configure Tailwind**
```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [x] **Step 4: Update `src/index.css`**
Add Tailwind directives and the custom styles from `styles.css`.
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
```

- [x] **Step 5: Setup Firebase**
```javascript
// src/firebase.js
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
```

---

### Task 2: Port Utilities and Icons

**Files:**
- Create: `src/components/Icons.jsx`
- Create: `src/components/Shared.jsx`

- [x] **Step 1: Port Icons**
Move all inline Icon components from `index.html` (e.g., `Sprout`, `Tractor`, etc.) into `src/components/Icons.jsx` and export them.

- [x] **Step 2: Port Shared UI Components**
Move `SVGBarChart`, `SVGDonutChart`, `SVGLineChart`, `Sparkline`, `ProgressBar`, `StatCard`, `MiniCard`, `AlertCard`, `HeatMapCell` from `index.html` into `src/components/Shared.jsx`. Ensure React imports are correct.

---

### Task 3: Port Feature Components

**Files:**
- Create: `src/components/LoginScreen.jsx`
- Create: `src/components/Dashboard.jsx`
- Create: `src/components/MaterialsManager.jsx`
- Create: `src/components/StatisticalDataManager.jsx`
- Create: `src/components/NurseryManager.jsx`
- Create: `src/components/PlantingManager.jsx`
- Create: `src/components/HarvestingManager.jsx`
- Create: `src/components/SprayingManager.jsx`
- Create: `src/components/IrrigationManager.jsx`

- [x] **Step 1: Create components using contents from `index.html` and `js/components/*.js`**
Extract and convert these files into standard functional components, updating `window.Firebase` to use imported `FirebaseHelpers`. Ensure all React hooks (`useState`, `useEffect`, `useMemo`) are correctly imported.

---

### Task 4: Assembly and Cleanup

**Files:**
- Modify: `src/App.jsx`
- Modify: `index.html` (Cleanup)
- Delete: `js/` folder, old `styles.css`

- [x] **Step 1: Construct App Component**
Update `src/App.jsx` using the logic found in `js/App.js`. Ensure it imports the feature components and renders them properly based on state. Replace global references (`window.Icons`, `window.Firebase`) with ES modules.

- [x] **Step 2: Build Verification**
```bash
npm run build
```
Verify the build succeeds with no errors.

- [x] **Step 3: Cleanup redundant files**
```bash
rm -rf js/
rm styles.css
rm -f old-index.html
```

- [x] **Step 4: Git Commit & Push**
```bash
git add .
git commit -m "feat: migrate to production-ready Vite React architecture"
git push
```
