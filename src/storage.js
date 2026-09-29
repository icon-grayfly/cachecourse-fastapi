const DB_NAME = "cachecourse-local";
const STORE_NAME = "learner-state";
const STATE_KEY = "progress-v1";
let memoryState = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local storage"));
  });
}

async function transact(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local storage operation failed"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error("Local storage transaction failed")); };
  });
}

export async function loadProgress(fallback) {
  try {
    const value = await transact("readonly", (store) => store.get(STATE_KEY));
    return value || fallback;
  } catch {
    return memoryState || fallback;
  }
}

export async function saveProgress(state) {
  memoryState = state;
  try {
    await transact("readwrite", (store) => store.put(state, STATE_KEY));
    return true;
  } catch {
    return false;
  }
}
