import React, { useRef, useState, useEffect } from 'react';
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
  FileJson,
  RefreshCw,
  Link,
  Wifi,
  HardDrive,
  History,
  Sparkles,
  Check,
  X,
  Share2
} from 'lucide-react';
import { LoanEntry, BackupConfig, BackupEntry } from '../types';
import { encodeLedgerData, decodeLedgerData, safeLocalStorage } from '../src/utils';
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
  isCloudActive?: boolean;
  localLoansCount?: number;
  onTransferToCloud?: () => Promise<void>;
  appVersion: string;
  onUpdateApp: () => void;
  isBackupDoneForUpdate: boolean;
  isUpdating: boolean;
}

interface LocalRecoverySnapshot {
  id: string;
  timestamp: string;
  recordCount: number;
  data: LoanEntry[];
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
  onFileImport,
  isCloudActive,
  localLoansCount,
  onTransferToCloud,
  appVersion,
  onUpdateApp,
  isBackupDoneForUpdate,
  isUpdating
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'vault' | 'build' | 'trash'>('vault');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPasting, setIsPasting] = useState(false);

  // Direct Device-to-Device Transfer States
  const [transferPayload, setTransferPayload] = useState('');
  const [copyPayloadSuccess, setCopyPayloadSuccess] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  // Mobile/Iframe Backup Fallback Modal State
  const [showBackupFallback, setShowBackupFallback] = useState(false);
  const [backupString, setBackupString] = useState('');
  const [fallbackCopied, setFallbackCopied] = useState(false);

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

  const handleCopyTransferKey = () => {
    try {
      const payload = encodeLedgerData(loans);
      navigator.clipboard.writeText(payload);
      setCopyPayloadSuccess(true);
      setTimeout(() => setCopyPayloadSuccess(false), 2000);
      showModal(
        "Transfer Stream Copied", 
        "Portable text database sync key has been copied to your clipboard. Back on your other phone or tablet, paste this payload string into the 'Sync Offline Sequence' input field inside this screen to synchronize data!", 
        "success"
      );
    } catch (err: any) {
      showModal("Packaging Failed", `Error creating portable ledger sync key: ${err.message || err}`, "warning");
    }
  };

  const handleCopySyncLink = () => {
    try {
      const payload = encodeLedgerData(loans);
      const url = `${window.location.origin}${window.location.pathname}?transfer=${encodeURIComponent(payload)}`;
      navigator.clipboard.writeText(url);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
      showModal(
        "Direct Sync Link Copied!", 
        "Quick link has been successfully created and copied to your clipboard. Simply open or share this link with your secondary phone or tablet to instantly sync and merge records in 1-click!", 
        "success"
      );
    } catch (err: any) {
      showModal("URL Creation Failed", `Unable to generate query string direct beam: ${err.message || err}`, "warning");
    }
  };

  const handleProcessTransferKey = (textToProcess: string) => {
    if (!textToProcess.trim()) {
      showModal("Pasted Code Empty", "Please paste the backup passcode or synchronization payload string copied from your other device first.", "warning");
      return;
    }
    try {
      const imported = decodeLedgerData(textToProcess.trim());
      if (imported && Array.isArray(imported) && imported.length > 0) {
        showModal(
          "Transfer Payload Decrypted",
          `We successfully decoded ${imported.length} customer bookkeeping records.\n\nWould you like to MERGE and append these entries safely with your active on-device list without deleting any existing data?`, 
          "confirm",
          () => {
            const existingIds = new Set(loans.map(l => l.id));
            const merged = [...loans];
            let addedCount = 0;
            imported.forEach((item: any) => {
              if (!existingIds.has(item.id)) {
                const isDup = loans.some(existing => 
                  existing.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
                  existing.amount === item.amount &&
                  existing.serialNumber === item.serialNumber
                );
                if (!isDup) {
                  merged.push(item);
                  addedCount++;
                }
              }
            });
            onImport(merged);
            setTransferPayload('');
            showModal("Sync Completed", `Successfully merged. Added ${addedCount} brand new ledger records to this device's local database!`, "success");
          }
        );
      } else {
        throw new Error("Parsed ledger stream contains zero valid user entries.");
      }
    } catch (err: any) {
      showModal("Sync Signature Fault", `Failed to parse transport string. Ensure you copied the entire sequence from your other device accurately. Details: ${err.message || err}`, "warning");
    }
  };

  // Hardware Recovery Vault (on-device local storage copies)
  const [localSnapshots, setLocalSnapshots] = useState<LocalRecoverySnapshot[]>([]);

  // Load redundant hardware copies on mount / tap
  useEffect(() => {
    const loadHardwareVault = () => {
      try {
        const raw = safeLocalStorage.getItem('girvi_device_recovery_vault');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setLocalSnapshots(parsed);
          }
        }
      } catch (err) {
        console.error("Error reading hardware recovery database: ", err);
      }
    };
    loadHardwareVault();
  }, [loans, activeTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileImport(file);
      e.target.value = '';
    }
  };

  const handleRestoreFromLocalVault = (snapshotId: string) => {
    const match = localSnapshots.find(s => s.id === snapshotId);
    if (!match) return;

    showModal(
      "Confirm Hardware Reclaim",
      `Retrieve lost bookkeeping records from device local snapshot taken on ${new Date(match.timestamp).toLocaleString()}? This will override your current view with these ${match.recordCount} accounts.`,
      "confirm",
      () => {
        onImport(match.data);
        showModal("Database Restored", `Successfully reloaded ${match.recordCount} records from the persistent device hardware node.`, "success");
      }
    );
  };

  const clearLocalVault = () => {
    showModal(
      "Purge Hardware Safe",
      "Are you sure you want to delete all historical on-device recovery snapshots? This action wipes local fallback copies permanently.",
      "warning",
      () => {
        safeLocalStorage.removeItem('girvi_device_recovery_vault');
        setLocalSnapshots([]);
        showModal("Vault Purged", "Device backup cache has been deleted successfully.", "success");
      }
    );
  };

  const handleUpdateCheck = () => {
    if (!isBackupDoneForUpdate) {
      showModal(
        "Backup Protection Active",
        "To protect bookkeeping data during software modification, please create an automated or manual backup before installing this patch.",
        "warning"
      );
      return;
    }
    onUpdateApp();
  };

  const handleExportCSV = () => {
    if (loans.length === 0) {
      showModal("No Data", "There is no active data to convert.", "info");
      return;
    }

    const headers = [
      'Serial', 'Date', 'Name', 'Guardian', 'Address', 'Contact', 
      'Metal', 'Weight', 'Net Weight', 'Principal Amount', 'Interest Rate', 'Status'
    ];

    const rows = loans.map(loan => [
      loan.serialNumber,
      loan.date,
      `"${loan.name.replace(/"/g, '""')}"`,
      `"${loan.guardian.replace(/"/g, '""')}"`,
      `"${loan.address.replace(/"/g, '""')}"`,
      `"${loan.contactNumber.replace(/"/g, '""')}"`,
      loan.metalType,
      loan.weight,
      loan.netWeight,
      loan.amount,
      loan.interestRate,
      loan.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${safeName}_digital_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTriggerExportJSON = () => {
    // 1. Attempt standard browser download
    onExport();

    // 2. Prepare high-fidelity copy-paste fallback data
    try {
      const data = {
        loans,
        backupConfig,
        backups,
        appName,
        version: '1.0',
        exportDate: new Date().toISOString()
      };
      setBackupString(JSON.stringify(data, null, 2));
      setFallbackCopied(false);
      setShowBackupFallback(true);
    } catch (err) {
      console.error("Fallback payload construction failed", err);
    }
  };

  const handleCopyFallbackText = () => {
    try {
      navigator.clipboard.writeText(backupString);
      setFallbackCopied(true);
      setTimeout(() => setFallbackCopied(false), 2000);
    } catch (e) {
      showModal("Copy Failed", "Failed to copy data payload string automatically. Please select the text manually.", "warning");
    }
  };

  const handleMobileNativeShare = async () => {
    if (!navigator.share) {
      showModal("Not Supported", "Native sharing is not supported on this browser. Please use the Copy button instead.", "info");
      return;
    }
    try {
      await navigator.share({
        title: `${appName} Backup - ${new Date().toLocaleDateString()}`,
        text: backupString
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Native share failed: ", err);
      }
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const dataStr = JSON.stringify(loans, null, 2);
      await navigator.clipboard.writeText(dataStr);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showModal("Copied", "Entire raw ledger dataset copied to clipboard successfully.", "success");
    } catch (err) {
      showModal("Error", "Failed to copy text payload.", "warning");
    }
  };

  const handlePasteImport = async () => {
    try {
      setIsPasting(true);
      const text = await navigator.clipboard.readText();
      const cleanText = text.trim().replace(/^\ufeff/, '');
      const importedData = JSON.parse(cleanText);
      
      let loansToImport: LoanEntry[] = [];
      if (Array.isArray(importedData)) {
        loansToImport = importedData;
      } else if (importedData && Array.isArray(importedData.loans)) {
        loansToImport = importedData.loans;
      }

      if (loansToImport.length > 0) {
        showModal(
          "Verify Sandbox Import",
          `Inject ${loansToImport.length} records retrieved from text stream clipboard? Existing records with unique IDs will be preserved. (Current records will NOT be deleted).`,
          "confirm",
          () => {
            const existingIds = new Set(loans.map(l => l.id));
            const newLoans = [...loans];
            let count = 0;
            loansToImport.forEach((item: any) => {
              if (!existingIds.has(item.id)) {
                newLoans.push(item);
                count++;
              }
            });
            onImport(newLoans);
            showModal("Sandbox Restored", `Added ${count} records from text clipboard seamlessly without deletion.`, "success");
          }
        );
      } else {
        showModal("Validation Error", "Invalid data payload in clipboard stream. Could not find any valid customer logs.", "warning");
      }
    } catch (err) {
      showModal("Clipboard Access Denied", "Unable to read clipboard automatically. Please paste your data directly into the 'Sync Offline Sequence' textarea inside the 'Direct Sync' tab.", "warning");
    } finally {
      setIsPasting(false);
    }
  };

  const deletedLoans = loans.filter(l => l.isDeleted);
  const activeLoansCount = loans.filter(l => !l.isDeleted).length;
  const storageSize = new Blob([JSON.stringify(loans)]).size;
  const formattedSize = (storageSize / 1024).toFixed(2);

  const handleRestoreTrash = (id: string) => {
    const newLoans = loans.map(l => l.id === id ? { ...l, isDeleted: false } : l);
    onImport(newLoans);
  };

  const handleHardDelete = (id: string) => {
    showModal(
      "Permanent Deletion",
      "Are you sure you want to PERMANENTLY DELETE this record from system? This action bypasses trash and cannot be undone.",
      "warning",
      () => {
        const newLoans = loans.filter(l => l.id !== id);
        onImport(newLoans);
      }
    );
  };

  const handleEmptyTrash = () => {
    showModal(
      "Empty Trash Can",
      `Permanently discard all ${deletedLoans.length} pawn records currently inside the trash can? This cleans device space immediately.`,
      "warning",
      () => {
        const newLoans = loans.filter(l => !l.isDeleted);
        onImport(newLoans);
      }
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Redesigned Storage Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl text-white shadow-md shadow-amber-100 flex items-center justify-center">
            <Database size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Storage Command</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">Dual-Safeguard Local Storage, Cloud PIN Mirroring & File Controls</p>
          </div>
        </div>

        {/* Live System Heartbeat indicator */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 self-start sm:self-auto shadow-sm">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Dual-Write: OK</span>
        </div>
      </div>

      {/* Cloud Sync Status Info Header */}
      {isCloudActive ? (
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-md flex items-center space-x-3">
          <ShieldCheck className="shrink-0" size={22} />
          <div className="text-xs">
            <span className="font-bold">Real-Time Cloud Safeguard: </span>
            <span>All entries are securely uploaded instantly. Perfect device-to-device simultaneous ledger alignment active.</span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-md flex items-center space-x-3">
          <ShieldCheck className="shrink-0 animate-pulse" size={22} />
          <div className="text-xs">
            <span className="font-bold">Resilient Sandbox Environment: </span>
            <span>Ledger operates in offline mode with real-time automatic dual-writes to LocalStorage & IndexedDB. Safe from cache clearing!</span>
          </div>
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-2xl gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex-1 min-w-[100px] flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
            activeTab === 'vault' 
              ? 'bg-white text-amber-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive size={15} />
          <span>Device Vault</span>
        </button>
        <button
          onClick={() => setActiveTab('build')}
          className={`flex-1 min-w-[100px] flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
            activeTab === 'build' 
              ? 'bg-white text-purple-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw size={15} />
          <span>App Upgrade</span>
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`flex-1 min-w-[100px] flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
            activeTab === 'trash' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 size={15} />
          <span>Utilities</span>
        </button>
      </div>

      {/* TAB 1: DEVICE VAULT */}
      {activeTab === 'vault' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column A: Automated Daily Backup Panel */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center">
                <Database size={18} className="mr-2 text-amber-500" />
                Automatic Scheduled Snapshots
              </h2>
              <p className="text-slate-400 text-[11px] mt-1">Configure auto-triggered local ledger state protection protocols.</p>
            </div>

            <div className="border bg-slate-50 border-slate-200 rounded-2xl p-4">
              <BackupManager 
                config={backupConfig} 
                onConfigChange={onBackupConfigChange} 
                backups={backups} 
                onRestore={onRestoreBackup} 
                onDeleteBackup={onDeleteBackup} 
                onManualBackup={onManualBackup} 
              />
            </div>
            
            {/* Quick backup guidance warning */}
            <div className="flex items-start space-x-2.5 bg-amber-50 rounded-xl p-3 border border-amber-100">
              <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                <strong>Autopilot Routine Protection:</strong> With the backup scheduler active, your browser performs fully autonomous safety archival runs every 30 seconds by itself if the timer interval limit has expired. Keeps books airtight!
              </p>
            </div>
          </div>

          {/* Column B: Local Device Recovery Vault */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <HardDrive size={180} />
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">100% Persistent</span>
                <h3 className="text-lg font-black tracking-tight mt-1 uppercase">Local Hardware Savepoint</h3>
                <p className="text-slate-400 text-[10px] leading-relaxed mt-0.5">
                  Regain and restore lost pawn shop data directly from the device's persistent browser hardware vault automatically if your main storage is cleared.
                </p>
              </div>

              {/* Saved savepoints list */}
              <div className="space-y-2 mt-4 max-h-[320px] overflow-y-auto pr-1">
                {localSnapshots.length === 0 ? (
                  <div className="p-6 text-center bg-slate-800 border-2 border-dashed border-slate-700 rounded-2xl">
                    <History size={20} className="text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-[11px] italic">No hardware recovery savepoints captured yet. Snapshot is saved automatically on editing pawn data.</p>
                  </div>
                ) : (
                  localSnapshots.map((item, index) => (
                     <div 
                      key={item.id} 
                      className="p-3 bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-between hover:border-amber-400 transition-colors"
                     >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                          <span className="text-[10px] font-bold text-slate-200">
                            {index === 0 ? 'Latest Local Fallback' : `Savepoint #${localSnapshots.length - index}`}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400">
                          {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </p>
                        <span className="block text-[9px] font-black text-amber-400 uppercase">{item.recordCount} records loaded</span>
                      </div>

                      <button
                        onClick={() => handleRestoreFromLocalVault(item.id)}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                      >
                        Reclaim
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {localSnapshots.length > 0 && (
              <button 
                onClick={clearLocalVault}
                className="mt-6 text-center text-rose-400 hover:text-rose-300 font-bold text-[9px] uppercase tracking-widest cursor-pointer w-full"
              >
                Purge All Reset Fallbacks
              </button>
            )}
          </div>
        </div>
      )}



      {/* TAB 3: APP UPGRADE CENTRE */}
      {activeTab === 'build' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded border border-purple-100">Release Centre</span>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-2 flex items-center">
                <RefreshCw size={20} className="text-purple-500 mr-2" />
                Ledger Operating System Update
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Upgrade system layout, logic, and backup rules safely without database deletion.</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Current Build</span>
              <span className="text-sm font-black text-slate-800 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl block mt-0.5">{appVersion}</span>
            </div>
          </div>

          {/* Business custom name setup */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Title / Heading</label>
            <input 
              type="text" 
              value={appName}
              onChange={e => onAppNameChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
              placeholder="Store Heading (e.g., BALAJI PAWN BROKERS)"
            />
            <p className="text-[9px] text-slate-400 italic">This heading binds to local storage as app name and represents database identification.</p>
          </div>

          {/* Verification requirements sign */}
          {isBackupDoneForUpdate ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start space-x-3 text-green-900 shadow-sm">
              <CheckCircle className="text-green-600 mt-0.5 shrink-0" size={18} />
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs uppercase tracking-wide text-green-950">Safe Migration Guaranteed</h4>
                <p className="text-[10.5px] leading-relaxed text-green-800/80">
                  Automated fallback snapshot verified. System checked and ready to rewrite build patches cleanly. Zero data will be deleted during this operation.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-amber-900 shadow-sm">
              <AlertTriangle className="text-amber-600 mt-0.5 shrink-0 animate-pulse" size={18} />
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs uppercase tracking-wide text-amber-950">Safety Blockade Active</h4>
                <p className="text-[10.5px] leading-relaxed text-amber-800/80 animate-pulse">
                  Please generate a manual backup on the "Device Vault" tab before updating the app. This creates a fail-safe backup checkpoint to prevent accidental loss.
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-6 gap-4">
            <div className="text-xs">
              <span className="text-slate-400 font-bold block text-[9.5px] uppercase tracking-wider">Available Patch</span>
              <span className="font-black text-slate-800 block text-sm mt-0.5">{appVersion === 'v1.2.0' ? 'v1.3.0 Pro Version' : 'v1.3.5 Stable Update'}</span>
            </div>

            <button
              onClick={handleUpdateCheck}
              disabled={!isBackupDoneForUpdate || isUpdating}
              className={`flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isBackupDoneForUpdate && !isUpdating
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md active:scale-95 shadow-purple-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Validating & Updating...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={13} />
                  <span>Sync & Upgrade Software</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: UTILITIES & TRASH */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Excel & File Backup Controls */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center">
                  <FileText size={18} className="mr-2 text-slate-500" />
                  File Controls & Backups
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Export ledgers to files or load backups to synchronize across other devices safely if lost.</p>
              </div>

              {/* Hidden File Input for database or spreadsheet restoration */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json,.csv,application/json,text/csv" 
                className="hidden" 
              />

              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Export Excel CSV */}
                <button
                  onClick={handleExportCSV}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-800 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all text-left flex items-center space-x-3 cursor-pointer"
                >
                  <FileText size={20} className="text-emerald-600" />
                  <div>
                    <span className="block text-[11px] font-black">Export Excel CSV file</span>
                    <span className="block text-[9px] font-normal text-emerald-700/80 normal-case mt-0.5">Compatible with Microsoft Excel, Google Sheets, standard tables.</span>
                  </div>
                </button>

                {/* 2. Export JSON backup database */}
                <button
                  onClick={handleTriggerExportJSON}
                  className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-800 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all text-left flex items-center space-x-3 cursor-pointer"
                >
                  <Download size={20} className="text-blue-600" />
                  <div>
                    <span className="block text-[11px] font-black">Export Ledger Backup (.JSON)</span>
                    <span className="block text-[9px] font-normal text-blue-700/80 normal-case mt-0.5">Download entire database file with mobile browser fallbacks.</span>
                  </div>
                </button>

                {/* 3. Import JSON backup database */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-800 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all text-left flex items-center space-x-3 cursor-pointer"
                >
                  <Upload size={20} className="text-amber-600" />
                  <div>
                    <span className="block text-[11px] font-black">Import Backup File (.JSON/.CSV)</span>
                    <span className="block text-[9px] font-normal text-amber-700/80 normal-case mt-0.5">Select a JSON backup or CSV spreadsheet to instantly load and merge.</span>
                  </div>
                </button>

                {/* 4. Copy All Data Payload */}
                <button
                  onClick={handleCopyToClipboard}
                  className={`p-4 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all text-left flex items-center space-x-3 cursor-pointer border ${
                    copySuccess 
                      ? 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {copySuccess ? <Check className="text-green-600 size-5" /> : <Copy className="text-slate-600 size-5" />}
                  <div>
                    <span className="block text-[11px] font-black">{copySuccess ? 'Copied Entire Database' : 'Copy Raw Database Payload'}</span>
                    <span className="block text-[9px] font-normal text-slate-500 normal-case mt-0.5">Copies raw safety streams to clipboard.</span>
                  </div>
                </button>

                {/* 5. Quick Inject from Clipboard */}
                <button
                  onClick={handlePasteImport}
                  disabled={isPasting}
                  className="p-4 bg-slate-900 hover:bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all text-left flex items-center space-x-3 cursor-pointer disabled:opacity-50"
                >
                  <Clipboard size={20} className="text-white shrink-0" />
                  <div>
                    <span className="block text-[11px] font-black">Quick Inject from Clipboard</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case mt-0.5">Paste copied strings back to import in 1-click.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Hard Trash Bin Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center text-sm">
                      <Trash2 size={16} className="mr-1.5 text-rose-500" />
                      Active Trash Can
                    </h3>
                    <p className="text-slate-400 text-[10px] mt-0.5">Deleted records can be recovered here or completely cleared from client memory.</p>
                  </div>
                  
                  {deletedLoans.length > 0 && (
                    <button
                      onClick={handleEmptyTrash}
                      className="text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-wider border border-rose-200 bg-rose-50 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-all cursor-pointer"
                    >
                      Empty Trash
                    </button>
                  )}
                </div>

                {deletedLoans.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-slate-400 text-[11px] italic">Your trash can is completely empty.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {deletedLoans.map(loan => (
                      <div key={loan.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="truncate pr-2">
                          <span className="text-[10px] font-bold text-slate-800 block truncate">#{loan.serialNumber} - {loan.name}</span>
                          <span className="text-[9px] text-slate-400 block">{loan.date} • ₹{loan.amount}</span>
                        </div>

                        <div className="flex space-x-1 shrink-0">
                          <button
                            onClick={() => handleRestoreTrash(loan.id)}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="Restore Account"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            onClick={() => handleHardDelete(loan.id)}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="Delete Permanently"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collapsible telemetry hardware details box */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Diagnostics & Diagnostics</h4>
                <div className="space-y-1.5 text-[9px] text-slate-500">
                  <div className="flex justify-between">
                    <span>IndexedDB Occupancy:</span>
                    <span className="font-bold text-slate-700">{formattedSize} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Local Database:</span>
                    <span className="font-bold text-slate-700">IndexedDB://BalajiLedgerDB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info line */}
      <div className="text-center py-4">
        <p className="text-slate-400 text-[9px] flex items-center justify-center uppercase tracking-widest font-extrabold">
          <Info size={11} className="mr-1" />
          Version {appVersion} • {appName} Safe System Console
        </p>
      </div>

      {/* Backup Fallback Overlay Modal (Solves Iframe / Mobile download blockages) */}
      {showBackupFallback && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowBackupFallback(false)}
          />
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileJson size={22} className="animate-pulse" />
                <h2 className="text-lg font-black uppercase tracking-tight">Ledger Backup Companion</h2>
              </div>
              <button 
                onClick={() => setShowBackupFallback(false)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex items-start space-x-3">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 space-y-1">
                  <span className="font-extrabold uppercase">Mobile / Iframe Safeguard Active</span>
                  <p className="leading-relaxed">
                    If your browser did not automatically trigger a file download, do not worry! You can copy the raw backup string below or share it natively.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Raw Backup Text Payload</label>
                <textarea
                  readOnly
                  value={backupString}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full h-36 bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-[9px] leading-normal text-slate-700 focus:outline-none resize-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCopyFallbackText}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    fallbackCopied 
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-150'
                  }`}
                >
                  {fallbackCopied ? (
                    <>
                      <Check size={14} />
                      <span>Copied Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Backup String</span>
                    </>
                  )}
                </button>

                {navigator.share && (
                  <button
                    onClick={handleMobileNativeShare}
                    className="py-3 px-5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Share2 size={14} className="text-indigo-400" />
                    <span>Mobile Share</span>
                  </button>
                )}

                <button
                  onClick={() => setShowBackupFallback(false)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
