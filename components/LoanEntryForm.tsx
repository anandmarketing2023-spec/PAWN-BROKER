
import React, { useState, useEffect } from 'react';
import { Save, User, MapPin, Phone, Scale, Info, MessageSquare, X, CheckCircle2, Calendar, Percent } from 'lucide-react';
import { LoanEntry, MetalType } from '../types';

interface LoanEntryFormProps {
  onSave: (loan: Omit<LoanEntry, 'id' | 'status'> & { status: 'Active' | 'Closed' }) => void;
  nextSerial: number;
  editingLoan: LoanEntry | null;
  onCancel?: () => void;
}

const LoanEntryForm: React.FC<LoanEntryFormProps> = ({ onSave, nextSerial, editingLoan, onCancel }) => {
  const [formData, setFormData] = useState({
    serialNumber: String(nextSerial),
    date: new Date().toISOString().split('T')[0],
    name: '',
    guardian: '',
    address: '',
    contactNumber: '',
    metalType: 'Gold' as MetalType,
    description: '',
    weight: '' as string | number,
    netWeight: '' as string | number,
    remark: '',
    amount: '' as string | number,
    interestRate: '' as string | number,
    status: 'Active' as 'Active' | 'Closed'
  });

  useEffect(() => {
    if (editingLoan) {
      setFormData({
        serialNumber: String(editingLoan.serialNumber),
        date: editingLoan.date,
        name: editingLoan.name,
        guardian: editingLoan.guardian,
        address: editingLoan.address,
        contactNumber: editingLoan.contactNumber,
        metalType: editingLoan.metalType,
        description: editingLoan.description,
        weight: editingLoan.weight,
        netWeight: editingLoan.netWeight,
        remark: editingLoan.remark,
        amount: editingLoan.amount,
        interestRate: editingLoan.interestRate,
        status: editingLoan.status
      });
    } else {
      setFormData(prev => ({ 
        ...prev, 
        serialNumber: String(nextSerial),
        date: new Date().toISOString().split('T')[0],
        interestRate: 3 
      }));
    }
  }, [editingLoan, nextSerial]);

  const handleMetalChange = (metal: MetalType) => {
    let rate = 3;
    if (metal === 'Silver') rate = 4;
    if (metal === 'Both') rate = 3.5;
    setFormData({ ...formData, metalType: metal, interestRate: rate });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      serialNumber: Number(formData.serialNumber),
      weight: Number(formData.weight),
      netWeight: Number(formData.netWeight),
      amount: Number(formData.amount),
      interestRate: Number(formData.interestRate),
      status: formData.status
    });
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all outline-none text-base";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <header className="mb-6 flex justify-between items-center px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{editingLoan ? 'Edit Ledger' : 'New Girvi Entry'}</h1>
          <p className="text-xs text-slate-500 font-medium">Step-by-step documentation</p>
        </div>
        {editingLoan && (
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-800 transition-colors bg-white rounded-xl border border-slate-200 shadow-sm">
            <X size={20} />
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>S.No (Serial)</label>
              <input type="number" className={`${inputClass} font-mono font-bold`} value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} required />
            </div>
            <div>
              <label className={labelClass}>Booking Date</label>
              <input type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div>
              <label className={labelClass}>Payment Status</label>
              <select 
                className={`${inputClass} font-bold ${formData.status === 'Active' ? 'text-blue-600' : 'text-red-600'}`}
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Active">UNPAID (Active)</option>
                <option value="Closed">PAID (Closed)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Customer Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" className={inputClass} placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input type="text" className={inputClass} placeholder="Father/Guardian Name" value={formData.guardian} onChange={e => setFormData({...formData, guardian: e.target.value})} required />
              <input type="tel" className={inputClass} placeholder="Mobile Number" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} required />
              <input type="text" className={inputClass} placeholder="Complete Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
            </div>
          </div>

          <div className="space-y-4 pt-4">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Asset & Collateral</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select className={inputClass} value={formData.metalType} onChange={e => handleMetalChange(e.target.value as any)}>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Both">Both</option>
                </select>
                <div className="md:col-span-2">
                  <input type="text" className={inputClass} placeholder="e.g. 2 Gold Bangles" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Gross (g)</label>
                  <input type="number" step="0.001" className={inputClass} value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Net (g)</label>
                  <input type="number" step="0.001" className={inputClass} value={formData.netWeight} onChange={e => setFormData({...formData, netWeight: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Principal</label>
                  <input type="number" className={`${inputClass} font-bold text-lg`} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Interest %</label>
                  <input type="number" step="0.01" className={`${inputClass} font-bold text-yellow-700 bg-yellow-50`} value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})} required />
                </div>
             </div>
          </div>

          {editingLoan && formData.status === 'Closed' && (
            <div className="bg-red-600 rounded-2xl p-4 md:p-6 text-white flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <CheckCircle2 size={24} />
                 <span className="font-bold text-sm md:text-base">Fully Settled Account</span>
               </div>
               <div className="text-right">
                 <p className="text-[9px] uppercase font-bold opacity-80">Closed On</p>
                 <p className="font-black text-sm md:text-lg">{new Date(editingLoan.closeDate || new Date()).toLocaleDateString()}</p>
               </div>
            </div>
          )}

          <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl shadow-xl shadow-yellow-100 transition-all flex items-center justify-center space-x-2">
            <Save size={22} />
            <span className="uppercase tracking-widest text-sm">{editingLoan ? 'Update Record' : 'Save to Ledger'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanEntryForm;
