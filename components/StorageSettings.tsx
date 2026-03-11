import React, { useRef, useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  Smartphone,
  Info,
  RefreshCw,
  Copy,
  Share2,
  CheckCircle,
  Trash2,
  RotateCcw,
  History,
  AlertTriangle
} from 'lucide-react';
import { LoanEntry, BackupConfig, BackupEntry } from '../types';
import BackupManager from './BackupManager';

interface StorageSettingsProps {
  loans: LoanEntry[];
  onImport: (loans: LoanEntry[]) => void;
  backupConfig: BackupConfig;
  onBackupConfigChange: (config: BackupConfig) => void;
  backups: BackupEntry[];
  onRestoreBackup: (data: LoanEntry[]) => void;
  onDeleteBackup: (id: string) => void;
  onManualBackup: () => void;
}

const StorageSettings: React.FC<StorageSettingsProps> = ({ 
  loans, 
  onImport,
  backupConfig,
  onBackupConfigChange,
  backups,
  onRestoreBackup,
  onDeleteBackup,
  onManualBackup
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const deletedLoans = loans.filter(l => l.isDeleted);
  const activeLoansCount = loans.filter(l => !l.isDeleted).length;

  const handleRestore = (id: string) => {
    const newLoans = loans.map(l => l.id === id ? { ...l, isDeleted: false } : l);
    onImport(newLoans);
  };

  const handleHardDelete = (id: string) => {
    if (window.confirm("PERMANENTLY DELETE this record? This cannot be undone.")) {
      const newLoans = loans.filter(l => l.id !== id);
      onImport(newLoans);
    }
  };

  const handleEmptyTrash = () => {
    if (window.confirm(`Permanently delete all ${deletedLoans.length} records in trash?`)) {
      const newLoans = loans.filter(l => !l.isDeleted);
      onImport(newLoans);
    }
  };

  const handleRestoreFromSnapshot = () => {
    const snapshot = localStorage.getItem('girvi_loans_backup_latest');
    if (snapshot) {
      try {
        const { timestamp, data } = JSON.parse(snapshot);
        if (window.confirm(`Restore data from automatic snapshot taken on ${new Date(timestamp).toLocaleString()}? This will replace your current data.`)) {
          onImport(data);
          alert('Data restored from snapshot!');
        }
      } catch (e) {
        alert('Snapshot data is corrupted.');
      }
    } else {
      alert('No automatic snapshots found on this device.');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(loans, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `girvigold_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleCopyToClipboard = async () => {
    try {
      const dataStr = JSON.stringify(loans, null, 2);
      await navigator.clipboard.writeText(dataStr);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    const dataStr = JSON.stringify(loans, null, 2);
    const file = new File([dataStr], `girvigold_backup_${new Date().toISOString().split('T')[0]}.json`, { type: 'application/json' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'GirviGold Backup',
          text: 'My GirviGold Ledger Backup'
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          alert('Sharing failed');
        }
      }
    } else {
      alert('Sharing is not supported on this browser/device. Use Export instead.');
    }
  };

  const handleUpdateCheck = () => {
    setIsUpdating(true);
    // Simulate checking for updates
    setTimeout(() => {
      setIsUpdating(false);
      if (window.confirm("App is up to date (v1.0.0). Would you like to refresh the application to ensure everything is synced?")) {
        window.location.reload();
      }
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
          if (window.confirm(`Import ${importedData.length} records? This will merge with your existing data.`)) {
            // Simple merge by ID to avoid duplicates
            const existingIds = new Set(loans.map(l => l.id));
            const newLoans = [...loans];
            
            importedData.forEach((item: any) => {
              if (!existingIds.has(item.id)) {
                newLoans.push(item);
              }
            });
            
            onImport(newLoans);
            alert('Data imported successfully!');
          }
        } else {
          alert('Invalid file format. Please upload a valid backup file.');
        }
      } catch (err) {
        alert('Error parsing file. Make sure it is a valid JSON backup.');
      }
    };
    
    fileReader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteImport = async () => {
    try {
      setIsPasting(true);
      const text = await navigator.clipboard.readText();
      const importedData = JSON.parse(text);
      
      if (Array.isArray(importedData)) {
        if (window.confirm(`Import ${importedData.length} records from clipboard? This will merge with your existing data.`)) {
          const existingIds = new Set(loans.map(l => l.id));
          const newLoans = [...loans];
          
          importedData.forEach((item: any) => {
            if (!existingIds.has(item.id)) {
              newLoans.push(item);
            }
          });
          
          onImport(newLoans);
          alert('Data imported successfully from clipboard!');
        }
      } else {
        alert('Invalid data in clipboard. Please copy a valid backup JSON.');
      }
    } catch (err) {
      alert('Failed to read from clipboard or invalid data format.');
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
            This ensures maximum privacy and offline accessibility, but means if you clear your browser cache 
            or lose your device, your records might be lost.
          </p>
        </div>
      </div>

      {/* Auto Backup Section */}
      <BackupManager 
        config={backupConfig} 
        onConfigChange={onBackupConfigChange} 
        backups={backups} 
        onRestore={onRestoreBackup} 
        onDeleteBackup={onDeleteBackup} 
        onManualBackup={onManualBackup} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Smartphone size={18} className="mr-2 text-slate-400" />
              Device Status
            </h3>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-md">
              Local Only
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Active Records</span>
              <span className="font-bold text-slate-800">{activeLoansCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Trash (Deleted)</span>
              <span className="font-bold text-red-500">{deletedLoans.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Storage Used</span>
              <span className="font-bold text-slate-800">{formattedSize} KB</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 text-sm">Location</span>
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">localStorage</span>
            </div>
          </div>
        </div>

        {/* Backup Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <Download size={18} className="mr-2 text-slate-400" />
            Backup & Restore
          </h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExport}
                className="flex flex-col items-center justify-center space-y-2 bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-xl transition-all font-medium text-sm"
              >
                <Download size={20} />
                <span>Save File</span>
              </button>
              
              <button 
                onClick={handleShare}
                className="flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl transition-all font-medium text-sm"
              >
                <Share2 size={20} />
                <span>Share Data</span>
              </button>
            </div>

            <button 
              onClick={handleCopyToClipboard}
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl transition-all font-medium border ${
                copySuccess 
                ? 'bg-green-50 border-green-200 text-green-600' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {copySuccess ? <CheckCircle size={18} /> : <Copy size={18} />}
              <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy Data to Clipboard'}</span>
            </button>
            
            <div className="pt-2 border-t border-slate-100 mt-2 space-y-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl transition-all font-medium shadow-md shadow-yellow-100"
              >
                <Upload size={18} />
                <span>Import from File</span>
              </button>

              <button 
                onClick={handlePasteImport}
                disabled={isPasting}
                className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-all font-medium border border-slate-200"
              >
                <Upload size={18} />
                <span>{isPasting ? 'Reading...' : 'Paste Data from Clipboard'}</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json" 
              className="hidden" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recovery Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <History size={18} className="mr-2 text-slate-400" />
            Device Recovery
          </h3>
          <p className="text-slate-500 text-xs mb-4">
            If data is accidentally lost or deleted, you can try to recover it from the automatic snapshot stored on this device.
          </p>
          <button 
            onClick={handleRestoreFromSnapshot}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl transition-all font-medium"
          >
            <RotateCcw size={18} />
            <span>Restore from Auto-Snapshot</span>
          </button>
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
            <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-xs italic">Trash is empty</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {deletedLoans.map(loan => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">#{loan.serialNumber} - {loan.name}</p>
                    <p className="text-[10px] text-slate-500">₹{loan.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleRestore(loan.id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Restore"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button 
                      onClick={() => handleHardDelete(loan.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Update Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center">
            <RefreshCw size={18} className="mr-2 text-slate-400" />
            App Updates
          </h3>
          <span className="text-xs font-bold text-slate-400">v1.0.0</span>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          Check for new features or security updates. Your data will remain safe during the update process.
        </p>
        <button 
          onClick={handleUpdateCheck}
          disabled={isUpdating}
          className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 px-6 py-3 rounded-xl transition-all font-bold text-slate-700"
        >
          <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
          <span>{isUpdating ? 'Checking...' : 'Check for Updates'}</span>
        </button>
      </div>

      <div className="text-center py-4">
        <p className="text-slate-400 text-xs flex items-center justify-center">
          <Info size={12} className="mr-1" />
          Version 1.0.0 • Built for Balaji Pawn Brokers
        </p>
      </div>
    </div>
  );
};

export default StorageSettings;
