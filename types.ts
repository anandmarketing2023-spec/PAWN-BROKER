
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
  remark: string;
  amount: number;
  interestRate: number;
  status: 'Active' | 'Closed';
}

export interface Statistics {
  totalPrincipal: number;
  totalInterestMonthly: number;
  activeLoansCount: number;
  goldLoansCount: number;
  silverLoansCount: number;
}
