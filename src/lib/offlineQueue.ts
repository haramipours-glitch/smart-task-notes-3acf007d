// Offline-first mutation queue using IndexedDB.
// Queues Supabase mutations while offline and replays them when back online.

import { openDB, type IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";

type QueuedOp = {
  id?: number;
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  payload?: any;
  match?: Record<string, any>;
  createdAt: number;
  attempts: number;
};

const DB_NAME = "taskflow-offline";
const STORE = "outbox";
const CACHE_STORE = "cache";

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueOp(op: Omit<QueuedOp, "id" | "createdAt" | "attempts">) {
  const db = await getDB();
  await db.add(STORE, { ...op, createdAt: Date.now(), attempts: 0 });
  notifyChange();
}

export async function getQueue(): Promise<QueuedOp[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function clearQueue() {
  const db = await getDB();
  await db.clear(STORE);
  notifyChange();
}

export async function cacheSet(key: string, value: any) {
  const db = await getDB();
  await db.put(CACHE_STORE, value, key);
}

export async function cacheGet<T = any>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(CACHE_STORE, key);
}

const listeners = new Set<() => void>();
export function onQueueChange(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notifyChange() {
  listeners.forEach((l) => l());
}

let syncing = false;
export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (syncing || !navigator.onLine) return { ok: 0, failed: 0 };
  syncing = true;
  let ok = 0;
  let failed = 0;
  try {
    const db = await getDB();
    const items = (await db.getAll(STORE)) as QueuedOp[];
    for (const item of items) {
      try {
        const q: any = (supabase.from as any)(item.table);
        let res;
        if (item.op === "insert") res = await q.insert(item.payload);
        else if (item.op === "upsert") res = await q.upsert(item.payload);
        else if (item.op === "update") {
          let b = q.update(item.payload);
          for (const [k, v] of Object.entries(item.match || {})) b = b.eq(k, v);
          res = await b;
        } else if (item.op === "delete") {
          let b = q.delete();
          for (const [k, v] of Object.entries(item.match || {})) b = b.eq(k, v);
          res = await b;
        }
        if (res?.error) throw res.error;
        await db.delete(STORE, item.id!);
        ok++;
      } catch (e) {
        failed++;
        item.attempts++;
        if (item.attempts >= 5) {
          // give up after 5 attempts to avoid infinite retry
          await db.delete(STORE, item.id!);
        } else {
          await db.put(STORE, item);
        }
      }
    }
  } finally {
    syncing = false;
    notifyChange();
  }
  return { ok, failed };
}

export function initOfflineSync() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    flushQueue();
  });
  // try once on startup
  if (navigator.onLine) {
    setTimeout(() => flushQueue(), 1500);
  }
  // periodic retry
  setInterval(() => {
    if (navigator.onLine) flushQueue();
  }, 30_000);
}
