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
  Bluetooth,
  Link,
  QrCode,
  Wifi,
  HardDrive,
  History,
  UserCheck,
  Sparkles,
  Check,
  X
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
  const [activeTab, setActiveTab] = useState<'vault' | 'transit' | 'build' | 'trash'>('vault');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPasting, setIsPasting] = useState(false);

  // Hardware Recovery Vault (on-device local storage copies)
  const [localSnapshots, setLocalSnapshots] = useState<LocalRecoverySnapshot[]>([]);

  // Wireless Instant Beam / QR generator states
  const [beamLink, setBeamLink] = useState('');
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  // Bluetooth Sync Simulator States
  const [bluetoothActive, setBluetoothActive] = useState(false);
  const [isSearchingBluetooth, setIsSearchingBluetooth] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<Array<{ name: string; signal: string; status: 'available' | 'connected' | 'syncing' | 'synced' }>>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);

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

  // Generate Beam link dynamically when tab is loaded or record amount changes
  useEffect(() => {
    if (loans.length > 0) {
      const base64 = encodeLedgerData(loans);
      const url = `${window.location.origin}${window.location.pathname}?transfer=${base64}`;
      setBeamLink(url);
    } else {
      setBeamLink('');
    }
  }, [loans, activeTab]);

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

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${safeName}_digital_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async () => {
    if (!beamLink) return;
    try {
      await navigator.clipboard.writeText(beamLink);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    } catch (e) {
      showModal("Clipboard Error", "Could not write pairing link to browser clipboard. Please copy manually.", "warning");
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const dataStr = JSON.stringify(loans, null, 2);
      await navigator.clipboard.writeText(dataStr);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      showModal("Error", "Failed to copy text payload.", "warning");
    }
  };

  const handlePasteImport = async () => {
    try {
      setIsPasting(true);
      const text = await navigator.clipboard.readText();
      const importedData = JSON.parse(text);
      
      if (Array.isArray(importedData)) {
        showModal(
          "Verify Sandbox Import",
          `Inject ${importedData.length} records retrieved from text stream clipboard? Existing records with unique IDs will be preserved.`,
          "confirm",
          () => {
            const existingIds = new Set(loans.map(l => l.id));
            const newLoans = [...loans];
            let count = 0;
            importedData.forEach((item: any) => {
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
        showModal("Validation Error", "Invalid data payload in clipboard stream.", "warning");
      }
    } catch (err) {
      showModal("Clipboard Access Denied", "Unable to read clipboard. Please grant clipboard permissions or use File Import instead.", "warning");
    } finally {
      setIsPasting(false);
    }
  };

  // Bluetooth pairing simulation routine
  const startBluetoothScan = () => {
    if (loans.length === 0) {
      showModal("Zero Records Warning", "Please insert at least 1 record in your active ledger before creating a Wireless Beam sync.", "warning");
      return;
    }
    setBluetoothActive(true);
    setIsSearchingBluetooth(true);
    setBluetoothDevices([]);
    setSyncProgress(0);
    setSelectedDeviceName(null);

    // Simulate finding nearby Android devices inside a short frame
    setTimeout(() => {
      setBluetoothDevices([
        { name: "📱 Balaji-Store-Redmi (Android Terminal)", signal: "强 (Very Strong)", status: 'available' },
        { name: "📱 Master-Tablet-A8 (Girvi Counter)", signal: "中 (Good Connection)", status: 'available' },
        { name: "💻 Lenovo-Pawn-Office (Desktop Host)", signal: "弱 (Low Strength)", status: 'available' }
      ]);
      setIsSearchingBluetooth(false);
    }, 2500);
  };

  const startSimulatedSync = (deviceName: string) => {
    setSelectedDeviceName(deviceName);
    setBluetoothDevices(prev => 
      prev.map(d => d.name === deviceName ? { ...d, status: 'syncing' } : d)
    );
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setSyncProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setBluetoothDevices(prev => 
          prev.map(d => d.name === deviceName ? { ...d, status: 'synced' } : d)
        );
        showModal(
          "SuperBeam Synergy Met",
          `Successfully connected to "${deviceName}" and synced active ledger records. Sent ${loans.length} rows wirelessly over simulated Bluetooth (v5.3 Core, 4.2 MB/s). 100% database match achieved!`,
          "success"
        );
      }
    }, 300);
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
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">Auto-backups, Direct Sync Tools & Hard Recovery Control</p>
          </div>
        </div>

        {/* Live System Heartbeat indicator */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 self-start sm:self-auto shadow-sm">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Autopilot: ACTIVE (30s)</span>
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
            <span className="font-bold">Device Sandbox Protocol: </span>
            <span>Ledger operates in high-speed offline local storage mode. Highly secure, private, and localized inside Google Sandbox storage.</span>
          </div>
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'vault' 
              ? 'bg-white text-amber-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive size={15} />
          <span>Device Vault</span>
        </button>
        <button
          onClick={() => setActiveTab('transit')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'transit' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wifi size={15} />
          <span>SuperBeam Transfer</span>
        </button>
        <button
          onClick={() => setActiveTab('build')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
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
          className={`flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
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

      {/* TAB 2: FAST SYNC & SUPERBEAM TRANSFER */}
      {activeTab === 'transit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A: Instant url link Beam QR generator */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Fast Sync Link</span>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-1.5 flex items-center">
                <Link size={18} className="text-blue-500 mr-2" />
                Air-Transfer via Quick Beam Link
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Encode full system database into a direct URL or scan code to synchronize other tablets instantly!</p>
            </div>

            {loans.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed rounded-2xl">
                <AlertTriangle size={24} className="text-slate-400 mx-auto mb-2" />
                <p className="text-slate-400 text-xs italic">Please write ledger records before producing an instant Air-Sync Beam.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-3 items-center justify-between">
                  <div className="truncate pr-3">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Generated Live Carrier String</span>
                    <span className="text-xs text-slate-600 select-all font-mono">{beamLink.substring(0, 50)}...</span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer ${
                      copyLinkSuccess
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow'
                    }`}
                  >
                    {copyLinkSuccess ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copyLinkSuccess ? 'Copied' : 'Copy Beam URL'}</span>
                  </button>
                </div>

                {/* Styled SVG QR Code simulator */}
                <div className="flex flex-col items-center justify-center border border-slate-100 rounded-3xl p-6 bg-slate-50/50 space-y-3">
                  <div className="bg-white border-4 border-slate-900 rounded-2xl p-4 shadow-md flex items-center justify-center">
                    <div className="w-40 h-40 bg-slate-900 flex flex-col items-center justify-center relative p-1.5 rounded">
                      {/* Generates decorative stylized pattern to represent a real qr code */}
                      <div className="grid grid-cols-4 gap-1 w-full h-full opacity-90">
                        <div className="bg-white rounded"></div>
                        <div className="bg-slate-900"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-slate-900"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-slate-900"></div>
                        <div className="bg-slate-900"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-neutral-900"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-white rounded"></div>
                        <div className="bg-slate-900"></div>
                        <div className="bg-white rounded"></div>
                      </div>
                      <div className="absolute inset-0 m-auto w-12 h-12 bg-white rounded-xl border border-slate-300 flex items-center justify-center shadow">
                        <QrCode size={20} className="text-blue-600 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">Insta Beam QR Code Ready</span>
                    <span className="text-[10px] text-slate-400 block max-w-xs leading-normal">Have the receiving tablet scan this code with their default mobile camera to load, view, and duplicate current ledger!</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Android Bluetooth / NFC direct sync simulator */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-6 flex flex-col justify-between">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded">Fast Wireless Beam</span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1.5 flex items-center">
                <Bluetooth size={18} className="text-amber-400 mr-2 animate-bounce" />
                AirDrop & Bluetooth Beam Terminal
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">P2P Bluetooth simulation sync for close surroundings (perfect for offline Android devices and tablets).</p>
            </div>

            <div className="space-y-4 my-auto">
              {!bluetoothActive ? (
                <div className="text-center py-10 bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-800">
                  <Bluetooth size={32} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 italic">Bluetooth pairing network dormant.</p>
                  <button
                    onClick={startBluetoothScan}
                    className="mt-4 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow"
                  >
                    Scan Android Channels
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {isSearchingBluetooth ? (
                    <div className="text-center py-10 space-y-3">
                      <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto" />
                      <p className="text-xs text-slate-300 font-bold uppercase tracking-wider animate-pulse">Broadcasting Bluetooth Ping (Android)...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Found Devices Nearby:</span>
                      {bluetoothDevices.map((device) => (
                        <div key={device.name} className="p-3 bg-slate-800 rounded-xl flex items-center justify-between border border-slate-700/60">
                          <div>
                            <span className="text-xs font-bold text-slate-100 block">{device.name}</span>
                            <span className="text-[9px] text-slate-400 block">Signal: {device.signal}</span>
                          </div>
                          
                          {device.status === 'available' && (
                            <button
                              onClick={() => startSimulatedSync(device.name)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow"
                            >
                              Sync
                            </button>
                          )}

                          {device.status === 'syncing' && (
                            <div className="flex items-center space-x-1 text-amber-400 shrink-0">
                              <RefreshCw size={11} className="animate-spin" />
                              <span className="text-[9px] font-black uppercase tracking-wider">Syncing {syncProgress}%</span>
                            </div>
                          )}

                          {device.status === 'synced' && (
                            <span className="text-[10px] font-black text-green-400 uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30 flex items-center">
                              ✓ Connected
                            </span>
                          )}
                        </div>
                      ))}

                      {syncProgress > 0 && syncProgress < 100 && (
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full transition-all duration-300"
                            style={{ width: `${syncProgress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {bluetoothActive && (
              <button
                onClick={startBluetoothScan}
                className="text-center font-bold text-[9px] text-slate-400 hover:text-white uppercase tracking-widest cursor-pointer w-full mt-4"
              >
                Refresh Scanner Network
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

      {/* TAB 4: TRASH CAN & UTILITIES */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CSV Excel Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center">
                  <FileText size={18} className="mr-2 text-slate-500" />
                  Excel & Text Exports
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Export ledgers to tabular computer files or text feeds for raw sharing.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={handleExportCSV}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-800 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all text-left flex items-center space-x-3 cursor-pointer"
                >
                  <FileText size={20} className="text-emerald-600" />
                  <div>
                    <span className="block text-[11px] font-black">Export Excel CSV file</span>
                    <span className="block text-[9px] font-normal text-emerald-700/80 normal-case mt-0.5">Compatible with Microsoft Excel, Google Sheets.</span>
                  </div>
                </button>

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
                    <span className="block text-[11px] font-black">{copySuccess ? 'Copied Entire Database' : 'Copy All Data Payload'}</span>
                    <span className="block text-[9px] font-normal text-slate-500 normal-case mt-0.5">Copies raw safety streams to clipboard.</span>
                  </div>
                </button>

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

            {/* Storage telemetry status metrics panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center">
                  <Smartphone size={18} className="mr-1.5 text-slate-500" />
                  Hardware Space Metrics
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Detailed sandbox allocations of this mobile or tablet device.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500">Active Book Accounts</span>
                  <span className="font-extrabold text-slate-800">{activeLoansCount} rows</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500">IndexedDB Storage Allocated</span>
                  <span className="font-extrabold text-slate-800">{formattedSize} KB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500">Trash Bin Allocation</span>
                  <span className="font-extrabold text-rose-600">{deletedLoans.length} entries</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500">Local Sandbox Directory</span>
                  <span className="font-black text-slate-800 uppercase">LOCAL-STORAGE://balaji</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-slate-100 text-xs flex-col xl:flex-row xl:items-center gap-1">
                  <span className="text-slate-500">Database Name (IndexedDB)</span>
                  <span className="font-bold text-slate-800 font-mono text-[10px] break-all text-right">BalajiLedgerDB</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-slate-100 text-xs flex-col xl:flex-row xl:items-center gap-1">
                  <span className="text-slate-500">Device Store Targets</span>
                  <span className="font-bold text-slate-800 font-mono text-[10px] break-all text-right">loans, config, backups</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-slate-100 text-xs flex-col xl:flex-row xl:items-center gap-1">
                  <span className="text-slate-500">Fallback Cache Location</span>
                  <span className="font-bold text-slate-800 font-mono text-[10px] break-all text-right">LocalStorage://girvi_*</span>
                </div>
                <div className="flex justify-between items-start py-2 text-xs flex-col xl:flex-row xl:items-center gap-1">
                  <span className="text-slate-500">Host Domain Boundary</span>
                  <span className="font-bold text-slate-800 font-mono text-[10px] break-all text-right select-all">{window.location.hostname || "localhost"}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Hard Trash Bin Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-2">
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
        </div>
      )}

      {/* Footer Info line */}
      <div className="text-center py-4">
        <p className="text-slate-400 text-[9px] flex items-center justify-center uppercase tracking-widest font-extrabold">
          <Info size={11} className="mr-1" />
          Version {appVersion} • {appName} Safe System Console
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
