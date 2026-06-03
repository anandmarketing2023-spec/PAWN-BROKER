
import React, { useMemo, useState } from 'react';
import { Search, IndianRupee, Briefcase, ChevronRight, User, CheckCircle, AlertCircle, X, MapPin, Phone, Calendar, Clock, Coins } from 'lucide-react';
import { LoanEntry } from '../types';
import { calculateInterest, getCurrentPrincipal, isOldPending } from '../src/utils';

interface CustomerSheetProps {
  loans: LoanEntry[];
}

interface CustomerSummary {
  id: string;
  name: string;
  guardian: string;
  contactNumber: string;
  address: string;
  totalPrincipal: number;
  activePrincipal: number;
  totalLoans: number;
  totalActiveLoans: number;
  hasOldPending: boolean;
  items: {
    metalType: string;
    totalWeight: number;
    descriptions: string[];
    isActive: boolean;
  }[];
  loansList: LoanEntry[];
}

const CustomerSheet: React.FC<CustomerSheetProps> = ({ loans }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  const customerData = useMemo(() => {
    const customerMap = new Map<string, CustomerSummary>();

    loans.forEach((loan) => {
      const key = `${loan.name.trim().toLowerCase()}_${loan.contactNumber.trim()}`;
      
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: loan.id,
          name: loan.name,
          guardian: loan.guardian,
          contactNumber: loan.contactNumber,
          address: loan.address,
          totalPrincipal: 0,
          activePrincipal: 0,
          totalLoans: 0,
          totalActiveLoans: 0,
          hasOldPending: false,
          items: [],
          loansList: []
        });
      }

      const summary = customerMap.get(key)!;
      summary.totalPrincipal += loan.amount;
      summary.totalLoans += 1;
      summary.loansList.push(loan);
      
      if (loan.status === 'Active') {
        summary.activePrincipal += getCurrentPrincipal(loan);
        summary.totalActiveLoans += 1;
        if (isOldPending(loan)) {
          summary.hasOldPending = true;
        }
      }

      // Group items
      const processItem = (metalType: string, weight: number, description: string) => {
        let metalItem = summary.items.find(i => i.metalType === metalType && i.isActive === (loan.status === 'Active'));
        if (!metalItem) {
          metalItem = { metalType, totalWeight: 0, descriptions: [], isActive: loan.status === 'Active' };
          summary.items.push(metalItem);
        }
        metalItem.totalWeight += weight;
        if (!metalItem.descriptions.includes(description)) {
          metalItem.descriptions.push(description);
        }
      };

      if (loan.metalType === 'Both') {
        if (loan.goldWeight || loan.goldNetWeight) {
          processItem('Gold', loan.goldNetWeight || loan.goldWeight || 0, `${loan.description} (Gold part)`);
        }
        if (loan.silverWeight || loan.silverNetWeight) {
          processItem('Silver', loan.silverNetWeight || loan.silverWeight || 0, `${loan.description} (Silver part)`);
        }
        // If no separate weights, fallback to 50/50
        if (!loan.goldWeight && !loan.silverWeight) {
          processItem('Gold', (loan.netWeight || loan.weight) * 0.5, `${loan.description} (50% Gold)`);
          processItem('Silver', (loan.netWeight || loan.weight) * 0.5, `${loan.description} (50% Silver)`);
        }
      } else {
        processItem(loan.metalType, loan.netWeight || loan.weight, loan.description);
      }
    });

    return Array.from(customerMap.values())
      .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.contactNumber.includes(searchTerm)
      )
      .sort((a, b) => b.activePrincipal - a.activePrincipal || b.totalPrincipal - a.totalPrincipal);
  }, [loans, searchTerm]);

  // Calculations for selected customer's live metrics inside modal
  const selectedMetrics = useMemo(() => {
    if (!selectedCustomer) return null;

    const activeList = selectedCustomer.loansList.filter(l => l.status === 'Active');
    const closedList = selectedCustomer.loansList.filter(l => l.status === 'Closed');

    const totalLiveInterest = activeList.reduce((sum, l) => sum + calculateInterest(l), 0);
    const overallSettledInterest = closedList.reduce((sum, l) => sum + (l.settledInterest || 0), 0);

    return {
      totalLiveInterest,
      overallSettledInterest,
      activeLoansCount: activeList.length,
      closedLoansCount: closedList.length,
      totalOutstanding: selectedCustomer.activePrincipal + totalLiveInterest
    };
  }, [selectedCustomer]);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Customer Balance Sheet</h1>
        <p className="text-slate-500">Aggregated view of customer exposure and assets</p>
      </header>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-3 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search customer by name or mobile number..."
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customerData.map((customer) => (
          <div 
            key={customer.id} 
            onClick={() => setSelectedCustomer(customer)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-yellow-200 cursor-pointer transition-all duration-200"
          >
            <div className="p-6 border-b border-slate-50">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${customer.totalActiveLoans > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}>
                    <User size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xl font-bold ${customer.totalActiveLoans > 0 ? (customer.hasOldPending ? 'text-red-600' : 'text-slate-800') : 'text-slate-400'}`}>{customer.name}</h3>
                      {customer.hasOldPending && (
                        <div className="flex items-center gap-1">
                          <AlertCircle size={12} className="text-red-500" />
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-tight bg-red-50 px-2 py-0.5 rounded border border-red-100">Old Pending</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${customer.hasOldPending ? 'text-red-400' : 'text-slate-500'}`}>{customer.guardian}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center font-bold text-lg justify-end ${customer.totalActiveLoans > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                    <IndianRupee size={16} />
                    <span>{customer.activePrincipal.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active Principal</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${customer.totalActiveLoans > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-50 text-slate-500'}`}>
                  <Briefcase size={12} />
                  <span>{customer.totalActiveLoans} Active / {customer.totalLoans} Total</span>
                </div>
                {customer.totalActiveLoans === 0 && (
                  <div className="bg-red-50 px-3 py-1 rounded-full text-xs font-bold text-red-600 flex items-center space-x-1">
                    <CheckCircle size={12} />
                    <span>ALL PAID</span>
                  </div>
                )}
                <div className={`text-xs ${customer.hasOldPending ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                  {customer.contactNumber}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/30">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Asset Inventory</h4>
              <div className="space-y-4">
                {customer.items.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between ${!item.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-8 rounded-full ${
                        !item.isActive ? 'bg-slate-300' :
                        item.metalType === 'Gold' ? 'bg-yellow-400' :
                        item.metalType === 'Silver' ? 'bg-slate-400' :
                        'bg-orange-300'
                      }`} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-bold text-slate-700">{item.metalType}</p>
                          {!item.isActive && <span className="text-[9px] font-bold text-red-500 border border-red-200 px-1 rounded uppercase">PAID</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {item.descriptions.join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-800">{item.totalWeight.toFixed(2)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCustomer(customer);
              }}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-1 transition-colors"
            >
              <span>Full Transaction History</span>
              <ChevronRight size={14} />
            </button>
          </div>
        ))}

        {customerData.length === 0 && (
          <div className="md:col-span-2 py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 italic">No customers found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* DETAILED TRANSACTION HISTORY MODAL */}
      {selectedCustomer && selectedMetrics && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-6 text-white flex justify-between items-start shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 text-amber-50 px-2 py-0.5 rounded-md">
                  Pawn Customer Records
                </span>
                <h2 className="text-2xl font-black">{selectedCustomer.name}</h2>
                <div className="flex flex-wrap gap-4 text-xs text-amber-50 mt-1">
                  <span className="flex items-center gap-1">
                    <User size={14} />
                    S/o, W/o: <strong>{selectedCustomer.guardian}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={14} />
                    Mobile: <strong>{selectedCustomer.contactNumber}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    Residence: <strong>{selectedCustomer.address}</strong>
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="bg-white/10 hover:bg-white/25 text-white p-2 rounded-full transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-slate-50/50">
              {/* Financial Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Principal</span>
                  <p className="text-lg font-black text-slate-800 mt-1">₹{selectedCustomer.activePrincipal.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Accum. Interest</span>
                  <p className="text-lg font-black text-yellow-600 mt-1">₹{Math.round(selectedMetrics.totalLiveInterest).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between bg-emerald-50/30">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-emerald-800">Total Settle Balance</span>
                  <p className="text-lg font-black text-emerald-600 mt-1">₹{Math.round(selectedMetrics.totalOutstanding).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account Stats</span>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    <span className="text-yellow-600">{selectedMetrics.activeLoansCount} Active</span> • <span className="text-slate-400">{selectedMetrics.closedLoansCount} Paid</span>
                  </p>
                </div>
              </div>

              {/* Loans / Accounts Timeline */}
              <div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">Historical Girvi Ledgers & Ledg. Chronicle</h3>
                <div className="space-y-6">
                  {selectedCustomer.loansList
                    .slice()
                    .sort((a, b) => b.serialNumber - a.serialNumber)
                    .map((loan) => {
                      const currentP = getCurrentPrincipal(loan);
                      const pendingInt = loan.status === 'Closed' && loan.settledInterest !== undefined ? loan.settledInterest : calculateInterest(loan);
                      const totalDue = currentP + pendingInt;
                      
                      return (
                        <div key={loan.id} className={`bg-white rounded-2xl border ${loan.status === 'Closed' ? 'border-slate-100 bg-slate-50/50' : 'border-yellow-200'} shadow-sm overflow-hidden`}>
                          {/* Inner Header */}
                          <div className={`p-4 flex flex-wrap items-center justify-between gap-2 border-b ${loan.status === 'Closed' ? 'bg-slate-50 border-slate-100' : 'bg-yellow-500/5 border-yellow-100'}`}>
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                                #{String(loan.serialNumber).padStart(4, '0')}
                              </span>
                              <span className="text-xs font-black uppercase text-slate-700">
                                {loan.metalType} Loan
                              </span>
                              {isOldPending(loan) && (
                                <span className="text-[9px] font-black text-red-600 uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                                  <AlertCircle size={10} /> Old Pending
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              loan.status === 'Closed' ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'
                            }`}>
                              {loan.status}
                            </span>
                          </div>

                          {/* Account Summary Metrics */}
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50/20 text-xs">
                            <div>
                              <p className="text-slate-400 font-bold uppercase text-[9px]">Pawn Start & Rate</p>
                              <p className="text-slate-700 font-bold mt-0.5 flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" />
                                {new Date(loan.date).toLocaleDateString()} ({loan.interestRate}%)
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-bold uppercase text-[9px]">Initial Principal</p>
                              <p className="text-slate-700 font-bold mt-0.5">₹{loan.amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-bold uppercase text-[9px]">Current Principal Outstanding</p>
                              <p className="text-slate-700 font-black mt-0.5 text-yellow-700">₹{currentP.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-bold uppercase text-[9px]">{loan.status === 'Closed' ? 'Interest Settled' : 'Pending Interest'}</p>
                              <p className="text-slate-700 font-bold mt-0.5 text-green-600">+₹{Math.round(pendingInt).toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Inventory specs */}
                          <div className="p-4 bg-amber-50/10 border-b border-slate-100 text-xs">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Ornaments Deposited</span>
                            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
                              <span className="text-slate-700 font-medium">
                                Metal Description: <strong className="text-slate-800">{loan.description}</strong>
                              </span>
                              <span className="text-slate-700 font-medium">
                                Weight: <strong>{loan.weight}g</strong>
                              </span>
                              <span className="text-slate-700 font-medium">
                                Net Weight: <strong>{loan.netWeight}g</strong>
                              </span>
                            </div>
                          </div>

                          {/* Individual Account Transactions history ledger */}
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} /> Transaction Chronicle & Payments Ledger
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                {loan.transactions?.length || 0} transaction{loan.transactions?.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Chronology List */}
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {/* Always list the initial advance transaction */}
                              <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center space-x-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span className="text-slate-400 font-mono">{new Date(loan.date).toLocaleDateString()}</span>
                                  <span className="text-slate-600 font-medium">Original loan advanced and jewelry deposited</span>
                                </div>
                                <span className="font-bold text-slate-500">₹{loan.amount.toLocaleString()}</span>
                              </div>

                              {/* Any sub transactions */}
                              {loan.transactions && loan.transactions.length > 0 ? (
                                loan.transactions
                                  .slice()
                                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                  .map((tx) => (
                                    <div key={tx.id} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                      <div className="flex items-center space-x-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                          tx.type === 'Interest Payment' ? 'bg-green-500' :
                                          tx.type === 'Principal Payment' ? 'bg-emerald-600' :
                                          'bg-blue-500'
                                        }`} />
                                        <span className="text-slate-400 font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${
                                          tx.type === 'Interest Payment' ? 'bg-green-50 text-green-700' :
                                          tx.type === 'Principal Payment' ? 'bg-emerald-50 text-emerald-700' :
                                          'bg-blue-50 text-blue-700'
                                        }`}>
                                          {tx.type === 'Interest Payment' ? 'Paid Int.' : tx.type === 'Principal Payment' ? 'Repaid Princ.' : 'Borrowed More'}
                                        </span>
                                        {tx.remark && (
                                          <span className="text-slate-400 italic font-medium">
                                            (Remark: {tx.remark})
                                          </span>
                                        )}
                                      </div>
                                      <span className={`font-bold ${
                                        tx.type === 'Interest Payment' ? 'text-green-600' :
                                        tx.type === 'Principal Payment' ? 'text-emerald-700' :
                                        'text-blue-600'
                                      }`}>
                                        {tx.type === 'Principal Payment' ? '-' : ''}₹{tx.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  ))
                              ) : null}

                              {/* Close Event if Settled */}
                              {loan.status === 'Closed' && loan.closeDate && (
                                <div className="flex items-center justify-between text-xs p-2.5 bg-red-50 text-red-800 rounded-lg border border-red-100">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-red-400 font-mono">{new Date(loan.closeDate).toLocaleDateString()}</span>
                                    <span className="font-bold flex items-center gap-1 text-red-700">
                                      <CheckCircle size={12} className="inline" /> Account completely settled and closed
                                    </span>
                                  </div>
                                  <span className="font-black text-red-600">
                                    Paid settles: ₹{loan.settledInterest ? loan.settledInterest.toLocaleString() : '0'} Int.
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-700 text-xs font-black uppercase tracking-wider transition-all"
              >
                Close Records Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSheet;
