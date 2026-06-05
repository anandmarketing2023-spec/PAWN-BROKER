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
    const utf8Bytes = new TextEncoder().encode(json);
    let binary = '';
    const len = utf8Bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return window.btoa(binary);
  } catch (e) {
    console.error("Encoding failed", e);
    return '';
  }
};

export const decodeLedgerData = (base64: string): LoanEntry[] | null => {
  try {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (Array.isArray(data)) return data;
    return null;
  } catch (e) {
    console.error("Decoding failed", e);
    return null;
  }
};

