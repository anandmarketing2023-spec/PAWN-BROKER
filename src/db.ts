
import { LoanEntry, BackupConfig, BackupEntry } from '../types';

const DB_NAME = 'BalajiLedgerDB';
const DB_VERSION = 1;
const STORE_LOANS = 'loans';
const STORE_CONFIG = 'config';
const STORE_BACKUPS = 'backups';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
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
  });
};

export const getAllLoans = async (): Promise<LoanEntry[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOANS, 'readonly');
    const store = transaction.objectStore(STORE_LOANS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveLoans = async (loans: LoanEntry[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOANS, 'readwrite');
    const store = transaction.objectStore(STORE_LOANS);
    
    // Clear existing and add all
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      loans.forEach(loan => store.add(loan));
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const saveLoan = async (loan: LoanEntry): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOANS, 'readwrite');
    const store = transaction.objectStore(STORE_LOANS);
    const request = store.put(loan);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteLoanFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOANS, 'readwrite');
    const store = transaction.objectStore(STORE_LOANS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getConfig = async (key: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CONFIG, 'readonly');
    const store = transaction.objectStore(STORE_CONFIG);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
};

export const saveConfig = async (key: string, value: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CONFIG, 'readwrite');
    const store = transaction.objectStore(STORE_CONFIG);
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllBackups = async (): Promise<BackupEntry[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BACKUPS, 'readonly');
    const store = transaction.objectStore(STORE_BACKUPS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveBackupsToDB = async (backups: BackupEntry[]): Promise<void> => {
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
};
