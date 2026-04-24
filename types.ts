
export type MetalType = 'Gold' | 'Silver' | 'Both';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'Loan Addition' | 'Principal Payment' | 'Interest Payment';
  remark?: string;
}

export interface LoanEntry {
  id: string;
  serialNumber: number;
  date: string;
  closeDate?: string;
  name: string;
  guardian: string;
  address: string;
  contactNumber: string;
  metalType: MetalType;
  description: string;
  weight: number;
  netWeight: number;
  goldWeight?: number;
  goldNetWeight?: number;
  silverWeight?: number;
  silverNetWeight?: number;
  remark: string;
  amount: number; // This should be considered the CURRENT principal or INITIAL principal? 
  // Let's keep it as initial principal and use transactions to calculate current.
  interestRate: number;
  status: 'Active' | 'Closed';
  settledInterest?: number;
  imageUrl?: string;
  isDeleted?: boolean;
  transactions?: Transaction[];
}

export interface BackupConfig {
  frequency: 'Daily' | 'Weekly';
  lastBackup?: string;
  enabled: boolean;
}

export interface BackupEntry {
  id: string;
  timestamp: string;
  type: 'Daily' | 'Weekly' | 'Manual';
  recordCount: number;
  data: LoanEntry[];
}

export interface Statistics {
  totalPrincipal: number;
  totalInterestMonthly: number;
  activeLoansCount: number;
  goldLoansCount: number;
  silverLoansCount: number;
}
