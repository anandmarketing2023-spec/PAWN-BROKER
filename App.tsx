
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  TrendingUp,
  Settings,
  Menu,
  X,
  Users
} from 'lucide-react';
import { LoanEntry } from './types';
import Dashboard from './components/Dashboard';
import LoanEntryForm from './components/LoanEntryForm';
import Ledger from './components/Ledger';
import CustomerSheet from './components/CustomerSheet';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'ledger' | 'customers'>('dashboard');
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanEntry | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('girvi_loans');
    if (saved) {
      try {
        setLoans(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved loans", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('girvi_loans', JSON.stringify(loans));
  }, [loans]);

  const saveLoan = (loanData: Omit<LoanEntry, 'id'>) => {
    if (editingLoan) {
      let closeDate = editingLoan.closeDate;
      if (loanData.status === 'Closed' && !closeDate) {
        closeDate = new Date().toISOString().split('T')[0];
      } else if (loanData.status === 'Active') {
        closeDate = undefined;
      }
      setLoans(loans.map(l => l.id === editingLoan.id ? { ...loanData, id: editingLoan.id, closeDate } : l));
      setEditingLoan(null);
    } else {
      const loan: LoanEntry = {
        ...loanData,
        id: crypto.randomUUID(),
        closeDate: loanData.status === 'Closed' ? new Date().toISOString().split('T')[0] : undefined
      };
      setLoans([...loans, loan]);
    }
    setActiveTab('ledger');
  };

  const deleteLoan = (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      setLoans(loans.filter(l => l.id !== id));
    }
  };

  const closeLoan = (id: string) => {
    const loan = loans.find(l => l.id === id);
    if (!loan) return;
    if (loan.status === 'Closed') {
      if (window.confirm("Re-open as UNPAID?")) {
        setLoans(loans.map(l => l.id === id ? { ...l, status: 'Active', closeDate: undefined } : l));
      }
    } else {
      const date = new Date().toISOString().split('T')[0];
      if (window.confirm(`Mark as PAID?`)) {
        setLoans(loans.map(l => l.id === id ? { ...l, status: 'Closed', closeDate: date } : l));
      }
    }
  };

  const handleEdit = (loan: LoanEntry) => {
    setEditingLoan(loan);
    setActiveTab('entry');
  };

  const nextAutoSerial = loans.length > 0 ? Math.max(...loans.map(l => l.serialNumber)) + 1 : 1;

  // Bottom Navigation Item (Mobile Only)
  const BottomNavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        if (id !== 'entry') setEditingLoan(null);
      }}
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
        activeTab === id ? 'text-yellow-600' : 'text-slate-400'
      }`}
    >
      <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="bg-yellow-500 p-2 rounded-xl text-white shadow-md">
            <TrendingUp size={24} />
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">GirviGold</span>
        </div>

        <nav className="space-y-2 flex-grow">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'entry', icon: PlusCircle, label: editingLoan ? 'Edit Entry' : 'New Entry' },
            { id: 'ledger', icon: BookOpen, label: 'Ledger' },
            { id: 'customers', icon: Users, label: 'Customers' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                if (item.id !== 'entry') setEditingLoan(null);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-100' 
                  : 'text-slate-600 hover:bg-yellow-50 hover:text-yellow-600'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-yellow-500 p-1.5 rounded-lg text-white">
            <TrendingUp size={20} />
          </div>
          <span className="text-lg font-bold text-slate-800">GirviGold</span>
        </div>
        <button className="text-slate-400 p-1">
          <Settings size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard loans={loans} />}
          {activeTab === 'entry' && (
            <LoanEntryForm 
              onSave={saveLoan} 
              nextSerial={nextAutoSerial} 
              editingLoan={editingLoan} 
              onCancel={() => {
                setEditingLoan(null);
                setActiveTab('ledger');
              }}
            />
          )}
          {activeTab === 'ledger' && <Ledger loans={loans} onDelete={deleteLoan} onEdit={handleEdit} onUpdateStatus={closeLoan} />}
          {activeTab === 'customers' && <CustomerSheet loans={loans} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-2 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <BottomNavItem id="dashboard" icon={LayoutDashboard} label="Home" />
        <BottomNavItem id="ledger" icon={BookOpen} label="Ledger" />
        <div className="relative -top-5">
           <button 
            onClick={() => { setActiveTab('entry'); setEditingLoan(null); }}
            className={`p-4 rounded-full shadow-lg transition-transform active:scale-90 ${activeTab === 'entry' ? 'bg-yellow-600' : 'bg-yellow-500'} text-white border-4 border-slate-50`}
           >
             <PlusCircle size={28} />
           </button>
        </div>
        <BottomNavItem id="customers" icon={Users} label="Sheet" />
        <BottomNavItem id="dashboard" icon={Settings} label="More" />
      </nav>
    </div>
  );
};

export default App;
