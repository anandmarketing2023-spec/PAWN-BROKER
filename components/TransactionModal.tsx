import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, IndianRupee, Plus, Minus, History } from 'lucide-react';
import { LoanEntry, Transaction } from '../types';

interface TransactionModalProps {
  loan: LoanEntry;
  onClose: () => void;
  onSave: (id: string, transaction: Transaction) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ loan, onClose, onSave }) => {
  const [type, setType] = useState<'Loan Addition' | 'Principal Payment' | 'Interest Payment'>('Principal Payment');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState('');

  const calculateCurrentPrincipal = (loan: LoanEntry) => {
    let principal = loan.amount;
    loan.transactions?.forEach(t => {
      if (t.type === 'Loan Addition') principal += t.amount;
      if (t.type === 'Principal Payment') principal -= t.amount;
    });
    return principal;
  };

  const currentPrincipal = calculateCurrentPrincipal(loan);

  const handleSave = () => {
    if (amount <= 0) return;
    
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      date,
      amount,
      type,
      remark: remark.trim() || undefined
    };

    onSave(loan.id, transaction);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-800 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Manage Transactions</h2>
            <p className="text-slate-400 text-xs mt-1">#{String(loan.serialNumber).padStart(4, '0')} • {loan.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Current Principal</span>
              <div className="flex items-center text-xl font-black text-blue-600">
                <IndianRupee size={18} />
                <span>{currentPrincipal.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Interest Paid</span>
              <div className="flex items-center text-xl font-black text-slate-600">
                <IndianRupee size={18} />
                <span>{loan.transactions?.filter(t => t.type === 'Interest Payment').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Add New Transaction */}
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} /> New Transaction
            </h3>
            
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
              <button 
                onClick={() => setType('Principal Payment')}
                className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border-2 flex flex-col items-center justify-center ${
                  type === 'Principal Payment' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-slate-100 text-slate-400'
                }`}
              >
                <Minus size={14} className="mb-1" />
                <span>Pay Principal</span>
              </button>
              <button 
                onClick={() => setType('Interest Payment')}
                className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border-2 flex flex-col items-center justify-center ${
                  type === 'Interest Payment' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white border-slate-100 text-slate-400'
                }`}
              >
                <CheckCircle2 size={14} className="mb-1" />
                <span>Pay Interest</span>
              </button>
              <button 
                onClick={() => setType('Loan Addition')}
                className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border-2 flex flex-col items-center justify-center ${
                  type === 'Loan Addition' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-400'
                }`}
              >
                <Plus size={14} className="mb-1" />
                <span>Add Principal</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Amount</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <IndianRupee size={16} />
                  </div>
                  <input 
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none transition-all font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Remark (Optional)</label>
              <input 
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Ex: Partial payment for Diwali"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none transition-all text-sm font-medium"
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={amount <= 0}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <SaveIcon size={20} />
              Save Transaction
            </button>
          </div>

          {/* History */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History size={14} /> Transaction History
            </h3>
            
            {(!loan.transactions || loan.transactions.length === 0) ? (
              <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-sm italic">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...loan.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        t.type === 'Loan Addition' ? 'bg-blue-100 text-blue-600' : 
                        t.type === 'Principal Payment' ? 'bg-red-100 text-red-600' : 
                        'bg-green-100 text-green-600'
                      }`}>
                        {t.type === 'Loan Addition' ? <Plus size={14} /> : 
                         t.type === 'Principal Payment' ? <Minus size={14} /> : 
                         <CheckCircle2 size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{t.type}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{new Date(t.date).toLocaleDateString()}</p>
                        {t.remark && <p className="text-[10px] text-slate-500 italic mt-0.5">{t.remark}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${
                        t.type === 'Loan Addition' ? 'text-blue-600' : 
                        t.type === 'Principal Payment' ? 'text-red-600' : 
                        'text-green-600'
                      }`}>
                        {t.type === 'Principal Payment' ? '-' : t.type === 'Interest Payment' ? '' : '+'}₹{t.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SaveIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);

export default TransactionModal;
