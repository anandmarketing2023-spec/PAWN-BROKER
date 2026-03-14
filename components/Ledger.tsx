import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Download, Filter, Trash2, Edit3, Calendar, Phone,
  CheckCircle2, IndianRupee, Image as ImageIcon, X, MessageCircle, AlertTriangle
} from 'lucide-react';
import { LoanEntry } from '../types';
import { calculateInterest, formatINR, formatSerial, generateWhatsAppMessage } from '../utils';

interface LedgerProps {
  loans: LoanEntry[];
  onDelete: (id: string) => void;
  onEdit: (loan: LoanEntry) => void;
  onUpdateStatus: (id: string, customDate?: string, settledInterest?: number) => void;
  onAdjustDate: (loan: LoanEntry) => void;
}

type FilterStatus = 'All' | 'Active' | 'Closed' | 'Overdue';

const OVERDUE_MONTHS = 12;

const isOverdue = (loan: LoanEntry): boolean => {
  if (loan.status !== 'Active') return false;
  const start = new Date(loan.date);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return diffMonths >= OVERDUE_MONTHS;
};

const Ledger: React.FC<LedgerProps> = ({ loans, onDelete, onEdit, onUpdateStatus, onAdjustDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filteredLoans = useMemo(() => {
    return loans
      .filter(loan => {
        const matchesSearch =
          loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.contactNumber.includes(searchTerm) ||
          loan.serialNumber.toString().includes(searchTerm) ||
          loan.description.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
          filterStatus === 'All' ? true :
          filterStatus === 'Active' ? loan.status === 'Active' :
          filterStatus === 'Closed' ? loan.status === 'Closed' :
          filterStatus === 'Overdue' ? isOverdue(loan) :
          true;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.serialNumber - a.serialNumber);
  }, [loans, searchTerm, filterStatus]);

  // Summary counts for filter badges
  const counts = useMemo(() => ({
    All: loans.length,
    Active: loans.filter(l => l.status === 'Active').length,
    Closed: loans.filter(l => l.status === 'Closed').length,
    Overdue: loans.filter(isOverdue).length,
  }), [loans]);

  const handleExportCSV = useCallback(() => {
    if (filteredLoans.length === 0) return;

    const headers = [
      'S.No', 'Date', 'Name', 'Guardian', 'Contact', 'Address',
      'Metal', 'Description', 'Weight', 'Net Weight',
      'Amount', 'Interest Rate', 'Status', 'Close Date', 'Settled Interest'
    ];
    const rows = filteredLoans.map(l => [
      l.serialNumber, l.date, l.name, l.guardian, l.contactNumber, l.address,
      l.metalType, l.description, l.weight, l.netWeight,
      l.amount, l.interestRate, l.status, l.closeDate || '', l.settledInterest || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(f => `"${f}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `balaji_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [filteredLoans]);

  const getInterest = useCallback((loan: LoanEntry): number => {
    if (loan.status === 'Closed' && loan.settledInterest !== undefined) return loan.settledInterest;
    return calculateInterest(loan.amount, loan.interestRate, loan.date, loan.closeDate);
  }, []);

  const handleWhatsApp = useCallback((loan: LoanEntry) => {
    const interest = getInterest(loan);
    const msg = generateWhatsAppMessage(loan.name, loan.serialNumber, loan.amount, interest, loan.date);
    window.open(`https://wa.me/${loan.contactNumber.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }, [getInterest]);

  const filterButtons: FilterStatus[] = ['All', 'Active', 'Closed', 'Overdue'];

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Loan Ledger</h1>
          <p className="text-sm text-slate-500">
            {filteredLoans.length} of {loans.length} records
            {counts.Overdue > 0 && (
              <span className="ml-2 text-orange-600 font-bold">
                • {counts.Overdue} overdue
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center space-x-2 bg-white px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download size={18} />
          <span className="text-sm font-semibold">Export CSV</span>
        </button>
      </header>

      {/* Search + Filter Bar */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search name, serial, mobile, description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400 shrink-0" />
          {filterButtons.map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                filterStatus === f
                  ? f === 'Overdue'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f}
              {counts[f] > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                  filterStatus === f ? 'bg-white/30' : 'bg-slate-100'
                }`}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredLoans.map((loan) => {
          const interest = getInterest(loan);
          const overdue = isOverdue(loan);

          return (
            <div
              key={loan.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm active:scale-[0.98] transition-transform ${
                overdue ? 'border-orange-200 bg-orange-50/20' :
                loan.status === 'Closed' ? 'border-red-100 bg-red-50/10' :
                'border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    #{formatSerial(loan.serialNumber)}
                  </span>
                  {overdue && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                      <AlertTriangle size={9} /> OVERDUE
                    </span>
                  )}
                  {loan.status === 'Closed' && (
                    <button
                      onClick={() => onAdjustDate(loan)}
                      className="flex flex-col items-center hover:bg-red-50 p-1 rounded transition-colors"
                    >
                      <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">PAID</span>
                      {loan.closeDate && (
                        <span className="text-[8px] text-slate-400 font-bold mt-0.5 underline decoration-dotted">
                          {new Date(loan.closeDate).toLocaleDateString()}
                        </span>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {loan.status === 'Active' && (
                    <button
                      onClick={() => handleWhatsApp(loan)}
                      className="p-2 text-green-500 bg-green-50 rounded-lg"
                      title="Send WhatsApp reminder"
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => onEdit(loan)} className="p-2 text-slate-400 bg-slate-50 rounded-lg"><Edit3 size={16} /></button>
                  <button onClick={() => onDelete(loan.id)} className="p-2 text-slate-400 bg-slate-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <h3 className={`text-base font-bold ${loan.status === 'Closed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {loan.name}
                  </h3>
                  <div className="flex items-center text-xs text-slate-500 mt-1 space-x-3">
                    <span className="flex items-center gap-1"><Phone size={12} />{loan.contactNumber}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} />{new Date(loan.date).toLocaleDateString()}</span>
                  </div>
                </div>
                {loan.imageUrl && (
                  <button
                    onClick={() => setSelectedImage(loan.imageUrl!)}
                    className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm active:scale-95 transition-transform"
                  >
                    <img src={loan.imageUrl} alt="Ornament" className="w-full h-full object-cover" />
                  </button>
                )}
              </div>

              <div className="bg-slate-50/50 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Financials</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-slate-800">₹{formatINR(loan.amount)}</span>
                    <span className="text-xs font-bold text-green-600">+₹{formatINR(interest)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onUpdateStatus(loan.id)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 ${
                    loan.status === 'Active'
                      ? 'bg-blue-500 text-white shadow-blue-200'
                      : 'bg-red-600 text-white shadow-red-200'
                  }`}
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{loan.description}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    loan.metalType === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                    loan.metalType === 'Silver' ? 'bg-slate-200 text-slate-700' :
                    'bg-indigo-100 text-indigo-700'
                  }`}>{loan.metalType}</span>
                  {loan.metalType === 'Both' ? (
                    <div className="flex flex-col text-[8px] font-bold text-slate-500 items-end">
                      <span>G: {loan.goldNetWeight || loan.goldWeight}g</span>
                      <span>S: {loan.silverNetWeight || loan.silverWeight}g</span>
                    </div>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-500">{loan.netWeight || loan.weight}g</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">S.No</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Principal</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Interest</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLoans.map((loan) => {
              const interest = getInterest(loan);
              const overdue = isOverdue(loan);

              return (
                <tr
                  key={loan.id}
                  className={`hover:bg-slate-50/50 transition-colors group ${
                    overdue ? 'bg-orange-50/30' :
                    loan.status === 'Closed' ? 'bg-red-50/10' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-sm font-bold text-slate-500">#{formatSerial(loan.serialNumber)}</span>
                      {overdue && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 w-fit">
                          <AlertTriangle size={9} /> Overdue
                        </span>
                      )}
                      {loan.status === 'Closed' && (
                        <button
                          onClick={() => onAdjustDate(loan)}
                          className="flex flex-col mt-0.5 hover:bg-red-50 p-1 rounded transition-colors text-left"
                        >
                          <span className="text-[10px] font-black text-red-600 uppercase">PAID</span>
                          {loan.closeDate && (
                            <span className="text-[9px] text-slate-400 font-bold underline decoration-dotted">
                              {new Date(loan.closeDate).toLocaleDateString()}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {loan.imageUrl ? (
                        <button
                          onClick={() => setSelectedImage(loan.imageUrl!)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:scale-110 transition-transform shrink-0"
                        >
                          <img src={loan.imageUrl} alt="Ornament" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold truncate ${loan.status === 'Closed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {loan.name}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          <Phone size={10} />{loan.contactNumber}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-bold uppercase">
                          <Calendar size={10} />{new Date(loan.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {loan.metalType === 'Both' ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-yellow-600">G: {loan.goldNetWeight || loan.goldWeight}g</span>
                            <span className="text-xs font-bold text-slate-400">S: {loan.silverNetWeight || loan.silverWeight}g</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 w-fit mt-1">Both</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-700">{loan.netWeight || loan.weight}g</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            loan.metalType === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-700'
                          }`}>{loan.metalType}</span>
                        </div>
                      )}
                      <span className="text-xs text-slate-500 truncate max-w-[150px] mt-1">{loan.description}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${loan.status === 'Closed' ? 'text-slate-400' : 'text-slate-800'}`}>
                      ₹{formatINR(loan.amount)}
                    </span>
                    <div className="text-[10px] text-slate-400">{loan.interestRate}% p.m.</div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-bold ${loan.status === 'Closed' ? 'text-slate-400' : 'text-green-600'}`}>
                      +₹{formatINR(interest)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => onUpdateStatus(loan.id)}
                        className={`p-2 rounded-full transition-all transform active:scale-90 shadow-sm border ${
                          loan.status === 'Active'
                            ? 'text-blue-500 bg-blue-50 border-blue-200 hover:bg-blue-100'
                            : 'text-red-600 bg-red-100 border-red-200 hover:bg-red-200'
                        }`}
                        title={loan.status === 'Active' ? 'Mark as Paid' : 'Re-open'}
                      >
                        <CheckCircle2 size={22} />
                      </button>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {loan.status === 'Active' && (
                          <button
                            onClick={() => handleWhatsApp(loan)}
                            className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"
                            title="Send WhatsApp reminder"
                          >
                            <MessageCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(loan)}
                          className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(loan.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredLoans.length === 0 && (
        <div className="py-20 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200 mt-2">
          {searchTerm || filterStatus !== 'All'
            ? 'No records match your search or filter.'
            : 'No records yet. Add your first entry!'
          }
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img
            src={selectedImage}
            alt="Full View"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Ledger;
update Ledger.tsx
