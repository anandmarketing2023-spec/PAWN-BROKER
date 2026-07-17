
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, Filter, Trash2, Edit3, Calendar, Phone, CheckCircle2, MoreVertical, IndianRupee, Image as ImageIcon, X, History, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoanEntry } from '../types';
import { calculateInterest, getCurrentPrincipal, isOldPending } from '../src/utils';

interface LedgerProps {
  loans: LoanEntry[];
  onDelete: (id: string) => void;
  onEdit: (loan: LoanEntry) => void;
  onUpdateStatus: (id: string) => void;
  onAdjustDate: (loan: LoanEntry) => void;
  onAddTransaction: (loan: LoanEntry) => void;
  appName: string;
}

const Ledger: React.FC<LedgerProps> = ({ loans, onDelete, onEdit, onUpdateStatus, onAdjustDate, onAddTransaction, appName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Advanced Filter options
  const [showFilters, setShowFilters] = useState(false);
  const [searchBy, setSearchBy] = useState<'all' | 'name' | 'number' | 'slip' | 'item'>('all');
  
  // Column-specific input filters
  const [filterName, setFilterName] = useState('');
  const [filterNumber, setFilterNumber] = useState('');
  const [filterSlip, setFilterSlip] = useState('');
  const [filterItem, setFilterItem] = useState('');
  
  // Status & Metal filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Closed'>('all');
  const [filterMetal, setFilterMetal] = useState<'all' | 'Gold' | 'Silver' | 'Both'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Pre-calculate all heavy financial values once when the loans prop changes.
  // This avoids executing heavy loop-based calculation functions inside rendering cycles and filters.
  const calculatedLoans = useMemo(() => {
    const list = loans.map(loan => {
      const principal = getCurrentPrincipal(loan);
      const interest = loan.status === 'Closed' && loan.settledInterest !== undefined 
        ? loan.settledInterest 
        : calculateInterest(loan);
      const total = principal + interest;
      const oldPending = isOldPending(loan);
      const searchString = `${loan.serialNumber} ${loan.name.toLowerCase()} ${loan.contactNumber} ${loan.description.toLowerCase()}`;
      
      const interestPaid = loan.transactions
        ?.filter(t => t.type === 'Interest Payment')
        ?.reduce((sum, t) => sum + t.amount, 0) || 0;

      return {
        loan,
        principal,
        interest,
        total,
        oldPending,
        searchString,
        interestPaid,
      };
    });
    return list.sort((a, b) => b.loan.serialNumber - a.loan.serialNumber);
  }, [loans]);

  // Fast, linear search query on cached pre-compiled flat lowercase strings
  const filteredCalculatedLoans = useMemo(() => {
    return calculatedLoans.filter(cl => {
      const { loan } = cl;
      
      // 1. General search term (based on searchBy selection)
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        if (searchBy === 'name') {
          if (!loan.name.toLowerCase().includes(term)) return false;
        } else if (searchBy === 'number') {
          if (!loan.contactNumber.includes(term)) return false;
        } else if (searchBy === 'slip') {
          if (!loan.serialNumber.toString().includes(term)) return false;
        } else if (searchBy === 'item') {
          if (!loan.description.toLowerCase().includes(term)) return false;
        } else {
          // 'all'
          if (!cl.searchString.includes(term)) return false;
        }
      }

      // 2. Specific individual column filters (Name, Number, Slip, Item/Ornament)
      if (filterName.trim()) {
        if (!loan.name.toLowerCase().includes(filterName.toLowerCase().trim())) return false;
      }
      if (filterNumber.trim()) {
        if (!loan.contactNumber.includes(filterNumber.trim())) return false;
      }
      if (filterSlip.trim()) {
        if (!loan.serialNumber.toString().includes(filterSlip.trim())) return false;
      }
      if (filterItem.trim()) {
        if (!loan.description.toLowerCase().includes(filterItem.toLowerCase().trim())) return false;
      }

      // 3. Status filter
      if (filterStatus !== 'all') {
        if (loan.status !== filterStatus) return false;
      }

      // 4. Metal filter
      if (filterMetal !== 'all') {
        if (loan.metalType !== filterMetal) return false;
      }

      return true;
    });
  }, [calculatedLoans, searchTerm, searchBy, filterName, filterNumber, filterSlip, filterItem, filterStatus, filterMetal]);

  // Reset page when filters change to avoid getting stuck on empty pages
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchBy, filterName, filterNumber, filterSlip, filterItem, filterStatus, filterMetal]);

  const totalItems = filteredCalculatedLoans.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCalculatedLoans.slice(start, start + pageSize);
  }, [filteredCalculatedLoans, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (filteredCalculatedLoans.length === 0) return;
    
    const headers = ['S.No', 'Date', 'Name', 'Guardian', 'Contact', 'Address', 'Metal', 'Description', 'Weight', 'Net Weight', 'Amount', 'Interest Rate', 'Status', 'Close Date', 'Settled Interest'];
    const rows = filteredCalculatedLoans.map(({ loan: l }) => [
      l.serialNumber,
      l.date,
      l.name,
      l.guardian,
      l.contactNumber,
      l.address,
      l.metalType,
      l.description,
      l.weight,
      l.netWeight,
      l.amount,
      l.interestRate,
      l.status,
      l.closeDate || '',
      l.settledInterest || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const safeName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('href', url);
    link.setAttribute('download', `${safeName}_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Loan Ledger</h1>
          <p className="text-sm text-slate-500">Manage {filteredCalculatedLoans.length} total records</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleExportCSV}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            <span className="text-sm font-semibold">CSV</span>
          </button>
        </div>
      </header>

      {/* Search Bar - Responsive spacing & Column Filters */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-grow flex items-center bg-slate-50 border border-slate-100 rounded-xl pr-2 focus-within:ring-2 focus-within:ring-yellow-500 transition-all">
            <div className="relative flex-grow">
              <Search className="absolute left-3 md:left-4 top-2.5 md:top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={
                  searchBy === 'all' ? "Search name, serial, contact, ornament..." :
                  searchBy === 'name' ? "Search by customer name..." :
                  searchBy === 'number' ? "Search by contact number..." :
                  searchBy === 'slip' ? "Search by slip number..." :
                  "Search by item / ornament description..."
                }
                className="w-full pl-10 md:pl-12 pr-4 py-2 md:py-2.5 bg-transparent border-none outline-none text-sm md:text-base focus:ring-0"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Quick Column Selector Dropdown */}
            <select
              value={searchBy}
              onChange={e => setSearchBy(e.target.value as any)}
              className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none cursor-pointer focus:ring-1 focus:ring-yellow-500"
            >
              <option value="all">All Columns</option>
              <option value="name">Name</option>
              <option value="number">Number</option>
              <option value="slip">Slip No</option>
              <option value="item">Ornament</option>
            </select>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 md:px-5 md:py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border ${
              showFilters || filterName || filterNumber || filterSlip || filterItem || filterStatus !== 'all' || filterMetal !== 'all'
                ? 'bg-yellow-500 text-white border-yellow-500 shadow-md shadow-yellow-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <Filter size={18} />
            <span className="hidden md:inline font-bold text-xs uppercase tracking-wider">
              {showFilters ? 'Hide Filters' : 'Filters'}
            </span>
            {(filterName || filterNumber || filterSlip || filterItem || filterStatus !== 'all' || filterMetal !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            )}
          </button>
        </div>

        {/* Expandable Advanced Column-Specific Search Filters */}
        {showFilters && (
          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
            {/* Column Search - Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Search by Name</label>
              <input 
                type="text"
                placeholder="e.g. Ramesh"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs focus:ring-1 focus:ring-yellow-500 focus:bg-white outline-none"
              />
            </div>

            {/* Column Search - Contact Number */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Search by Contact Number</label>
              <input 
                type="text"
                placeholder="e.g. 98400"
                value={filterNumber}
                onChange={e => setFilterNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs focus:ring-1 focus:ring-yellow-500 focus:bg-white outline-none"
              />
            </div>

            {/* Column Search - Slip (S.No) */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Search by Slip (S.No)</label>
              <input 
                type="text"
                placeholder="e.g. 102"
                value={filterSlip}
                onChange={e => setFilterSlip(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs focus:ring-1 focus:ring-yellow-500 focus:bg-white outline-none"
              />
            </div>

            {/* Column Search - Item [Ornament] */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Search by Item [Ornament]</label>
              <input 
                type="text"
                placeholder="e.g. Ring, Chain"
                value={filterItem}
                onChange={e => setFilterItem(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs focus:ring-1 focus:ring-yellow-500 focus:bg-white outline-none"
              />
            </div>

            {/* Filter - Status */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Filter Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs focus:ring-1 focus:ring-yellow-500 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Girvi</option>
                <option value="Closed">Closed (Paid)</option>
              </select>
            </div>

            {/* Filter - Metal Type */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Filter Metal</label>
              <select
                value={filterMetal}
                onChange={e => setFilterMetal(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs focus:ring-1 focus:ring-yellow-500 outline-none cursor-pointer"
              >
                <option value="all">All Metals</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Both">Both (Gold & Silver)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="sm:col-span-2 md:col-span-2 flex items-end justify-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchBy('all');
                  setFilterName('');
                  setFilterNumber('');
                  setFilterSlip('');
                  setFilterItem('');
                  setFilterStatus('all');
                  setFilterMetal('all');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X size={14} />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE CARD VIEW (Hidden on md+) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {paginatedLoans.map(({ loan, principal, interest, total, oldPending, interestPaid }) => (
          <div key={loan.id} className={`bg-white rounded-2xl border ${loan.status === 'Closed' ? 'border-red-100 bg-red-50/10' : 'border-slate-100'} p-4 shadow-sm active:scale-[0.98] transition-transform`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">#{String(loan.serialNumber).padStart(4, '0')}</span>
                {loan.status === 'Closed' && (
                  <button 
                    onClick={() => onAdjustDate(loan)}
                    className="flex flex-col items-center hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">PAID</span>
                    {loan.closeDate && <span className="text-[8px] text-slate-400 font-bold text-center mt-0.5 underline decoration-dotted">{new Date(loan.closeDate).toLocaleDateString()}</span>}
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => onEdit(loan)} className="p-2 text-slate-400 bg-slate-50 rounded-lg"><Edit3 size={16} /></button>
                <button onClick={() => onDelete(loan.id)} className="p-2 text-slate-400 bg-slate-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <div className="flex flex-col">
                  <h3 className={`text-base font-bold ${loan.status === 'Closed' ? 'text-slate-400 line-through' : (oldPending ? 'text-red-600' : 'text-slate-900')}`}>{loan.name}</h3>
                  {oldPending && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertCircle size={10} className="text-red-500" />
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Old Pending Girvi</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center text-xs text-slate-500 mt-1 space-x-3">
                  <span className={`flex items-center gap-1 ${oldPending ? 'text-red-500 font-bold' : ''}`}><Phone size={12} /> {loan.contactNumber}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(loan.date).toLocaleDateString()}</span>
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
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800">P: ₹{principal.toLocaleString()}</span>
                    <span className="text-[8px] text-slate-400 font-bold">Total: ₹{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-green-600">
                      +₹{interest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    {interestPaid > 0 && (
                      <span className="text-[7px] font-black text-blue-500 uppercase">
                        Paid: ₹{interestPaid.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onAddTransaction(loan)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 text-white shadow-sm active:scale-90"
                  title="Transactions"
                >
                  <History size={18} />
                </button>
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
            </div>
            
            <div className="mt-3 flex items-center justify-between">
               <span className="text-[10px] font-bold text-slate-400 uppercase">{loan.description}</span>
               <div className="flex flex-col items-end gap-1">
                 <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    loan.metalType === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 
                    loan.metalType === 'Silver' ? 'bg-slate-200 text-slate-700' : 'bg-indigo-100 text-indigo-700'
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
        ))}
      </div>

      {/* DESKTOP TABLE VIEW (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">S.No</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Principal</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Interest</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Settlement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedLoans.map(({ loan, principal, interest, total, oldPending, interestPaid }) => (
              <tr key={loan.id} className={`hover:bg-slate-50/50 transition-colors group ${loan.status === 'Closed' ? 'bg-red-50/10' : ''}`}>
                <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-bold text-slate-500">#{String(loan.serialNumber).padStart(4, '0')}</span>
                  {loan.status === 'Closed' && (
                    <button 
                      onClick={() => onAdjustDate(loan)}
                      className="flex flex-col mt-1 hover:bg-red-50 p-1 rounded transition-colors text-left"
                    >
                      <span className="text-[10px] font-black text-red-600 uppercase">PAID</span>
                      {loan.closeDate && <span className="text-[9px] text-slate-400 font-bold underline decoration-dotted">{new Date(loan.closeDate).toLocaleDateString()}</span>}
                    </button>
                  )}
                </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {loan.imageUrl ? (
                      <button 
                        onClick={() => setSelectedImage(loan.imageUrl!)}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:scale-110 transition-transform"
                      >
                        <img src={loan.imageUrl} alt="Ornament" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${loan.status === 'Closed' ? 'text-slate-400 line-through' : (oldPending ? 'text-red-600' : 'text-slate-800')}`}>{loan.name}</span>
                        {oldPending && (
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-0.5">
                            <AlertCircle size={8} />
                            Old Pending
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center space-x-1 mt-1 text-xs ${oldPending ? 'text-red-500 font-bold' : 'text-slate-500'}`}><Phone size={10} /> {loan.contactNumber}</div>
                      <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-slate-400 font-bold uppercase"><Calendar size={10} /> {new Date(loan.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-1">
                      {loan.metalType === 'Both' ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-yellow-600">G: {loan.goldNetWeight || loan.goldWeight}g</span>
                            <span className="text-xs font-bold text-slate-400">S: {loan.silverNetWeight || loan.silverWeight}g</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 w-fit mt-1">Both</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-slate-700">{loan.netWeight || loan.weight}g</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${loan.metalType === 'Gold' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-700'}`}>{loan.metalType}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 truncate max-w-[150px] mt-1">{loan.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${loan.status === 'Closed' ? 'text-slate-400' : 'text-slate-800'}`}>₹{principal.toLocaleString()}</span>
                    {loan.amount !== principal && (
                      <span className="text-[8px] text-slate-400 italic">Was ₹{loan.amount.toLocaleString()}</span>
                    )}
                    <div className="text-[10px] text-slate-400">{loan.interestRate}% p.m.</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-bold ${loan.status === 'Closed' ? 'text-slate-400' : 'text-green-600'}`}>
                      +₹{interest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    {interestPaid > 0 && (
                      <span className="text-[9px] font-black text-blue-500 uppercase">
                        Paid: ₹{interestPaid.toLocaleString()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center space-x-2">
                    <button 
                      onClick={() => onAddTransaction(loan)}
                      className="p-2 rounded-full transition-all text-slate-600 bg-slate-100 hover:bg-slate-200"
                      title="Transactions"
                    >
                      <History size={20} />
                    </button>
                    <button 
                      onClick={() => onUpdateStatus(loan.id)}
                      className={`p-2 rounded-full transition-all transform active:scale-90 shadow-sm border ${
                        loan.status === 'Active' ? 'text-blue-500 bg-blue-50 border-blue-200 hover:bg-blue-100' : 'text-red-600 bg-red-100 border-red-200 hover:bg-red-200'
                      }`}
                    >
                      <CheckCircle2 size={24} />
                    </button>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(loan)} className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"><Edit3 size={16} /></button>
                      <button onClick={() => onDelete(loan.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="text-slate-800">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
            <span className="text-slate-800">{totalItems}</span> records
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 uppercase font-extrabold tracking-wider text-[10px]">Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold text-slate-600 outline-none cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1.5 rounded-lg border border-slate-150 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, index, arr) => {
                    const showEllipsis = index > 0 && p - arr[index - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="text-xs text-slate-300 px-1">...</span>}
                        <button
                          onClick={() => {
                            setCurrentPage(p);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === p
                              ? 'bg-yellow-500 text-white shadow-md shadow-yellow-100'
                              : 'border border-slate-150 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-1.5 rounded-lg border border-slate-150 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredCalculatedLoans.length === 0 && (
        <div className="py-20 text-center text-slate-400 italic">No records found.</div>
      )}

      {/* Image Modal */}
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
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Ledger;
