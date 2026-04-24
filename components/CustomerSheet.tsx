
import React, { useMemo, useState } from 'react';
import { Search, IndianRupee, Briefcase, ChevronRight, User, CheckCircle, AlertCircle } from 'lucide-react';
import { LoanEntry } from '../types';
import { getCurrentPrincipal, isOldPending } from '../src/utils';

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
}

const CustomerSheet: React.FC<CustomerSheetProps> = ({ loans }) => {
  const [searchTerm, setSearchTerm] = useState('');

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
          items: []
        });
      }

      const summary = customerMap.get(key)!;
      summary.totalPrincipal += loan.amount;
      summary.totalLoans += 1;
      
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
          <div key={customer.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
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
            
            <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-1 transition-colors">
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
    </div>
  );
};

export default CustomerSheet;
