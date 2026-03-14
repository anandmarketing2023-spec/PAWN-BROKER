
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  TrendingUp,
  Settings,
  Menu,
  X,
  Users,
  Coins
} from 'lucide-react';
import { LoanEntry, BackupConfig, BackupEntry } from './types';
import Dashboard from './components/Dashboard';
import LoanEntryForm from './components/LoanEntryForm';
import Ledger from './components/Ledger';
import CustomerSheet from './components/CustomerSheet';
import StorageSettings from './components/StorageSettings';
import SettlementModal from './components/SettlementModal';
import Modal from './components/Modal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'ledger' | 'customers' | 'storage'>('dashboard');
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({ frequency: 'Daily', enabled: true });
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanEntry | null>(null);
  const [settlingLoan, setSettlingLoan] = useState<LoanEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = (title: string, message: string, type: 'info' | 'warning' | 'success' | 'confirm' = 'info', onConfirm?: () => void) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  useEffect(() => {
    const saved = localStorage.getItem('girvi_loans');
    if (saved) {
      try {
        setLoans(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved loans", e);
      }
    }

    const savedConfig = localStorage.getItem('girvi_backup_config');
    if (savedConfig) {
      try {
        setBackupConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to parse backup config", e);
      }
    }

    const savedBackups = localStorage.getItem('girvi_backups');
    if (savedBackups) {
      try {
        setBackups(JSON.parse(savedBackups));
      } catch (e) {
        console.error("Failed to parse backups", e);
      }
    }

    // Simulate initial load for professional feel
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('girvi_backup_config', JSON.stringify(backupConfig));
  }, [backupConfig]);

  useEffect(() => {
    localStorage.setItem('girvi_backups', JSON.stringify(backups));
  }, [backups]);

  // Auto Backup Logic
  useEffect(() => {
    if (!backupConfig.enabled || loans.length === 0) return;

    const now = new Date();
    const lastBackupDate = backupConfig.lastBackup ? new Date(backupConfig.lastBackup) : null;
    
    let shouldBackup = false;
    let backupType: 'Daily' | 'Weekly' = 'Daily';

    if (!lastBackupDate) {
      shouldBackup = true;
    } else {
      const diffTime = Math.abs(now.getTime() - lastBackupDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (backupConfig.frequency === 'Daily' && diffDays >= 1) {
        shouldBackup = true;
        backupType = 'Daily';
      } else if (backupConfig.frequency === 'Weekly' && diffDays >= 7) {
        shouldBackup = true;
        backupType = 'Weekly';
      }
    }

    if (shouldBackup) {
      const newBackup: BackupEntry = {
        id: crypto.randomUUID(),
        timestamp: now.toISOString(),
        type: backupType,
        recordCount: loans.length,
        data: loans
      };

      // Keep only last 10 backups to save space
      const updatedBackups = [newBackup, ...backups].slice(0, 10);
      setBackups(updatedBackups);
      setBackupConfig(prev => ({ ...prev, lastBackup: now.toISOString() }));
    }
  }, [loans, backupConfig, backups]);

  useEffect(() => {
    localStorage.setItem('girvi_loans', JSON.stringify(loans));
    
    // Create an automatic snapshot every time data changes
    if (loans.length > 0) {
      localStorage.setItem('girvi_loans_backup_latest', JSON.stringify({
        timestamp: new Date().toISOString(),
        data: loans
      }));
    }
  }, [loans]);

  const saveLoan = (loanData: Omit<LoanEntry, 'id' | 'isDeleted'>) => {
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
    showModal(
      "Confirm Deletion",
      "Are you sure you want to delete this record? It will be moved to the trash and can be recovered later.",
      "warning",
      () => {
        setLoans(loans.map(l => l.id === id ? { ...l, isDeleted: true } : l));
      }
    );
  };

  const closeLoan = (id: string, customDate?: string, settledInterest?: number) => {
    const loan = loans.find(l => l.id === id);
    if (!loan) return;
    
    if (loan.status === 'Closed') {
      showModal(
        "Re-open Account",
        "Do you want to re-open this account as UNPAID?",
        "confirm",
        () => {
          setLoans(loans.map(l => l.id === id ? { ...l, status: 'Active', closeDate: undefined, settledInterest: undefined } : l));
        }
      );
    } else {
      if (customDate) {
        setLoans(loans.map(l => l.id === id ? { ...l, status: 'Closed', closeDate: customDate, settledInterest } : l));
        setSettlingLoan(null);
      } else {
        setSettlingLoan(loan);
      }
    }
  };

  const handleEdit = (loan: LoanEntry) => {
    setEditingLoan(loan);
    setActiveTab('entry');
  };

  const adjustSettlementDate = (loan: LoanEntry) => {
    setSettlingLoan(loan);
  };

  const nextAutoSerial = loans.filter(l => !l.isDeleted).length > 0 
    ? Math.max(...loans.filter(l => !l.isDeleted).map(l => l.serialNumber)) + 1 
    : 1;

  const activeLoans = loans.filter(l => !l.isDeleted);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-yellow-500 rounded-2xl rotate-45 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Coins className="text-slate-900 -rotate-45" size={24} />
            </div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Balaji Ledger</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Secure Digital Girvi</p>
        </div>
        <div className="absolute bottom-10 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
          Loading your records...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="bg-yellow-500 p-2 rounded-xl text-white shadow-md">
            <TrendingUp size={24} />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight leading-tight">BALAJI PAWN BROKERS</span>
        </div>

        <nav className="space-y-2 flex-grow">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'entry', icon: PlusCircle, label: editingLoan ? 'Edit Entry' : 'New Entry' },
            { id: 'ledger', icon: BookOpen, label: 'Ledger' },
            { id: 'customers', icon: Users, label: 'Customers' },
            { id: 'storage', icon: Settings, label: 'Storage' },
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
          <span className="text-base font-bold text-slate-800">BALAJI PAWN BROKERS</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setActiveTab('customers')}
            className={`p-1 transition-colors ${activeTab === 'customers' ? 'text-yellow-600' : 'text-slate-400'}`}
          >
            <Users size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('storage')}
            className={`p-1 transition-colors ${activeTab === 'storage' ? 'text-yellow-600' : 'text-slate-400'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard loans={activeLoans} />}
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
          {activeTab === 'ledger' && (
            <Ledger 
              loans={activeLoans} 
              onDelete={deleteLoan} 
              onEdit={handleEdit} 
              onUpdateStatus={closeLoan} 
              onAdjustDate={adjustSettlementDate}
            />
          )}
          {activeTab === 'customers' && <CustomerSheet loans={activeLoans} />}
          {activeTab === 'storage' && (
            <StorageSettings 
              loans={loans} 
              onImport={setLoans}
              backupConfig={backupConfig}
              onBackupConfigChange={setBackupConfig}
              backups={backups}
              onRestoreBackup={(data) => {
                showModal(
                  "Restore Backup",
                  "Are you sure you want to restore this backup? Your current data will be replaced.",
                  "warning",
                  () => {
                    setLoans(data);
                    showModal("Success", "Backup restored successfully!", "success");
                  }
                );
              }}
              onDeleteBackup={(id) => {
                setBackups(backups.filter(b => b.id !== id));
              }}
              onManualBackup={() => {
                const newBackup: BackupEntry = {
                  id: crypto.randomUUID(),
                  timestamp: new Date().toISOString(),
                  type: 'Manual',
                  recordCount: loans.length,
                  data: loans
                };
                setBackups([newBackup, ...backups].slice(0, 10));
                showModal("Backup Created", "Manual backup created successfully!", "success");
              }}
            />
          )}
        </div>

        {settlingLoan && (
          <SettlementModal 
            loan={settlingLoan} 
            onClose={() => setSettlingLoan(null)} 
            onConfirm={closeLoan} 
          />
        )}

        <Modal 
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onConfirm={modalConfig.onConfirm}
        />
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
        <BottomNavItem id="storage" icon={Settings} label="Storage" />
      </nav>
    </div>
  );
};

export default App;
