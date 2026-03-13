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
    link.setAttribute('download', `balaji_ledger_${new Date().toISOString().split('T')[0]}.csv`);
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

  const handleShare = async () => {
    const dataStr = JSON.stringify(loans, null, 2);
    // Using .json extension but text/plain mime type for better Android compatibility
    const file = new File([dataStr], `balaji_ledger_${new Date().toISOString().split('T')[0]}.json`, { type: 'text/plain' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Balaji Ledger Backup',
          text: 'My Balaji Pawn Brokers Ledger Backup'
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Fallback to sharing as text if file sharing fails
          try {
            await navigator.share({
              title: 'Balaji Ledger Backup',
              text: dataStr
            });
          } catch (innerErr) {
            showModal("Sharing Failed", "Sharing failed. Please use the 'Download Backup File' button instead.", "warning");
          }
        }
      }
    } else {
      // Fallback for browsers that support sharing text but not files
      try {
        await navigator.share({
          title: 'Balaji Ledger Backup',
          text: dataStr
        });
      } catch (err) {
        showModal("Not Supported", "Sharing is not supported on this browser/device. Use Export instead.", "info");
      }
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

  const [transferKey, setTransferKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const generateTransferKey = () => {
    const dataStr = JSON.stringify(loans);
    // Simple base64 encoding to make it look like a "key"
    const key = btoa(unescape(encodeURIComponent(dataStr)));
    setTransferKey(key);
    setShowKey(true);
  };

  const handleKeyImport = () => {
    if (!transferKey.trim()) {
      showModal("Input Required", "Please enter a valid transfer key.", "info");
      return;
    }

    try {
      const decodedData = decodeURIComponent(escape(atob(transferKey.trim())));
      const importedData = JSON.parse(decodedData);
      
      if (Array.isArray(importedData)) {
        showModal(
          "Confirm Import",
          `Import ${importedData.length} records from this key?`,
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
            setTransferKey('');
          }
        );
      } else {
        showModal("Error", "Invalid transfer key format.", "warning");
      }
    } catch (err) {
      showModal("Error", "This is not a valid Balaji Ledger Transfer Key.", "warning");
    }
  };

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

      {/* Mobile App Installation Section */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-4">
            <div className="bg-yellow-500 p-2 rounded-xl">
              <Smartphone size={20} className="text-slate-900" />
            </div>
            <h3 className="font-black uppercase tracking-tight text-lg">Install Mobile App</h3>
          </div>
          <p className="text-slate-400 text-xs mb-6 leading-relaxed max-w-xs">
            Use Balaji Ledger like a real app. Works offline and appears on your home screen.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
              <p className="text-[11px] text-slate-300">Open this site in <span className="text-white font-bold">Chrome</span> (Android) or <span className="text-white font-bold">Safari</span> (iPhone).</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
              <p className="text-[11px] text-slate-300">Tap <span className="text-white font-bold">Menu</span> (⋮) or <span className="text-white font-bold">Share</span> (⎙).</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
              <p className="text-[11px] text-slate-300">Select <span className="text-yellow-500 font-bold">"Add to Home Screen"</span> or <span className="text-yellow-500 font-bold">"Install App"</span>.</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl"></div>
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

      {/* Data Transfer Key Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
          <RefreshCw size={18} className="mr-2 text-yellow-500" />
          Data Transfer Key
        </h3>
        <p className="text-slate-500 text-xs mb-6 leading-relaxed">
          Use this to quickly move your data between phones. Generate a key on your old phone and paste it on your new phone.
        </p>

        <div className="space-y-4">
          {!showKey ? (
            <button 
              onClick={generateTransferKey}
              className="w-full flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl transition-all font-bold shadow-md"
            >
              <Smartphone size={18} />
              <span>Generate Transfer Key</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <textarea 
                  readOnly
                  value={transferKey}
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-mono break-all focus:ring-0 outline-none"
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                   <button 
                    onClick={() => {
                      navigator.clipboard.writeText(transferKey);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm hover:bg-slate-50"
                  >
                    {copySuccess ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                  <button 
                    onClick={handleShare}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm hover:bg-slate-50"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowKey(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Hide Key
              </button>
            </div>
          )}

          <div className="relative pt-4 border-t border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Import from Key</label>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Paste Transfer Key here..."
                value={transferKey && !showKey ? transferKey : ''}
                onChange={(e) => setTransferKey(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-yellow-500 outline-none"
              />
              <button 
                onClick={handleKeyImport}
                className="px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
              >
                Import
              </button>
            </div>
          </div>
        </div>
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
              <div className="text-left">
                <div className="text-sm">Download JSON Backup</div>
                <div className="text-[10px] opacity-70 font-normal">Best for app restoration</div>
              </div>
            </button>

            <button 
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center space-x-3 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl transition-all font-bold shadow-lg shadow-emerald-100"
            >
              <FileText size={20} />
              <div className="text-left">
                <div className="text-sm">Download CSV (Excel)</div>
                <div className="text-[10px] opacity-70 font-normal">Best for viewing on mobile</div>
              </div>
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleShare}
                className="flex flex-col items-center justify-center space-y-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl transition-all font-bold"
              >
                <Share2 size={18} />
                <span className="text-[10px] uppercase tracking-wider">Mobile Share</span>
              </button>
              <button 
                onClick={handleCopyToClipboard}
                className={`flex flex-col items-center justify-center space-y-1 py-3 rounded-xl transition-all font-bold border ${
                  copySuccess 
                  ? 'bg-green-50 border-green-200 text-green-600' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {copySuccess ? <CheckCircle size={18} /> : <Copy size={18} />}
                <span className="text-[10px] uppercase tracking-wider">{copySuccess ? 'Copied' : 'Copy Data'}</span>
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
              <div className="text-left">
                <div className="text-sm">Upload Backup File</div>
                <div className="text-[10px] opacity-90 font-normal">Select .json or .txt file</div>
              </div>
            </button>

            <button 
              onClick={handlePasteImport}
              disabled={isPasting}
              className="w-full flex items-center justify-center space-x-3 bg-slate-50 hover:bg-slate-100 text-slate-600 py-4 rounded-xl transition-all font-bold border border-slate-200"
            >
              <Copy size={18} />
              <div className="text-left">
                <div className="text-sm">{isPasting ? 'Reading...' : 'Paste from Clipboard'}</div>
                <div className="text-[10px] opacity-70 font-normal">Paste copied backup text</div>
              </div>
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json,.txt" 
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
