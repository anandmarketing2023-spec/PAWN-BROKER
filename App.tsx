
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
import { getAllLoans, saveLoans, getConfig, saveConfig, getAllBackups, saveBackupsToDB } from './src/db';
import Dashboard from './components/Dashboard';
import LoanEntryForm from './components/LoanEntryForm';
import Ledger from './components/Ledger';
import CustomerSheet from './components/CustomerSheet';
import StorageSettings from './components/StorageSettings';
import SettlementModal from './components/SettlementModal';
import TransactionModal from './components/TransactionModal';
import Modal from './components/Modal';
import { Transaction } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'ledger' | 'customers' | 'storage'>('dashboard');
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({ frequency: 'Daily', enabled: true });
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [appName, setAppName] = useState<string>('BALAJI PAWN BROKERS');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanEntry | null>(null);
  const [settlingLoan, setSettlingLoan] = useState<LoanEntry | null>(null);
  const [transactingLoan, setTransactingLoan] = useState<LoanEntry | null>(null);
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
    const loadData = async () => {
      try {
        const savedLoans = await getAllLoans();
        if (savedLoans.length > 0) {
          setLoans(savedLoans);
        } else {
          // Fallback to localStorage for migration
          const legacyLoans = localStorage.getItem('girvi_loans');
          if (legacyLoans) {
            const parsed = JSON.parse(legacyLoans);
            setLoans(parsed);
            await saveLoans(parsed);
          }
        }

        const savedConfig = await getConfig('backup_config');
        if (savedConfig) {
          setBackupConfig(savedConfig);
        } else {
          const legacyConfig = localStorage.getItem('girvi_backup_config');
          if (legacyConfig) {
            const parsed = JSON.parse(legacyConfig);
            setBackupConfig(parsed);
            await saveConfig('backup_config', parsed);
          }
        }

        const savedAppName = await getConfig('app_name');
        if (savedAppName) {
          setAppName(savedAppName);
        }

        const savedBackups = await getAllBackups();
        if (savedBackups.length > 0) {
          setBackups(savedBackups);
        } else {
          const legacyBackups = localStorage.getItem('girvi_backups');
          if (legacyBackups) {
            const parsed = JSON.parse(legacyBackups);
            setBackups(parsed);
            await saveBackupsToDB(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
      } finally {
        // Simulate initial load for professional feel
        setTimeout(() => {
          setIsLoading(false);
        }, 1200);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveConfig('backup_config', backupConfig);
    }
  }, [backupConfig, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveConfig('app_name', appName);
    }
  }, [appName, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveBackupsToDB(backups);
    }
  }, [backups, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveLoans(loans);
    }
  }, [loans, isLoading]);

  useEffect(() => {
    document.title = `${appName} - Digital Ledger`;
  }, [appName]);

  const exportData = () => {
    const data = {
      loans,
      backupConfig,
      backups,
      appName,
      version: '1.0',
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeName}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal("Export Successful", "Your data has been exported to a file. Keep it safe!", "success");
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.loans && Array.isArray(data.loans)) {
          showModal(
            "Confirm Import",
            `This will replace your current ${loans.length} records with ${data.loans.length} records from the backup file. Continue?`,
            "warning",
            async () => {
              setLoans(data.loans);
              if (data.backupConfig) setBackupConfig(data.backupConfig);
              if (data.backups) setBackups(data.backups);
              if (data.appName) setAppName(data.appName);
              
              await saveLoans(data.loans);
              if (data.backupConfig) await saveConfig('backup_config', data.backupConfig);
              if (data.backups) await saveBackupsToDB(data.backups);
              if (data.appName) await saveConfig('app_name', data.appName);
              
              showModal("Import Successful", "Your data has been restored from the backup file.", "success");
            }
          );
        } else {
          showModal("Invalid File", "The selected file is not a valid Balaji Ledger backup.", "warning");
        }
      } catch (err) {
        showModal("Error", "Failed to read the backup file. It might be corrupted.", "warning");
      }
    };
    reader.readAsText(file);
  };

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
  
  const handleSaveTransaction = (id: string, transaction: Transaction) => {
    setLoans(loans.map(l => {
      if (l.id === id) {
        const transactions = [...(l.transactions || []), transaction];
        return { ...l, transactions };
      }
      return l;
    }));
    showModal("Success", "Transaction saved successfully!", "success");
  };

  const handleRenew = (oldLoanId: string, settlementDate: string, settledInterest: number, newDetails: { amount: number, date: string, interestRate: number }) => {
    setLoans(prevLoans => {
      const updatedLoans = prevLoans.map(l => {
        if (l.id === oldLoanId) {
          return { ...l, status: 'Closed' as const, closeDate: settlementDate, settledInterest };
        }
        return l;
      });

      const oldLoan = prevLoans.find(l => l.id === oldLoanId);
      if (!oldLoan) return updatedLoans;

      const nextSerial = updatedLoans.filter(l => !l.isDeleted).length > 0 
        ? Math.max(...updatedLoans.filter(l => !l.isDeleted).map(l => l.serialNumber)) + 1 
        : 1;

      const newLoan: LoanEntry = {
        ...oldLoan,
        id: crypto.randomUUID(),
        serialNumber: nextSerial,
        date: newDetails.date,
        amount: newDetails.amount,
        interestRate: newDetails.interestRate,
        status: 'Active',
        closeDate: undefined,
        settledInterest: undefined,
        transactions: [], // Reset transactions for new loan
        remark: `${oldLoan.remark ? oldLoan.remark + ' | ' : ''}Renewed from #${oldLoan.serialNumber}`
      };

      return [newLoan, ...updatedLoans];
    });

    setSettlingLoan(null);
    showModal("Success", "Account renewed successfully! New entry created.", "success");
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
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">{appName.split(' ')[0]} Ledger</h1>
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
          <span className="text-xl font-bold text-slate-800 tracking-tight leading-tight">{appName}</span>
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

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="px-4 py-2">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">v1.0.0 Stable</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-yellow-500 p-1.5 rounded-lg text-white">
            <TrendingUp size={20} />
          </div>
          <span className="text-base font-bold text-slate-800">{appName}</span>
        </div>
        <div className="flex items-center space-x-2">
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
              loans={activeLoans}
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
              onAddTransaction={setTransactingLoan}
              appName={appName}
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
              appName={appName}
              onAppNameChange={setAppName}
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
              onExport={exportData}
              onFileImport={importData}
            />
          )}
        </div>

        {settlingLoan && (
          <SettlementModal 
            loan={settlingLoan} 
            onClose={() => setSettlingLoan(null)} 
            onConfirm={closeLoan} 
            onRenew={handleRenew}
          />
        )}

        {transactingLoan && (
          <TransactionModal 
            loan={transactingLoan} 
            onClose={() => setTransactingLoan(null)} 
            onSave={handleSaveTransaction} 
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)] h-[calc(4rem+env(safe-area-inset-bottom))]">
        <BottomNavItem id="dashboard" icon={LayoutDashboard} label="Home" />
        <BottomNavItem id="ledger" icon={BookOpen} label="Ledger" />
        <div className="relative -top-6">
           <button 
            onClick={() => { setActiveTab('entry'); setEditingLoan(null); }}
            className={`p-4 rounded-full shadow-lg transition-transform active:scale-90 ${activeTab === 'entry' ? 'bg-yellow-600' : 'bg-yellow-500'} text-white border-4 border-slate-50 h-16 w-16 flex items-center justify-center`}
           >
             <PlusCircle size={32} />
           </button>
        </div>
        <BottomNavItem id="customers" icon={Users} label="Sheet" />
        <BottomNavItem id="storage" icon={Settings} label="Storage" />
      </nav>
    </div>
  );
};

export default App;
