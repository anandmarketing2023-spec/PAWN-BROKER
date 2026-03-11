import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, IndianRupee } from 'lucide-react';
import { LoanEntry } from '../types';

interface SettlementModalProps {
  loan: LoanEntry;
  onClose: () => void;
  onConfirm: (id: string, date: string) => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ loan, onClose, onConfirm }) => {
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);

  const calculateInterest = (amount: number, rate: number, date: string, closeDate: string) => {
    const start = new Date(date);
    const end = new Date(closeDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = diffDays / 30;
    const totalMonths = Math.max(1, Math.round(months * 100) / 100); 
    return (amount * rate / 100) * totalMonths;
  };

  const interest = calculateInterest(loan.amount, loan.interestRate, loan.date, settlementDate);
  const total = loan.amount + interest;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-yellow-500 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Settle Loan</h2>
            <p className="text-yellow-100 text-xs mt-1">#{String(loan.serialNumber).padStart(4, '0')} • {loan.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar size={14} /> Settlement Date
            </label>
            <input 
              type="date" 
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium"
            />
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Principal Amount</span>
              <span className="font-bold text-slate-800">₹{loan.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Interest ({loan.interestRate}% p.m.)</span>
              <span className="font-bold text-green-600">+₹{interest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-slate-800 font-bold">Total Payable</span>
              <div className="flex items-center text-xl font-black text-yellow-600">
                <IndianRupee size={20} />
                <span>{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(loan.id, settlementDate)}
              className="flex-[2] px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-100 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 size={20} />
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;
