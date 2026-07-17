import { LoanEntry } from '../types';

export const calculateInterest = (loan: LoanEntry, customDate?: string) => {
  const getLocalDate = (d: string | Date) => {
    if (typeof d === 'string') {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const start = getLocalDate(loan.date);
  const end = getLocalDate(customDate || loan.closeDate || new Date());
  
  if (end < start) return 0;

  // Principal transitions
  const principalTxs = (loan.transactions || [])
    .filter(t => t.type === 'Loan Addition' || t.type === 'Principal Payment')
    .map(t => ({ 
      date: getLocalDate(t.date), 
      amount: t.amount, 
      type: t.type as 'Loan Addition' | 'Principal Payment' 
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const getPrincipalAt = (date: Date) => {
    let p = loan.amount;
    for (const tx of principalTxs) {
      if (tx.date <= date) {
        if (tx.type === 'Loan Addition') p += tx.amount;
        else p -= tx.amount;
      } else {
        break;
      }
    }
    return p;
  };

  let totalInterest = 0;
  let currentCycleStart = new Date(start);

  // For whole month calculation: each 30-day block counts as 1 month.
  // We use the maximum principal held during each 30-day window.
  while (currentCycleStart <= end) {
    let currentCycleEnd = new Date(currentCycleStart);
    currentCycleEnd.setDate(currentCycleEnd.getDate() + 29); // 30 day window

    // Points to check for max principal: 
    // 1. The principal at the start of the cycle
    // 2. Any principal changes that happen during this cycle
    let maxPrincipalInCycle = getPrincipalAt(currentCycleStart);
    
    for (const tx of principalTxs) {
      // If transaction happened in this cycle
      if (tx.date >= currentCycleStart && tx.date <= currentCycleEnd) {
        // Only consider if transaction is within the total loan period we are checking
        if (tx.date <= end) {
          const pAtTx = getPrincipalAt(tx.date);
          if (pAtTx > maxPrincipalInCycle) maxPrincipalInCycle = pAtTx;
        }
      }
    }

    // Charge the interest for this whole 30-day block
    totalInterest += (maxPrincipalInCycle * loan.interestRate / 100);

    // Move to next 30-day cycle
    currentCycleStart = new Date(currentCycleEnd);
    currentCycleStart.setDate(currentCycleStart.getDate() + 1);
  }

  const interestPaidTotal = (loan.transactions || [])
    .filter(t => t.type === 'Interest Payment' && getLocalDate(t.date) <= end)
    .reduce((sum, t) => sum + t.amount, 0);

  return Math.max(0, totalInterest - interestPaidTotal);
};

export const isOldPending = (loan: LoanEntry) => {
  if (loan.status !== 'Active') return false;

  const now = new Date();
  const loanDate = new Date(loan.date);
  
  // Calculate months since loan date
  const monthsSinceLoan = (now.getFullYear() - loanDate.getFullYear()) * 12 + (now.getMonth() - loanDate.getMonth());

  if (monthsSinceLoan >= 11) return true;

  // Calculate months since last interest payment
  const interestTxs = (loan.transactions || []).filter(t => t.type === 'Interest Payment');
  if (interestTxs.length > 0) {
    const lastInterestTx = interestTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const lastInterestDate = new Date(lastInterestTx.date);
    const monthsSinceLastInterest = (now.getFullYear() - lastInterestDate.getFullYear()) * 12 + (now.getMonth() - lastInterestDate.getMonth());
    if (monthsSinceLastInterest >= 11) return true;
  }

  return false;
};

export const getCurrentPrincipal = (loan: LoanEntry) => {
  let p = loan.amount;
  loan.transactions?.forEach(t => {
    if (t.type === 'Loan Addition') p += t.amount;
    if (t.type === 'Principal Payment') p -= t.amount;
  });
  return p;
};

export const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  // Safe RFC4122 version 4 compliant fallback UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const encodeLedgerData = (loans: LoanEntry[]): string => {
  try {
    const json = JSON.stringify(loans);
    const bytes = new TextEncoder().encode(json);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return window.btoa(binString);
  } catch (e) {
    console.error("Encoding failed", e);
    return '';
  }
};

export const decodeLedgerData = (base64: string): LoanEntry[] | null => {
  try {
    const cleanBase64 = base64.trim().replace(/\s/g, '');
    const binString = window.atob(cleanBase64);
    const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (Array.isArray(data)) return data;
    return null;
  } catch (e) {
    console.error("Decoding failed", e);
    return null;
  }
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[Safe Storage] localStorage.getItem was blocked for key "${key}":`, e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[Safe Storage] localStorage.setItem was blocked for key "${key}":`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[Safe Storage] localStorage.removeItem was blocked for key "${key}":`, e);
    }
  }
};

export const parseCSVToLedger = (csvString: string): LoanEntry[] => {
  const result: LoanEntry[] = [];
  
  // Strip potential UTF-8 Byte Order Mark (BOM)
  const cleanCsvString = csvString.replace(/^\ufeff/, '').trim();
  
  // Detect delimiter (comma or semicolon)
  const firstLine = cleanCsvString.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  
  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    return fields;
  };

  const lines = cleanCsvString.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const headerMap: { [key: string]: number } = {};
  headers.forEach((h, index) => {
    headerMap[h.toLowerCase().replace(/[\s_]+/g, '')] = index;
  });

  const hasRequiredHeaders = ('name' in headerMap && 'serial' in headerMap) || 
                             ('guardian' in headerMap && 'principalamount' in headerMap) ||
                             'name' in headerMap ||
                             'guardian' in headerMap;
  
  if (!hasRequiredHeaders) {
    throw new Error("Columns could not be parsed. Ensure the file contains headers matching Serial, Name, Guardian, Address, or Principal Amount.");
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    const getVal = (key: string): string => {
      const idx = headerMap[key];
      let val = idx !== undefined && idx < parts.length ? parts[idx] : '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      return val.replace(/""/g, '"').trim();
    };

    const serialNum = parseInt(getVal('serial'), 10) || (1001 + result.length);
    const dateStr = getVal('date') || new Date().toISOString().split('T')[0];
    const name = getVal('name') || 'Unnamed Customer';
    const guardian = getVal('guardian') || '';
    const address = getVal('address') || '';
    const contact = getVal('contact') || '';
    
    let metal: 'Gold' | 'Silver' | 'Both' = 'Gold';
    const rawMetal = getVal('metal').toLowerCase();
    if (rawMetal.includes('silver')) {
      metal = 'Silver';
    } else if (rawMetal.includes('both')) {
      metal = 'Both';
    }
    
    const weightVal = parseFloat(getVal('weight')) || 0;
    const netWeightVal = parseFloat(getVal('netweight')) || 0;
    const amountVal = parseFloat(getVal('principalamount')) || parseFloat(getVal('amount')) || 0;
    const interestVal = parseFloat(getVal('interestrate')) || 2.0;
    
    let statusVal: 'Active' | 'Closed' = 'Active';
    const rawStatus = getVal('status').toLowerCase();
    if (rawStatus === 'closed' || rawStatus === 'settled') {
      statusVal = 'Closed';
    }

    const entry: LoanEntry = {
      id: generateUUID(),
      serialNumber: serialNum,
      date: dateStr,
      name: name,
      guardian: guardian,
      address: address,
      contactNumber: contact,
      metalType: metal,
      description: `Imported via CSV/Excel (${metal === 'Gold' ? 'Au' : 'Ag'}: ${weightVal}g)`,
      weight: weightVal,
      netWeight: netWeightVal,
      amount: amountVal,
      interestRate: interestVal,
      status: statusVal,
      remark: 'Spreadsheet import fallback',
      transactions: [],
      isDeleted: false
    };

    result.push(entry);
  }

  return result;
};


