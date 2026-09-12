import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence transient backend retry probe logs
try {
  setLogLevel('error');
} catch {}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Simplified Firestore initialization
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export default app;

