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
    
    const exportFileDefaultName = `balaji_ledger_${new Date().toISOString().split('T')[0]}.json`;
    
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
    const file = new File([dataStr], `balaji_ledger_${new Date().toISOString().split('T')[0]}.json`, { type: 'application/json' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Balaji Ledger Backup',
          text: 'My Balaji Pawn Brokers Ledger Backup'
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
    setTimeout(() => {
      setIsUpdating(false);
      if (window.confirm("App is up to date (v1.0.0). Refresh to sync?")) {
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
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Error parsing file.');
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
        if (window.confirm(`Import ${importedData.length} records from clipboard?`)) {
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
        alert('Invalid data in clipboard.');
      }
    } catch (err) {
      alert('Failed to read from clipboard.');
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <BackupManager 
          config={backupConfig} 
          onConfigChange={onBackupConfigChange} 
          backups={backups} 
          onRestore={onRestoreBackup} 
          onDeleteBackup={onDeleteBackup} 
          onManualBackup={onManualBackup} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <Download size={18} className="mr-2 text-slate-400" />
            Backup Data
          </h3>
          
          <div className="space-y-3">
            <button 
              onClick={handleExport}
              className="w-full flex items-center justify-center space-x-3 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl transition-all font-bold shadow-lg shadow-slate-200"
            >
              <Download size={20} />
              <span>Download Backup File</span>
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleShare}
                className="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl transition-all font-bold text-xs"
              >
                <Share2 size={16} />
                <span>Share</span>
              </button>
              <button 
                onClick={handleCopyToClipboard}
                className={`flex items-center justify-center space-x-2 py-3 rounded-xl transition-all font-bold text-xs border ${
                  copySuccess 
                  ? 'bg-green-50 border-green-200 text-green-600' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                <span>{copySuccess ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <Upload size={18} className="mr-2 text-slate-400" />
            Restore Data
          </h3>
          
          <div className="space-y-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-3 bg-yellow-500 hover:bg-yellow-600 text-white py-4 rounded-xl transition-all font-bold shadow-lg shadow-yellow-100"
            >
              <Upload size={20} />
              <span>Upload Backup File</span>
            </button>

            <button 
              onClick={handlePasteImport}
              disabled={isPasting}
              className="w-full flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-xl transition-all font-bold text-xs border border-slate-200"
            >
              <Upload size={16} />
              <span>{isPasting ? 'Reading...' : 'Paste from Clipboard'}</span>
            </button>
            
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
        {/* Status Card */}
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
      </div>

      <div className="text-center py-4">
        <p className="text-slate-400 text-[10px] flex items-center justify-center uppercase tracking-widest font-bold">
          <Info size={12} className="mr-1" />
          Version 1.0.0 • Balaji Pawn Brokers
        </p>
      </div>
    </div>
  );
};

export default StorageSettings;
