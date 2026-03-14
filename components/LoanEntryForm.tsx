import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Phone, X, CheckCircle2, Search, User } from 'lucide-react';
import { LoanEntry, MetalType } from '../types';
import Modal from './Modal';
import OrnamentCamera from './OrnamentCamera';

// Prop types 
// Fixed: removed contradictory Omit<,'status'> & { status } pattern
interface LoanEntryFormProps {
  onSave: (loan: Omit<LoanEntry, 'id' | 'isDeleted'>) => void;
  nextSerial: number;
  editingLoan: LoanEntry | null;
  existingLoans?: LoanEntry[];   // For customer autofill
  onCancel?: () => void;
}

type FormData = {
  serialNumber: string;
  date: string;
  name: string;
  guardian: string;
  address: string;
  contactNumber: string;
  metalType: MetalType;
  description: string;
  weight: string;
  netWeight: string;
  goldWeight: string;
  goldNetWeight: string;
  silverWeight: string;
  silverNetWeight: string;
  remark: string;
  amount: string;
  interestRate: string;
  status: 'Active' | 'Closed';
  imageUrl: string;
};

const defaultForm = (serial: number): FormData => ({
  serialNumber: String(serial),
  date: new Date().toISOString().split('T')[0],
  name: '',
  guardian: '',
  address: '',
  contactNumber: '',
  metalType: 'Gold',
  description: '',
  weight: '',
  netWeight: '',
  goldWeight: '',
  goldNetWeight: '',
  silverWeight: '',
  silverNetWeight: '',
  remark: '',
  amount: '',
  interestRate: '3',
  status: 'Active',
  imageUrl: '',
});

const loanToForm = (loan: LoanEntry): FormData => ({
  serialNumber: String(loan.serialNumber),
  date: loan.date,
  name: loan.name,
  guardian: loan.guardian,
  address: loan.address,
  contactNumber: loan.contactNumber,
  metalType: loan.metalType,
  description: loan.description,
  weight: String(loan.weight),
  netWeight: String(loan.netWeight),
  goldWeight: String(loan.goldWeight ?? ''),
  goldNetWeight: String(loan.goldNetWeight ?? ''),
  silverWeight: String(loan.silverWeight ?? ''),
  silverNetWeight: String(loan.silverNetWeight ?? ''),
  remark: loan.remark,
  amount: String(loan.amount),
  interestRate: String(loan.interestRate),
  status: loan.status,
  imageUrl: loan.imageUrl ?? '',
});

const LoanEntryForm: React.FC<LoanEntryFormProps> = ({
  onSave,
  nextSerial,
  editingLoan,
  existingLoans = [],
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormData>(() =>
    editingLoan ? loanToForm(editingLoan) : defaultForm(nextSerial)
  );
  const [nameSuggestions, setNameSuggestions] = useState<LoanEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean; title: string; message: string;
    type: 'info' | 'warning' | 'success' | 'confirm'; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const showModal = useCallback((
    title: string, message: string,
    type: 'info' | 'warning' | 'success' | 'confirm' = 'info',
    onConfirm?: () => void
  ) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  }, []);

  // Sync form when editingLoan changes 
  useEffect(() => {
    if (editingLoan) {
      setFormData(loanToForm(editingLoan));
    } else {
      setFormData(defaultForm(nextSerial));
    }
  }, [editingLoan]); // eslint-disable-line react-hooks/exhaustive-deps

  // When not editing, keep serial in sync with nextSerial
  useEffect(() => {
    if (!editingLoan) {
      setFormData(prev => ({ ...prev, serialNumber: String(nextSerial) }));
    }
  }, [nextSerial, editingLoan]);

  // Customer autofill 
  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    if (value.length >= 2 && existingLoans.length > 0) {
      const seen = new Set<string>();
      const matches = existingLoans
        .filter(l =>
          !l.isDeleted &&
          l.name.toLowerCase().includes(value.toLowerCase()) &&
          !seen.has(l.contactNumber) &&
          seen.add(l.contactNumber)
        )
        .slice(0, 5);
      setNameSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const autofillCustomer = (loan: LoanEntry) => {
    setFormData(prev => ({
      ...prev,
      name: loan.name,
      guardian: loan.guardian,
      address: loan.address,
      contactNumber: loan.contactNumber,
    }));
    setShowSuggestions(false);
    nameInputRef.current?.blur();
  };

  // Metal type change 
  const handleMetalChange = (metal: MetalType) => {
    const rate = metal === 'Silver' ? '4' : metal === 'Both' ? '3.5' : '3';
    setFormData(prev => ({ ...prev, metalType: metal, interestRate: rate }));
  };

  // Submit 
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      serialNumber: Number(formData.serialNumber),
      date: formData.date,
      name: formData.name,
      guardian: formData.guardian,
      address: formData.address,
      contactNumber: formData.contactNumber,
      metalType: formData.metalType,
      description: formData.description,
      weight: Number(formData.weight),
      netWeight: Number(formData.netWeight),
      goldWeight: formData.metalType === 'Both' ? Number(formData.goldWeight) : undefined,
      goldNetWeight: formData.metalType === 'Both' ? Number(formData.goldNetWeight) : undefined,
      silverWeight: formData.metalType === 'Both' ? Number(formData.silverWeight) : undefined,
      silverNetWeight: formData.metalType === 'Both' ? Number(formData.silverNetWeight) : undefined,
      remark: formData.remark,
      amount: Number(formData.amount),
      interestRate: Number(formData.interestRate),
      status: formData.status,
      imageUrl: formData.imageUrl || undefined,
      closeDate: editingLoan?.closeDate,
      settledInterest: editingLoan?.settledInterest,
    });
  };

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

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

          {/* Row 1: Serial, Date, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>S.No (Serial)</label>
              <input type="number" className={`${inputClass} font-mono font-bold`} value={formData.serialNumber} onChange={set('serialNumber')} required />
            </div>
            <div>
              <label className={labelClass}>Booking Date</label>
              <input type="date" className={inputClass} value={formData.date} onChange={set('date')} required />
            </div>
            <div>
              <label className={labelClass}>Payment Status</label>
              <select
                className={`${inputClass} font-bold ${formData.status === 'Active' ? 'text-blue-600' : 'text-red-600'}`}
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'Active' | 'Closed' }))}
              >
                <option value="Active">UNPAID (Active)</option>
                <option value="Closed">PAID (Closed)</option>
              </select>
            </div>
          </div>

          {/* Customer Profile */}
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Customer Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Name with autofill */}
              <div className="relative">
                <div className="relative">
                  <input
                    ref={nameInputRef}
                    type="text"
                    className={inputClass}
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={e => handleNameChange(e.target.value)}
                    onFocus={() => formData.name.length >= 2 && setShowSuggestions(nameSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    required
                    autoComplete="off"
                  />
                  {existingLoans.length > 0 && (
                    <Search size={16} className="absolute right-3 top-3.5 text-slate-300 pointer-events-none" />
                  )}
                </div>
                {showSuggestions && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Returning customers</p>
                    </div>
                    {nameSuggestions.map(loan => (
                      <button
                        key={loan.id}
                        type="button"
                        onMouseDown={() => autofillCustomer(loan)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-yellow-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                          <User size={14} className="text-yellow-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{loan.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Phone size={9} />{loan.contactNumber}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input type="text" className={inputClass} placeholder="Father/Guardian Name" value={formData.guardian} onChange={set('guardian')} required />
              <input type="tel" className={inputClass} placeholder="Mobile Number" value={formData.contactNumber} onChange={set('contactNumber')} required />
              <input type="text" className={inputClass} placeholder="Complete Address" value={formData.address} onChange={set('address')} required />
            </div>
          </div>

          {/* Asset & Collateral */}
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Asset & Collateral</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select className={inputClass} value={formData.metalType} onChange={e => handleMetalChange(e.target.value as MetalType)}>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Both">Both</option>
              </select>
              <div className="md:col-span-2">
                <input type="text" className={inputClass} placeholder="e.g. 2 Gold Bangles" value={formData.description} onChange={set('description')} required />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.metalType !== 'Both' ? (
                <>
                  <div>
                    <label className={labelClass}>Gross (g)</label>
                    <input type="number" step="0.001" className={inputClass} value={formData.weight} onChange={set('weight')} required />
                  </div>
                  <div>
                    <label className={labelClass}>Net (g)</label>
                    <input type="number" step="0.001" className={inputClass} value={formData.netWeight} onChange={set('netWeight')} required />
                  </div>
                </>
              ) : (
                <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gold Details</span>
                  </div>
                  <div>
                    <label className={labelClass}>Gold Gross (g)</label>
                    <input type="number" step="0.001" className={inputClass} value={formData.goldWeight} onChange={set('goldWeight')} required />
                  </div>
                  <div>
                    <label className={labelClass}>Gold Net (g)</label>
                    <input type="number" step="0.001" className={inputClass} value={formData.goldNetWeight} onChange={set('goldNetWeight')} required />
                  </div>
                  <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-1 mt-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Silver Details</span>
                  </div>
                  <div>
                    <label className={labelClass}>Silver Gross (g)</label>
                    <input type="number" step="0.001" className={inputClass} value={formData.silverWeight} onChange={set('silverWeight')} required />
                  </div>
                  <div>
                    <label className={labelClass}>Silver Net (g)</label>
                    <input type="number" step="0.001" className={inputClass} value={formData.silverNetWeight} onChange={set('silverNetWeight')} required />
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>Principal ()</label>
                <input type="number" className={`${inputClass} font-bold text-lg`} value={formData.amount} onChange={set('amount')} required />
              </div>
              <div>
                <label className={labelClass}>Interest % p.m.</label>
                <input type="number" step="0.01" className={`${inputClass} font-bold text-yellow-700 bg-yellow-50`} value={formData.interestRate} onChange={set('interestRate')} required />
              </div>
            </div>
          </div>

          {/* Ornament Photo */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Ornament Photo</h3>
            <OrnamentCamera
              imageUrl={formData.imageUrl}
              onChange={url => setFormData(prev => ({ ...prev, imageUrl: url }))}
            />
          </div>

          {/* Remark */}
          <div className="pt-2">
            <label className={labelClass}>Remark (Optional)</label>
            <input type="text" className={inputClass} placeholder="Any additional notes..." value={formData.remark} onChange={set('remark')} />
          </div>

          {/* Closed notice (edit mode) */}
          {editingLoan && formData.status === 'Closed' && (
            <div className="bg-red-600 rounded-2xl p-4 md:p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} />
                <span className="font-bold text-sm md:text-base">Fully Settled Account</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase font-bold opacity-80">Closed On</p>
                <p className="font-black text-sm md:text-lg">
                  {new Date(editingLoan.closeDate || new Date()).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl shadow-xl shadow-yellow-100 transition-all flex items-center justify-center space-x-2"
          >
            <Save size={22} />
            <span className="uppercase tracking-widest text-sm">{editingLoan ? 'Update Record' : 'Save to Ledger'}</span>
          </button>
        </div>
      </form>

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
};

export default LoanEntryForm;
