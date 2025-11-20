"use client";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";

const firebaseConfig: any = (globalThis as any).__firebase_config;
const firebaseEnabled = !!(firebaseConfig && firebaseConfig.apiKey);

let auth: any = null;
let db: any = null;
if (firebaseEnabled) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn("[TRAE] Firebase config ausente. Executando em modo de simulação.");
}

export { auth, db };

export async function ensureAuth(email?: string) {
  try {
    const token: string | undefined = (globalThis as any).__initial_auth_token;
    let user: any = null;
    if (firebaseEnabled && auth) {
      if (token) {
        const cred = await signInWithCustomToken(auth, token);
        user = cred.user;
      } else {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }
    } else {
      // modo simulado
      user = { uid: "local-dev-user" };
    }
    console.log("[TRAE] Simulando envio de link OTP para:", email);
    return user;
  } catch (e) {
    console.error("Falha na autenticação simulada:", e);
    throw e;
  }
}

export const APP_ID = "trae";

export function tripPath(userId: string, tripId: string) {
  return `artifacts/${APP_ID}/users/${userId}/viagens/${tripId}`;
}

export async function saveTrip(userId: string, tripId: string, data: any) {
  if (firebaseEnabled && db) {
    const ref = doc(db, tripPath(userId, tripId));
    await setDoc(ref, data, { merge: true });
    return ref;
  } else {
    const key = `trae_trips_${userId}`;
    const store = JSON.parse(localStorage.getItem(key) || "{}");
    store[tripId] = { ...(store[tripId] || {}), ...data };
    localStorage.setItem(key, JSON.stringify(store));
    return { path: tripPath(userId, tripId) } as any;
  }
}

export async function loadTrip(userId: string, tripId: string) {
  if (firebaseEnabled && db) {
    const ref = doc(db, tripPath(userId, tripId));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } else {
    const key = `trae_trips_${userId}`;
    const store = JSON.parse(localStorage.getItem(key) || "{}");
    return store[tripId] || null;
  }
}

export async function updateTrip(userId: string, tripId: string, data: any) {
  if (firebaseEnabled && db) {
    const ref = doc(db, tripPath(userId, tripId));
    await updateDoc(ref, data);
    return ref;
  } else {
    const key = `trae_trips_${userId}`;
    const store = JSON.parse(localStorage.getItem(key) || "{}");
    store[tripId] = { ...(store[tripId] || {}), ...data };
    localStorage.setItem(key, JSON.stringify(store));
    return { path: tripPath(userId, tripId) } as any;
  }
}

export async function listTrips(userId: string): Promise<Array<{ id: string; data: any }>> {
  if (firebaseEnabled && db) {
    const col = collection(db, `artifacts/${APP_ID}/users/${userId}/viagens`);
    const snaps = await getDocs(col);
    const arr: Array<{ id: string; data: any }> = [];
    snaps.forEach((d: any) => arr.push({ id: d.id, data: d.data() }));
    return arr;
  } else {
    const key = `trae_trips_${userId}`;
    const store = JSON.parse(localStorage.getItem(key) || "{}");
    return Object.keys(store).map((id) => ({ id, data: store[id] }));
  }
}

// Indexar viagens por e-mail para facilitar recuperação na Home
export function emailIndexPath(email: string, tripId?: string) {
  const base = `artifacts/${APP_ID}/emails/${encodeURIComponent(email)}/viagens`;
  return tripId ? `${base}/${tripId}` : base;
}

export async function indexTripForEmail(email: string, tripId: string, meta: { cidade?: string; updatedAt?: string }) {
  if (firebaseEnabled && db) {
    const ref = doc(db, emailIndexPath(email, tripId));
    await setDoc(ref, { tripId, ...meta }, { merge: true });
    return ref;
  } else {
    const key = `trae_email_index_${encodeURIComponent(email)}`;
    const arr: Array<any> = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = arr.findIndex((x) => x.tripId === tripId);
    const item = { tripId, ...meta };
    if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
    else arr.push(item);
    localStorage.setItem(key, JSON.stringify(arr));
    return { path: emailIndexPath(email, tripId) } as any;
  }
}

export async function listTripsByEmail(email: string): Promise<Array<{ tripId: string; cidade?: string; updatedAt?: string }>> {
  if (firebaseEnabled && db) {
    const col = collection(db, emailIndexPath(email));
    const snaps = await getDocs(col);
    const arr: Array<{ tripId: string; cidade?: string; updatedAt?: string }> = [];
    snaps.forEach((d: any) => arr.push({ tripId: d.id, ...(d.data() || {}) }));
    return arr;
  } else {
    const key = `trae_email_index_${encodeURIComponent(email)}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
}

export async function removeTrip(userId: string, email: string, tripId: string) {
  if (firebaseEnabled && db) {
    const tRef = doc(db, tripPath(userId, tripId));
    const eRef = doc(db, emailIndexPath(email, tripId));
    await deleteDoc(tRef);
    await deleteDoc(eRef);
    return;
  } else {
    const keyTrips = `trae_trips_${userId}`;
    const store = JSON.parse(localStorage.getItem(keyTrips) || "{}");
    delete store[tripId];
    localStorage.setItem(keyTrips, JSON.stringify(store));
    const keyIdx = `trae_email_index_${encodeURIComponent(email)}`;
    const arr: Array<any> = JSON.parse(localStorage.getItem(keyIdx) || "[]");
    const next = arr.filter((x: any) => x.tripId !== tripId);
    localStorage.setItem(keyIdx, JSON.stringify(next));
  }
}