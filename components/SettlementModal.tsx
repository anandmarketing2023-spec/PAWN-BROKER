import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, IndianRupee, Printer } from 'lucide-react';
import { LoanEntry } from '../types';

interface SettlementModalProps {
  loan: LoanEntry;
  onClose: () => void;
  onConfirm: (id: string, date: string, settledInterest: number) => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ loan, onClose, onConfirm }) => {
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);

  const calculateInterest = (amount: number, rate: number, date: string, closeDate: string) => {
    const start = new Date(date);
    const end = new Date(closeDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalMonths = Math.max(1, Math.ceil(diffDays / 30)); 
    return (amount * rate / 100) * totalMonths;
  };

  const initialInterest = calculateInterest(loan.amount, loan.interestRate, loan.date, settlementDate);
  const [settledInterest, setSettledInterest] = useState(initialInterest);

  // Update interest when date changes
  React.useEffect(() => {
    setSettledInterest(calculateInterest(loan.amount, loan.interestRate, loan.date, settlementDate));
  }, [settlementDate, loan.amount, loan.interestRate, loan.date]);

  const total = loan.amount + Number(settledInterest);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Settlement Receipt - ${loan.serialNumber}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 12px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .label { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: bold; margin-top: 4px; }
            .financials { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
            .row { display: flex; justify-between: space-between; margin-bottom: 10px; }
            .row:last-child { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px; font-size: 18px; }
            .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 50px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BALAJI PAWN BROKERS</h1>
            <p>Settlement Receipt • Serial No: ${String(loan.serialNumber).padStart(4, '0')}</p>
          </div>
          
          <div class="details">
            <div>
              <div class="label">Customer Name</div>
              <div class="value">${loan.name}</div>
            </div>
            <div>
              <div class="label">Settlement Date</div>
              <div class="value">${new Date(settlementDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="label">Item Description</div>
              <div class="value">${loan.description} (${loan.metalType})</div>
            </div>
            <div>
              <div class="label">Booking Date</div>
              <div class="value">${new Date(loan.date).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="financials">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Principal Amount</span>
              <span>₹${loan.amount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Interest (${loan.interestRate}% p.m.)</span>
              <span>₹${Number(settledInterest).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
              <span>Total Paid</span>
              <span>₹${total.toLocaleString()}</span>
            </div>
          </div>

          <div style="margin-top: 80px; display: flex; justify-content: space-between;">
            <div style="border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 5px; font-size: 10px;">Customer Signature</div>
            <div style="border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 5px; font-size: 10px;">Authorized Signatory</div>
          </div>

          <div class="footer">
            Thank you for your business. This is a computer generated receipt.
          </div>

          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

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
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">₹</span>
                <input 
                  type="number"
                  value={settledInterest}
                  onChange={(e) => setSettledInterest(Number(e.target.value))}
                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-bold text-green-600 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                />
              </div>
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
              onClick={handlePrint}
              className="px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              title="Print Receipt"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={() => onConfirm(loan.id, settlementDate, settledInterest)}
              className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-100 flex items-center justify-center gap-2 transition-all active:scale-95"
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
