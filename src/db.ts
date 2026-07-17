import { LoanEntry, BackupConfig, BackupEntry } from '../types';
import { safeLocalStorage } from './utils';

const DB_NAME = 'BalajiLedgerDB';
const DB_VERSION = 1;
const STORE_LOANS = 'loans';
const STORE_CONFIG = 'config';
const STORE_BACKUPS = 'backups';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported on this browser/device'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_LOANS)) {
          db.createObjectStore(STORE_LOANS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CONFIG)) {
          db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
          db.createObjectStore(STORE_BACKUPS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (e) {
      reject(e);
    }
  });
};

export const getAllLoans = async (): Promise<LoanEntry[]> => {
  try {
    const db = await initDB();
    const result = await new Promise<LoanEntry[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_LOANS, 'readonly');
      const store = transaction.objectStore(STORE_LOANS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Dual-read verification: If IndexedDB is empty but localStorage has data, restore from localStorage!
    if (result.length === 0) {
      const fallback = safeLocalStorage.getItem('girvi_loans') || safeLocalStorage.getItem('loans');
      if (fallback) {
        const parsed = JSON.parse(fallback);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sync it back to IndexedDB silently for consistency
          setTimeout(() => saveLoans(parsed), 50);
          return parsed;
        }
      }
    }
    return result;
  } catch (err) {
    console.warn("[DB Fallback] initDB or getAll failed, reading from localStorage fallback...", err);
    const fallback = safeLocalStorage.getItem('girvi_loans') || safeLocalStorage.getItem('loans');
    if (fallback) {
      try {
        const parsed = JSON.parse(fallback);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("JSON parsing error for fallback loans", e);
      }
    }
    return [];
  }
};

export const saveLoans = async (loans: LoanEntry[]): Promise<void> => {
  // Always write to localStorage first as a bulletproof safeguard!
  try {
    safeLocalStorage.setItem('girvi_loans', JSON.stringify(loans));
  } catch (e) {
    console.warn("localStorage sync failed during saveLoans", e);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_LOANS, 'readwrite');
      const store = transaction.objectStore(STORE_LOANS);
      
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        loans.forEach(loan => store.add(loan));
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn("[DB Fallback] saveLoans to IndexedDB failed, already written to localStorage:", err);
  }
};

export const saveLoan = async (loan: LoanEntry): Promise<void> => {
  try {
    const db = await initDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_LOANS, 'readwrite');
      const store = transaction.objectStore(STORE_LOANS);
      const request = store.put(loan);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[DB Fallback] saveLoan to IndexedDB failed, writing to localStorage...", err);
  }

  // Update localStorage copy
  try {
    const current = await getAllLoans();
    const index = current.findIndex(l => l.id === loan.id);
    if (index !== -1) {
      current[index] = loan;
    } else {
      current.push(loan);
    }
    safeLocalStorage.setItem('girvi_loans', JSON.stringify(current));
  } catch (e) {
    console.warn("localStorage put failed during saveLoan", e);
  }
};

export const deleteLoanFromDB = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_LOANS, 'readwrite');
      const store = transaction.objectStore(STORE_LOANS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[DB Fallback] deleteLoanFromDB IndexedDB failed:", err);
  }

  // Update localStorage copy
  try {
    const current = await getAllLoans();
    const updated = current.filter(l => l.id !== id);
    safeLocalStorage.setItem('girvi_loans', JSON.stringify(updated));
  } catch (e) {
    console.warn("localStorage delete failed", e);
  }
};

export const getConfig = async (key: string): Promise<any> => {
  try {
    const db = await initDB();
    const val = await new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(STORE_CONFIG, 'readonly');
      const store = transaction.objectStore(STORE_CONFIG);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
    if (val !== undefined) return val;
  } catch (err) {
    console.warn(`[DB Fallback] getConfig failed for key "${key}", reading from localStorage...`, err);
  }

  // Fallback
  const fallback = safeLocalStorage.getItem('girvi_config_' + key);
  if (fallback) {
    try {
      return JSON.parse(fallback);
    } catch {
      return fallback;
    }
  }
  return null;
};

export const saveConfig = async (key: string, value: any): Promise<void> => {
  // Write to localStorage first
  try {
    safeLocalStorage.setItem('girvi_config_' + key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage config write failed", e);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CONFIG, 'readwrite');
      const store = transaction.objectStore(STORE_CONFIG);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[DB Fallback] saveConfig failed for key "${key}" in IndexedDB:`, err);
  }
};

export const getAllBackups = async (): Promise<BackupEntry[]> => {
  try {
    const db = await initDB();
    const result = await new Promise<BackupEntry[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readonly');
      const store = transaction.objectStore(STORE_BACKUPS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (result.length > 0) return result;
  } catch (err) {
    console.warn("[DB Fallback] getAllBackups failed in IndexedDB, falling back to localStorage...", err);
  }

  const fallback = safeLocalStorage.getItem('girvi_backups');
  if (fallback) {
    try {
      const parsed = JSON.parse(fallback);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
};

export const saveBackupsToDB = async (backups: BackupEntry[]): Promise<void> => {
  // Always write to localStorage
  try {
    safeLocalStorage.setItem('girvi_backups', JSON.stringify(backups));
  } catch (e) {
    console.warn("localStorage backups write failed", e);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readwrite');
      const store = transaction.objectStore(STORE_BACKUPS);
      
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        backups.forEach(backup => store.add(backup));
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn("[DB Fallback] saveBackupsToDB failed in IndexedDB:", err);
  }
};
