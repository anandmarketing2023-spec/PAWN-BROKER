import React, { useRef, useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  Smartphone,
  Info,
  Copy,
  CheckCircle,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Plus,
  ArrowRight,
  Clipboard,
  FileJson
} from 'lucide-react';
import { LoanEntry, BackupConfig, BackupEntry } from '../types';
import BackupManager from './BackupManager';
import Modal from './Modal';

interface StorageSettingsProps {
  loans: LoanEntry[];
  onImport: (loans: LoanEntry[]) => void;
  backupConfig: BackupConfig;
  onBackupConfigChange: (config: BackupConfig) => void;
  backups: BackupEntry[];
  appName: string;
  onAppNameChange: (name: string) => void;
  onRestoreBackup: (data: LoanEntry[]) => void;
  onDeleteBackup: (id: string) => void;
  onManualBackup: () => void;
  onExport: () => void;
  onFileImport: (file: File) => void;
}

const StorageSettings: React.FC<StorageSettingsProps> = ({ 
  loans, 
  onImport,
  backupConfig,
  onBackupConfigChange,
  backups,
  appName,
  onAppNameChange,
  onRestoreBackup,
  onDeleteBackup,
  onManualBackup,
  onExport,
  onFileImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPasting, setIsPasting] = useState(false);

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

  const deletedLoans = loans.filter(l => l.isDeleted);
  const activeLoansCount = loans.filter(l => !l.isDeleted).length;

  const handleRestore = (id: string) => {
    const newLoans = loans.map(l => l.id === id ? { ...l, isDeleted: false } : l);
    onImport(newLoans);
  };

  const handleHardDelete = (id: string) => {
    showModal(
      "Permanent Deletion",
      "Are you sure you want to PERMANENTLY DELETE this record? This action cannot be undone.",
      "warning",
      () => {
        const newLoans = loans.filter(l => l.id !== id);
        onImport(newLoans);
      }
    );
  };

  const handleEmptyTrash = () => {
    showModal(
      "Empty Trash",
      `Are you sure you want to permanently delete all ${deletedLoans.length} records in the trash?`,
      "warning",
      () => {
        const newLoans = loans.filter(l => !l.isDeleted);
        onImport(newLoans);
      }
    );
  };

  const handleRestoreFromSnapshot = () => {
    const snapshot = localStorage.getItem('girvi_loans_backup_latest');
    if (snapshot) {
      try {
        const { timestamp, data } = JSON.parse(snapshot);
        showModal(
          "Restore Snapshot",
          `Restore data from automatic snapshot taken on ${new Date(timestamp).toLocaleString()}? This will replace your current data.`,
          "confirm",
          () => {
            onImport(data);
            showModal("Success", "Data restored from snapshot!", "success");
          }
        );
      } catch (e) {
        showModal("Error", "Snapshot data is corrupted.", "warning");
      }
    } else {
      showModal("Not Found", "No automatic snapshots found on this device.", "info");
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(loans, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `balaji_ledger_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportCSV = () => {
    if (loans.length === 0) {
      showModal("No Data", "There is no data to export.", "info");
      return;
    }

    // Define headers
    const headers = [
      'Serial Number', 'Date', 'Name', 'Guardian', 'Address', 'Contact', 
      'Metal', 'Description', 'Weight', 'Net Weight', 'Amount', 'Interest Rate', 'Status', 'Remark'
    ];

    // Convert loans to CSV rows
    const rows = loans.map(loan => [
      loan.serialNumber,
      loan.date,
      `"${loan.name.replace(/"/g, '""')}"`,
      `"${loan.guardian.replace(/"/g, '""')}"`,
      `"${loan.address.replace(/"/g, '""')}"`,
      `"${loan.contactNumber.replace(/"/g, '""')}"`,
      loan.metalType,
      `"${loan.description.replace(/"/g, '""')}"`,
      loan.weight,
      loan.netWeight,
      loan.amount,
      loan.interestRate,
      loan.status,
      `"${(loan.remark || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${safeName}_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = async () => {
    try {
      const dataStr = JSON.stringify(loans, null, 2);
      await navigator.clipboard.writeText(dataStr);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      showModal("Error", "Failed to copy to clipboard.", "warning");
    }
  };

  const handleUpdateCheck = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      showModal(
        "App Update",
        "App is up to date (v1.0.0). Would you like to refresh the app?",
        "confirm",
        () => {
          window.location.reload();
        }
      );
    }, 1500);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (Array.isArray(importedData)) {
          showModal(
            "Confirm Import",
            `Import ${importedData.length} records? This will merge with your existing data.`,
            "confirm",
            () => {
              const existingIds = new Set(loans.map(l => l.id));
              const newLoans = [...loans];
              
              importedData.forEach((item: any) => {
                if (!existingIds.has(item.id)) {
                  newLoans.push(item);
                }
              });
              
              onImport(newLoans);
              showModal("Success", "Data imported successfully!", "success");
            }
          );
        } else {
          showModal("Error", "Invalid file format.", "warning");
        }
      } catch (err) {
        showModal("Error", "Error parsing file.", "warning");
      }
    };
    
    fileReader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteImport = async () => {
    try {
      setIsPasting(true);
      const text = await navigator.clipboard.readText();
      const importedData = JSON.parse(text);
      
      if (Array.isArray(importedData)) {
        showModal(
          "Confirm Import",
          `Import ${importedData.length} records from clipboard?`,
          "confirm",
          () => {
            const existingIds = new Set(loans.map(l => l.id));
            const newLoans = [...loans];
            
            importedData.forEach((item: any) => {
              if (!existingIds.has(item.id)) {
                newLoans.push(item);
              }
            });
            
            onImport(newLoans);
            showModal("Success", "Data imported successfully!", "success");
          }
        );
      } else {
        showModal("Error", "Invalid data in clipboard.", "warning");
      }
    } catch (err) {
      showModal("Error", "Failed to read from clipboard or invalid data.", "warning");
    } finally {
      setIsPasting(false);
    }
  };

  const storageSize = new Blob([JSON.stringify(loans)]).size;
  const formattedSize = (storageSize / 1024).toFixed(2);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-blue-500 p-2 rounded-xl text-white shadow-md">
          <Database size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data & Storage</h1>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start space-x-4">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 mb-1">Privacy First Storage</h3>
          <p className="text-blue-800/80 text-sm leading-relaxed">
            Your data is stored <strong>locally on this device</strong>. No data is sent to any server. 
            Ensure you take regular backups to avoid data loss.
          </p>
        </div>
      </div>

      {/* Auto Backup Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 mb-3 flex items-center">
            <Plus size={18} className="mr-2 text-yellow-500" />
            Application Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Business Name (App Title)</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all outline-none text-base font-bold text-slate-800" 
                value={appName} 
                onChange={e => onAppNameChange(e.target.value)} 
                placeholder="Enter Business Name"
              />
              <p className="text-[10px] text-slate-400 mt-2 ml-1 italic">This name will be used in the header, sidebar, and export files.</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <BackupManager 
            config={backupConfig} 
            onConfigChange={onBackupConfigChange} 
            backups={backups} 
            onRestore={onRestoreBackup} 
            onDeleteBackup={onDeleteBackup} 
            onManualBackup={onManualBackup} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Simple Backup Card */}
        <div className="bg-white border-2 border-yellow-500 rounded-3xl p-8 shadow-xl shadow-yellow-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Download size={80} className="text-yellow-600" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Simple Backup</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Download a single file containing all your ledger records. Save this file to your Google Drive, Email, or WhatsApp to keep your data safe.
            </p>
            
            <button 
              onClick={onExport}
              className="w-full flex items-center justify-center space-x-3 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-white py-5 rounded-2xl transition-all font-black shadow-lg shadow-yellow-200"
            >
              <Download size={24} />
              <span className="uppercase tracking-widest">Download Backup File</span>
            </button>
            <p className="text-center mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Recommended for daily safety
            </p>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-slate-900 rounded-3xl p-8 shadow-xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Upload size={80} className="text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Restore Backup</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Upload your previously saved backup file to restore all your records. This will automatically read the file and update your ledger.
            </p>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 py-5 rounded-2xl transition-all font-black shadow-lg"
            >
              <Upload size={24} />
              <span className="uppercase tracking-widest">Select Backup File</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileImport(file);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }} 
              accept=".json" 
              className="hidden" 
            />
            <p className="text-center mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Select the .json file you downloaded
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Other Formats Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            <FileText size={18} className="mr-2 text-slate-400" />
            Excel Export
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center space-x-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-4 rounded-xl transition-all font-bold border border-emerald-100"
            >
              <FileText size={20} />
              <div className="text-left">
                <div className="text-sm">Download CSV (Excel)</div>
                <div className="text-[10px] opacity-70 font-normal">Best for viewing on computer</div>
              </div>
            </button>
            
            <button 
              onClick={handleCopyToClipboard}
              className={`w-full flex items-center justify-center space-x-3 py-4 rounded-xl transition-all font-bold border ${
                copySuccess 
                ? 'bg-green-50 border-green-200 text-green-600' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {copySuccess ? <CheckCircle size={20} /> : <Copy size={20} />}
              <span className="text-sm">{copySuccess ? 'Copied to Clipboard' : 'Copy All Data'}</span>
            </button>
          </div>
        </div>

        {/* Device Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <Smartphone size={18} className="mr-2 text-slate-400" />
            Device Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Active Records</span>
              <span className="font-bold text-slate-800">{activeLoansCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Storage Used</span>
              <span className="font-bold text-slate-800">{formattedSize} KB</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 text-sm">Safety Net</span>
              <button 
                onClick={handleRestoreFromSnapshot}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center"
              >
                <RotateCcw size={12} className="mr-1" />
                Restore Snapshot
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Trash Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Trash2 size={18} className="mr-2 text-slate-400" />
              Trash Can
            </h3>
            {deletedLoans.length > 0 && (
              <button 
                onClick={handleEmptyTrash}
                className="text-[10px] font-bold text-red-500 uppercase hover:underline"
              >
                Empty Trash
              </button>
            )}
          </div>
          
          {deletedLoans.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-xs italic">Trash is empty</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
              {deletedLoans.map(loan => (
                <div key={loan.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-800 truncate">#{loan.serialNumber} - {loan.name}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => handleRestore(loan.id)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button 
                      onClick={() => handleHardDelete(loan.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      <div className="text-center py-4">
        <p className="text-slate-400 text-[10px] flex items-center justify-center uppercase tracking-widest font-bold">
          <Info size={12} className="mr-1" />
          Version 1.0.0 • {appName}
        </p>
      </div>

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

export default StorageSettings;
