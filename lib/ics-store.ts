// Store de ICS por tripId com fallback: Firestore quando disponível, senão memória.
let useFirestore = false;
let firestore: any = null;
let firestoreDoc: any = null;
let firestoreSetDoc: any = null;
let firestoreGetDoc: any = null;

try {
  // Tenta inicializar Firebase sem dependências de cliente.
  const cfg: any = (globalThis as any).__firebase_config;
  if (cfg && cfg.apiKey) {
    // Import dinâmico evita bundling indevido no client.
    const appMod = require("firebase/app");
    const fsMod = require("firebase/firestore");
    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(cfg);
    firestore = fsMod.getFirestore(app);
    firestoreDoc = fsMod.doc;
    firestoreSetDoc = fsMod.setDoc;
    firestoreGetDoc = fsMod.getDoc;
    useFirestore = !!firestore;
  }
} catch {}

const map = new Map<string, string>();

export async function setIcsForTrip(tripId: string, icsText: string) {
  if (useFirestore && firestore && firestoreDoc && firestoreSetDoc) {
    const ref = firestoreDoc(firestore, `artifacts/trae/ics/${tripId}`);
    await firestoreSetDoc(ref, { text: icsText, updatedAt: new Date().toISOString() }, { merge: true });
    return;
  }
  map.set(tripId, icsText);
}

export async function getIcsForTrip(tripId: string): Promise<string | undefined> {
  if (useFirestore && firestore && firestoreDoc && firestoreGetDoc) {
    const ref = firestoreDoc(firestore, `artifacts/trae/ics/${tripId}`);
    const snap = await firestoreGetDoc(ref);
    const data = snap?.exists() ? snap.data() : null;
    return data?.text || undefined;
  }
  return map.get(tripId);
}