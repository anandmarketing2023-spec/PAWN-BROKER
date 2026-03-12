
export type MetalType = 'Gold' | 'Silver' | 'Both';

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
  amount: number;
  interestRate: number;
  status: 'Active' | 'Closed';
  settledInterest?: number;
  imageUrl?: string;
  isDeleted?: boolean;
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
