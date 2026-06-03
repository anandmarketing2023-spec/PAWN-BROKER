import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, IndianRupee, Printer, AlertCircle } from 'lucide-react';
import { LoanEntry } from '../types';
import { calculateInterest, getCurrentPrincipal } from '../src/utils';

interface SettlementModalProps {
  loan: LoanEntry;
  onClose: () => void;
  onConfirm: (id: string, date: string, settledInterest: number) => void;
  onRenew: (oldLoanId: string, settlementDate: string, settledInterest: number, newLoanDetails: { amount: number, date: string, interestRate: number }) => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ loan, onClose, onConfirm, onRenew }) => {
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRenewMode, setIsRenewMode] = useState(false);
  
  // New loan fields for Renewal
  const [newAmount, setNewAmount] = useState(getCurrentPrincipal(loan));
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newInterestRate, setNewInterestRate] = useState(loan.interestRate);

  const previousInterestPaid = (loan.transactions || [])
    .filter(t => t.type === 'Interest Payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const getGrossInterest = (loan: LoanEntry, date: string) => {
    // We add back the paid interest to get the gross accrued, using our helper
    return calculateInterest(loan, date) + previousInterestPaid;
  };

  const initialPendingInterest = calculateInterest(loan, settlementDate);
  const [settledInterest, setSettledInterest] = useState(initialPendingInterest);

  // Update interest when date changes
  React.useEffect(() => {
    setSettledInterest(calculateInterest(loan, settlementDate));
    setIsConfirmingUnderpay(false);
  }, [settlementDate, loan]);

  React.useEffect(() => {
    if (!isUnderpaid) setIsConfirmingUnderpay(false);
  }, [settledInterest, initialPendingInterest]);

  const [isConfirmingUnderpay, setIsConfirmingUnderpay] = useState(false);

  const currentPrincipal = getCurrentPrincipal(loan);
  const total = currentPrincipal + Number(settledInterest);
  const grossInterest = getGrossInterest(loan, settlementDate);

  const isUnderpaid = settledInterest < initialPendingInterest - 1; // Tolerance for floating point

  const handleConfirm = () => {
    if (isUnderpaid && !isConfirmingUnderpay) {
      setIsConfirmingUnderpay(true);
      return;
    }
    
    if (isRenewMode) {
      onRenew(loan.id, settlementDate, settledInterest, {
        amount: newAmount,
        date: newDate,
        interestRate: newInterestRate
      });
    } else {
      onConfirm(loan.id, settlementDate, settledInterest);
    }
  };

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
              <span>Current Principal</span>
              <span>₹${currentPrincipal.toLocaleString()}</span>
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
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] sm:max-h-[90vh]">
        <div className="bg-yellow-500 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Settle Loan</h2>
            <p className="text-yellow-100 text-xs mt-1">#{String(loan.serialNumber).padStart(4, '0')} • {loan.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
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
              <span className="text-slate-500 text-sm">Principal (Current)</span>
              <span className="font-bold text-slate-800">₹{currentPrincipal.toLocaleString()}</span>
            </div>
            
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Accrued Interest</span>
                <span>₹{grossInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                <span>Interest Already Paid</span>
                <span>-₹{previousInterestPaid.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-slate-500 text-sm">Interest to Settle Now</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">₹</span>
                <input 
                  type="number"
                  value={settledInterest}
                  onChange={(e) => setSettledInterest(Number(e.target.value))}
                  className={`w-24 px-2 py-1 bg-white border rounded-lg text-right font-bold focus:ring-2 focus:ring-yellow-500 outline-none transition-all ${
                    isUnderpaid ? 'text-red-600 border-red-200' : 'text-green-600 border-slate-200'
                  }`}
                />
              </div>
            </div>

            {isUnderpaid && (
              <div className="bg-red-50 p-2 rounded-lg border border-red-100 flex items-start gap-2">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-600 font-bold leading-tight">
                  Warning: The interest payment entered is less than the calculated pending amount (₹{initialPendingInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}).
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-slate-800 font-bold">Total Final Settlement</span>
              <div className="flex items-center text-xl font-black text-yellow-600">
                <IndianRupee size={20} />
                <span>{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Renew Toggle */}
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex flex-col">
                <span className="text-sm font-black text-blue-700 uppercase tracking-tight">Renew This Article</span>
                <span className="text-[10px] text-blue-500 font-bold uppercase">Close old & start new account</span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isRenewMode}
                  onChange={() => setIsRenewMode(!isRenewMode)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>

            {isRenewMode && (
              <div className="mt-4 pt-4 border-t border-blue-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 ml-1">New Amount</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                        <IndianRupee size={16} />
                      </div>
                      <input 
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 ml-1">New Int. Rate %</label>
                    <input 
                      type="number"
                      value={newInterestRate}
                      onChange={(e) => setNewInterestRate(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 ml-1">New Entry Date</label>
                  <input 
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-800"
                  />
                </div>
              </div>
            )}
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
              onClick={handleConfirm}
              className={`flex-1 px-4 py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isConfirmingUnderpay 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-100 text-white animate-pulse' 
                : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-100'
              }`}
            >
              {isConfirmingUnderpay ? (
                <>
                  <AlertCircle size={20} />
                  Confirm Underpayment?
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  {isRenewMode ? 'Settle & Renew' : 'Confirm Payment'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;
