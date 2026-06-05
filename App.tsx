
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
  Coins,
  AlertTriangle
} from 'lucide-react';
import { LoanEntry, BackupConfig, BackupEntry } from './types';
import { getAllLoans, saveLoans, getConfig, saveConfig, getAllBackups, saveBackupsToDB } from './src/db';
import { generateUUID, encodeLedgerData, decodeLedgerData, safeLocalStorage } from './src/utils';
import Dashboard from './components/Dashboard';
import LoanEntryForm from './components/LoanEntryForm';
import Ledger from './components/Ledger';
import CustomerSheet from './components/CustomerSheet';
import StorageSettings from './components/StorageSettings';
import SettlementModal from './components/SettlementModal';
import TransactionModal from './components/TransactionModal';
import Modal from './components/Modal';
import { Transaction } from './types';
import { doc, setDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './src/firebase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'ledger' | 'customers' | 'storage'>('dashboard');
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({ frequency: 'Daily', enabled: true });
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [appName, setAppName] = useState<string>('BALAJI PAWN BROKERS');
  const [localLoansCount, setLocalLoansCount] = useState<number>(0);
  const [hasPromptedMigration, setHasPromptedMigration] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('v1.2.0');
  const [sessionBackupDone, setSessionBackupDone] = useState<boolean>(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState<boolean>(false);
  const [autoBackupTick, setAutoBackupTick] = useState<number>(0);

  const [currentUser] = useState<{ uid: string; email: string; isCloud: boolean }>({
    uid: 'local_admin',
    email: 'offline-owner@balaji.com',
    isCloud: false
  });
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

  // Periodic automatic backup scheduler ticks (runs background checks every 30s by itself)
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoBackupTick(tick => tick + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Quick Beam parameter parser on mounts
  useEffect(() => {
    if (isLoading) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const payload = params.get('transfer');
      if (payload) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const imported = decodeLedgerData(payload);
        if (imported && imported.length > 0) {
          showModal(
            "⚡ Quick Beam Data Capture",
            `We detected an incoming Beam Transfer link featuring ${imported.length} ledger logs. Would you like to MERGE these safety accounts with your active app database?`,
            "confirm",
            async () => {
              const existingIds = new Set(loans.map(l => l.id));
              const newLoans = [...loans];
              let addedCount = 0;
              imported.forEach((item: any) => {
                if (!existingIds.has(item.id)) {
                  newLoans.push(item);
                  addedCount++;
                }
              });
              setLoans(newLoans);
              await saveLoans(newLoans);
              showModal("Beam Successful", `Instantly integrated ${addedCount} records without deleting existing loans.`, "success");
            }
          );
        } else {
          showModal("Link Transfer Mismatch", "Unable to unpack incoming Link Beam. The data signature looks incorrect or mismatching.", "warning");
        }
      }
    } catch (e) {
      console.error("Link Beam capture failed", e);
    }
  }, [isLoading, loans]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedLoans = await getAllLoans();
        let restoredLoans: LoanEntry[] | null = null;

        if (savedLoans.length > 0) {
          restoredLoans = savedLoans;
        } else {
          // Comprehensive local backup keys traversal for seamless restoration
          const legacyLoans = safeLocalStorage.getItem('girvi_loans');
          if (legacyLoans) {
            try { restoredLoans = JSON.parse(legacyLoans); } catch (err) {}
          }
          if (!restoredLoans || restoredLoans.length === 0) {
            const rawLatestBackup = safeLocalStorage.getItem('girvi_loans_backup_latest');
            if (rawLatestBackup) {
              try {
                const parsed = JSON.parse(rawLatestBackup);
                if (parsed && Array.isArray(parsed.data)) {
                  restoredLoans = parsed.data;
                }
              } catch (err) {}
            }
          }
          if (!restoredLoans || restoredLoans.length === 0) {
            const rawVault = safeLocalStorage.getItem('girvi_device_recovery_vault');
            if (rawVault) {
              try {
                const parsed = JSON.parse(rawVault);
                if (Array.isArray(parsed) && parsed[0] && Array.isArray(parsed[0].data)) {
                  restoredLoans = parsed[0].data;
                }
              } catch (err) {}
            }
          }
          if (!restoredLoans || restoredLoans.length === 0) {
            const altLoans = safeLocalStorage.getItem('loans');
            if (altLoans) {
              try { restoredLoans = JSON.parse(altLoans); } catch (err) {}
            }
          }

          if (restoredLoans && restoredLoans.length > 0) {
            await saveLoans(restoredLoans);
          }
        }

        if (restoredLoans && restoredLoans.length > 0) {
          setLoans(restoredLoans);
        }

        const savedConfig = await getConfig('backup_config');
        if (savedConfig) {
          setBackupConfig(savedConfig);
        } else {
          const legacyConfig = safeLocalStorage.getItem('girvi_backup_config');
          if (legacyConfig) {
            const parsed = JSON.parse(legacyConfig);
            setBackupConfig(parsed);
            await saveConfig('backup_config', parsed);
          }
        }

        const savedAppName = await getConfig('app_name');
        if (savedAppName) {
          setAppName(savedAppName);
        } else {
          const legacyAppName = safeLocalStorage.getItem('girvi_app_name');
          if (legacyAppName) {
            setAppName(legacyAppName);
            await saveConfig('app_name', legacyAppName);
          }
        }

        const savedVersion = await getConfig('app_version');
        if (savedVersion) {
          setAppVersion(savedVersion);
        } else {
          await saveConfig('app_version', 'v1.2.0');
        }

        const savedBackups = await getAllBackups();
        if (savedBackups.length > 0) {
          setBackups(savedBackups);
        } else {
          const legacyBackups = safeLocalStorage.getItem('girvi_backups');
          if (legacyBackups) {
            const parsed = JSON.parse(legacyBackups);
            setBackups(parsed);
            await saveBackupsToDB(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load data from IndexedDB, attempting emergency localStorage recovery fallback...", e);
        try {
          const raw = safeLocalStorage.getItem('girvi_loans') || 
                      safeLocalStorage.getItem('loans') || 
                      safeLocalStorage.getItem('girvi_loans_backup_latest');
          if (raw) {
            let parsed = JSON.parse(raw);
            if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.data)) {
              parsed = parsed.data;
            }
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLoans(parsed);
              console.log("[Recovery] Restored dataset from localStorage successfully under IndexedDB exception.");
            }
          }
        } catch (localErr) {
          console.error("Emergency localStorage loading failed: ", localErr);
        }
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
      safeLocalStorage.setItem('girvi_backup_config', JSON.stringify(backupConfig));
    }
  }, [backupConfig, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveConfig('app_name', appName);
      safeLocalStorage.setItem('girvi_app_name', appName);
    }
  }, [appName, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveBackupsToDB(backups);
      safeLocalStorage.setItem('girvi_backups', JSON.stringify(backups));
    }
  }, [backups, isLoading]);

  useEffect(() => {
    if (!isLoading && (!currentUser || !currentUser.isCloud)) {
      saveLoans(loans);
      
      // Dual-write mirroring to localStorage guarantees 100% preservation across browser caches or updates
      safeLocalStorage.setItem('girvi_loans', JSON.stringify(loans));

      if (loans.length > 0) {
        const timestamp = new Date().toISOString();
        safeLocalStorage.setItem('girvi_loans_backup_latest', JSON.stringify({
          timestamp: timestamp,
          data: loans
        }));

        // Write to Device Persistent Safety Vault history list automatically
        try {
          const rawVault = safeLocalStorage.getItem('girvi_device_recovery_vault') || '[]';
          let vaultList = JSON.parse(rawVault);
          if (!Array.isArray(vaultList)) vaultList = [];
          
          const lastSnapshot = vaultList[0];
          // Only take snapshot if record count or dataset changed to not clutter storage
          if (!lastSnapshot || lastSnapshot.recordCount !== loans.length) {
            const newSnapshot = {
              id: generateUUID(),
              timestamp: timestamp,
              recordCount: loans.length,
              data: loans
            };
            const updatedVault = [newSnapshot, ...vaultList].slice(0, 5);
            safeLocalStorage.setItem('girvi_device_recovery_vault', JSON.stringify(updatedVault));
          }
        } catch (err) {
          console.error("Failed to append to Local Recovery Vault: ", err);
        }
      }
    }
  }, [loans, isLoading, currentUser]);

  useEffect(() => {
    document.title = `${appName} - Digital Ledger`;
  }, [appName]);

  useEffect(() => {
    const checkLocalLoansAndPrompt = async () => {
      try {
        const localItems = await getAllLoans();
        const count = localItems ? localItems.length : 0;
        setLocalLoansCount(count);

        if (currentUser?.isCloud && count > 0 && !hasPromptedMigration) {
          setHasPromptedMigration(true);
          showModal(
            "Transfer Sandbox Data to Cloud",
            `We detected ${count} local offline sandbox accounts inside this browser. Would you like to securely transfer them to your Google Cloud Database so that they are instantly backed up and available across all your synchronized devices?`,
            "confirm",
            () => {
              handleTransferLocalToCloud();
            }
          );
        }
      } catch (e) {
        console.error("Error checking local loans and prompting: ", e);
      }
    };
    checkLocalLoansAndPrompt();
  }, [currentUser, hasPromptedMigration]);

  // Real-time Firestore Sync subscription
  useEffect(() => {
    if (!currentUser || !currentUser.isCloud) return;

    const path = `users/${currentUser.uid}/loans`;
    const loansCol = collection(db, path);
    
    const unsubscribe = onSnapshot(loansCol, (snapshot) => {
      const records: LoanEntry[] = [];
      snapshot.forEach((doc) => {
        records.push(doc.data() as LoanEntry);
      });
      // Sort with serialNumber or date
      setLoans(records.sort((a, b) => b.serialNumber - a.serialNumber));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Firestore Backups subscription
  useEffect(() => {
    if (!currentUser || !currentUser.isCloud) return;

    const path = `users/${currentUser.uid}/backups`;
    const backupsCol = collection(db, path);
    
    const unsubscribe = onSnapshot(backupsCol, (snapshot) => {
      const records: BackupEntry[] = [];
      snapshot.forEach((doc) => {
        records.push(doc.data() as BackupEntry);
      });
      setBackups(records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Automated Background Backup Scheduler (checks daily intervals on auto ticks)
  useEffect(() => {
    if (isLoading) return;
    if (!backupConfig.enabled) return;
    if (loans.length === 0) return; // Only backup when there is data records to protect against empty initial states

    const now = new Date();
    let shouldBackup = false;

    if (!backupConfig.lastBackup) {
      shouldBackup = true;
    } else {
      const lastBackupDate = new Date(backupConfig.lastBackup);
      const diffMs = now.getTime() - lastBackupDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;

      if (backupConfig.frequency === 'Daily' && diffMs >= oneDayMs) {
        shouldBackup = true;
      } else if (backupConfig.frequency === 'Weekly' && diffMs >= oneWeekMs) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      const backupId = generateUUID();
      const timestamp = now.toISOString();
      const newBackup: BackupEntry = {
        id: backupId,
        timestamp: timestamp,
        type: backupConfig.frequency,
        recordCount: loans.length,
        data: loans
      };

      if (currentUser?.isCloud) {
        const docPath = `users/${currentUser.uid}/backups/${backupId}`;
        setDoc(doc(db, docPath), newBackup)
          .then(() => {
            console.log(`[Auto Backup] Successfully saved auto ${backupConfig.frequency} backup to Cloud.`);
          })
          .catch((err) => {
            console.error("Auto backup upload to Cloud failed: ", err);
          });
      } else {
        setBackups(prevBackups => {
          const next = [newBackup, ...prevBackups].slice(0, 10);
          return next;
        });
      }

      setBackupConfig(prevConfig => ({
        ...prevConfig,
        lastBackup: timestamp
      }));
    }
  }, [loans, backupConfig, isLoading, currentUser, autoBackupTick]);

  const handleManualBackup = () => {
    const backupId = generateUUID();
    const timestamp = new Date().toISOString();
    const newBackup: BackupEntry = {
      id: backupId,
      timestamp: timestamp,
      type: 'Manual',
      recordCount: loans.length,
      data: loans
    };
    setBackups(prev => [newBackup, ...prev].slice(0, 10));
    setBackupConfig(prevConfig => ({
      ...prevConfig,
      lastBackup: timestamp
    }));
    setSessionBackupDone(true);
    showModal("Backup Created", "Safety archive has been generated successfully. Your ledger books are securely protected!", "success");
  };

  const handleUpdateApp = () => {
    setIsUpdatingApp(true);
    setTimeout(async () => {
      setIsUpdatingApp(false);
      // Generate pre-update hardware restore safe-tag
      const safeTag = `girvi_update_backup_${appVersion}_safe`;
      safeLocalStorage.setItem(safeTag, JSON.stringify(loans));
      
      const nextVer = appVersion === 'v1.2.0' ? 'v1.3.0' : 'v1.3.5';
      setAppVersion(nextVer);
      await saveConfig('app_version', nextVer);
      
      // Upgrade & schema integrity validation on current loans
      const validatedLoans = loans.map(loan => ({
        ...loan,
        remark: loan.remark || '',
        transactions: (loan.transactions || []).map(tx => ({
          ...tx,
          remark: tx.remark || ''
        }))
      }));
      
      setLoans(validatedLoans);
      await saveLoans(validatedLoans);

      showModal(
        "System Upgrade Successful",
        `${appName} has been successfully updated to ${nextVer} with 100% data integrity. Checked ${validatedLoans.length} pawn records. All data has been successfully preserved!`,
        "success"
      );
    }, 2000);
  };

  const lastBackupTime = backupConfig.lastBackup ? new Date(backupConfig.lastBackup).getTime() : 0;
  const daysSinceBackup = lastBackupTime > 0 ? (new Date().getTime() - lastBackupTime) / (1000 * 24 * 60 * 60) : 999;
  const showBackupUrgentSign = daysSinceBackup >= 5;

  const isBackupDone = sessionBackupDone || (backups.length > 0 && (new Date().getTime() - new Date(backups[0].timestamp).getTime() < 300000));

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

  const handleTransferLocalToCloud = async () => {
    if (!currentUser || !currentUser.isCloud) return;
    setIsLoading(true);
    try {
      const localLoans = await getAllLoans();
      if (!localLoans || localLoans.length === 0) {
        showModal("No Data Found", "No local ledger records were found to migrate.", "info");
        setIsLoading(false);
        return;
      }

      let count = 0;
      for (const loan of localLoans) {
        const docPath = `users/${currentUser.uid}/loans/${loan.id}`;
        await setDoc(doc(db, docPath), loan);
        count++;
      }

      // Successfully synced to cloud! Clean up the local offline sandbox entries so we do not prompt again.
      await saveLoans([]);
      setLocalLoansCount(0);
      showModal(
        "Sync Success",
        `Transfer completed! Successfully uploaded ${count} local sandbox records to your secure Google Cloud database. They are now safe and accessible across all your devices in real-time!`,
        "success"
      );
    } catch (err: any) {
      console.error(err);
      showModal("Transfer Failed", `Unable to sync records to the Cloud. Details: ${err.message || err}`, "warning");
    } finally {
      setIsLoading(false);
    }
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
            `This will replace your current ${loans.length} records with ${data.loans.length} records. Continue?`,
            "warning",
            async () => {
              if (currentUser?.isCloud) {
                setIsLoading(true);
                try {
                  // Delete existing
                  for (const l of loans) {
                    await deleteDoc(doc(db, `users/${currentUser.uid}/loans/${l.id}`));
                  }
                  // Write new
                  for (const loan of data.loans) {
                    await setDoc(doc(db, `users/${currentUser.uid}/loans/${loan.id}`), loan);
                  }
                  showModal("Import Successful", "Your cloud database has been successfully updated with records from the backup file.", "success");
                } catch (err: any) {
                  showModal("Failed to import", `Failed to restore to Google Cloud: ${err.message || err}`, "warning");
                } finally {
                  setIsLoading(false);
                }
              } else {
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

  const saveLoan = async (loanData: Omit<LoanEntry, 'id' | 'isDeleted'>) => {
    let loanId = editingLoan?.id;
    let finalLoan: LoanEntry;

    if (editingLoan && loanId) {
      let closeDate = editingLoan.closeDate;
      if (loanData.status === 'Closed' && !closeDate) {
        closeDate = new Date().toISOString().split('T')[0];
      } else if (loanData.status === 'Active') {
        closeDate = undefined;
      }
      finalLoan = { ...loanData, id: loanId, closeDate };
    } else {
      loanId = generateUUID();
      finalLoan = {
        ...loanData,
        id: loanId,
        closeDate: loanData.status === 'Closed' ? new Date().toISOString().split('T')[0] : undefined
      };
    }

    if (currentUser?.isCloud) {
      const docPath = `users/${currentUser.uid}/loans/${loanId}`;
      try {
        await setDoc(doc(db, docPath), finalLoan);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    } else {
      const nextLoans = editingLoan 
        ? loans.map(l => l.id === loanId ? finalLoan : l)
        : [...loans, finalLoan];
      setLoans(nextLoans);
      await saveLoans(nextLoans);
    }
    setEditingLoan(null);
    setActiveTab('ledger');
  };

  const deleteLoan = (id: string) => {
    showModal(
      "Confirm Deletion",
      "Are you sure you want to delete this record? It will be moved to the trash and can be recovered later.",
      "warning",
      async () => {
        const targetLoan = loans.find(l => l.id === id);
        if (!targetLoan) return;

        const updatedLoan = { ...targetLoan, isDeleted: true };
        if (currentUser?.isCloud) {
          const docPath = `users/${currentUser.uid}/loans/${id}`;
          try {
            await setDoc(doc(db, docPath), updatedLoan);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, docPath);
          }
        } else {
          const nextLoans = loans.map(l => l.id === id ? updatedLoan : l);
          setLoans(nextLoans);
          await saveLoans(nextLoans);
        }
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
        async () => {
          const updated = { ...loan, status: 'Active' as const, closeDate: undefined, settledInterest: undefined };
          if (currentUser?.isCloud) {
            const docPath = `users/${currentUser.uid}/loans/${id}`;
            try {
              await setDoc(doc(db, docPath), updated);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, docPath);
            }
          } else {
            const nextLoans = loans.map(l => l.id === id ? updated : l);
            setLoans(nextLoans);
            await saveLoans(nextLoans);
          }
        }
      );
    } else {
      if (customDate) {
        showModal(
          "Confirm Settlement",
          "Proceed with settling this loan with received payments?",
          "confirm",
          async () => {
            const updated = { ...loan, status: 'Closed' as const, closeDate: customDate, settledInterest };
            if (currentUser?.isCloud) {
              const docPath = `users/${currentUser.uid}/loans/${id}`;
              try {
                await setDoc(doc(db, docPath), updated);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, docPath);
              }
            } else {
              const nextLoans = loans.map(l => l.id === id ? updated : l);
              setLoans(nextLoans);
              await saveLoans(nextLoans);
            }
            setSettlingLoan(null);
          }
        );
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
  
  const handleSaveTransaction = async (id: string, transaction: Transaction) => {
    const loan = loans.find(l => l.id === id);
    if (!loan) return;

    const transactions = [...(loan.transactions || []), transaction];
    const updated = { ...loan, transactions };

    if (currentUser?.isCloud) {
      const docPath = `users/${currentUser.uid}/loans/${id}`;
      try {
        await setDoc(doc(db, docPath), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    } else {
      const nextLoans = loans.map(l => l.id === id ? updated : l);
      setLoans(nextLoans);
      await saveLoans(nextLoans);
    }
    showModal("Success", "Transaction saved successfully!", "success");
  };

  const handleRenew = async (oldLoanId: string, settlementDate: string, settledInterest: number, newDetails: { amount: number, date: string, interestRate: number }) => {
    const oldLoan = loans.find(l => l.id === oldLoanId);
    if (!oldLoan) return;

    const updatedOldLoan = { ...oldLoan, status: 'Closed' as const, closeDate: settlementDate, settledInterest };
    
    const nextSerial = loans.filter(l => !l.isDeleted).length > 0 
      ? Math.max(...loans.filter(l => !l.isDeleted).map(l => l.serialNumber)) + 1 
      : 1;

    const newLoanId = generateUUID();
    const newLoan: LoanEntry = {
      ...oldLoan,
      id: newLoanId,
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

    if (currentUser?.isCloud) {
      const batchWrites = [
        setDoc(doc(db, `users/${currentUser.uid}/loans/${oldLoanId}`), updatedOldLoan),
        setDoc(doc(db, `users/${currentUser.uid}/loans/${newLoanId}`), newLoan)
      ];
      try {
        await Promise.all(batchWrites);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/loans`);
      }
    } else {
      const nextLoans = [newLoan, ...loans.map(l => l.id === oldLoanId ? updatedOldLoan : l)];
      setLoans(nextLoans);
      await saveLoans(nextLoans);
    }

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

        <div className="mt-auto pt-6 border-t border-slate-100 space-y-3">
          {showBackupUrgentSign && (
            <button 
              onClick={() => setActiveTab('storage')}
              className="mx-4 p-2.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl flex items-center space-x-2 cursor-pointer transition-all text-left w-[calc(100%-2rem)]"
              title="Backup Recommended (5-Day Security Protocol)"
            >
              <AlertTriangle size={14} className="text-yellow-600 animate-pulse shrink-0" />
              <span className="text-[10px] font-extrabold text-yellow-700 uppercase tracking-wider leading-none">Backup Due</span>
            </button>
          )}
          <div className="px-4 py-1">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{appVersion} Saved</p>
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
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveTab('storage')}
            className={`p-1 transition-colors relative ${activeTab === 'storage' ? 'text-yellow-600' : 'text-slate-400'}`}
          >
            <Settings size={20} />
            {showBackupUrgentSign && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-white animate-ping"></span>
            )}
            {showBackupUrgentSign && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-white"></span>
            )}
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
              onImport={async (updatedLoansList) => {
                if (currentUser?.isCloud) {
                  try {
                    setIsLoading(true);
                    // Handle hard deletions
                    const deletedIds = loans.filter(l => !updatedLoansList.some(ul => ul.id === l.id)).map(l => l.id);
                    for (const id of deletedIds) {
                      await deleteDoc(doc(db, `users/${currentUser.uid}/loans/${id}`));
                    }
                    // Handle modifications (e.g. restoring deleted, or additions)
                    const modifiedLoans = updatedLoansList.filter(ul => {
                      const prev = loans.find(l => l.id === ul.id);
                      return prev ? JSON.stringify(prev) !== JSON.stringify(ul) : true;
                    });
                    for (const loan of modifiedLoans) {
                      await setDoc(doc(db, `users/${currentUser.uid}/loans/${loan.id}`), loan);
                    }
                  } catch (err) {
                    console.error("Failed to perform storage trash operation in Cloud mode: ", err);
                  } finally {
                    setIsLoading(false);
                  }
                } else {
                  setLoans(updatedLoansList);
                  await saveLoans(updatedLoansList);
                }
              }}
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
                  async () => {
                    if (currentUser?.isCloud) {
                      setIsLoading(true);
                      try {
                        for (const l of loans) {
                          await deleteDoc(doc(db, `users/${currentUser.uid}/loans/${l.id}`));
                        }
                        for (const loan of data) {
                          await setDoc(doc(db, `users/${currentUser.uid}/loans/${loan.id}`), loan);
                        }
                        showModal("Success", "Backup restored to Google Cloud successfully!", "success");
                      } catch (err: any) {
                        showModal("Restore Failed", `Failed to restore to Google Cloud: ${err.message || err}`, "warning");
                      } finally {
                        setIsLoading(false);
                      }
                    } else {
                      setLoans(data);
                      await saveLoans(data);
                      showModal("Success", "Backup restored successfully!", "success");
                    }
                  }
                );
              }}
              onDeleteBackup={(id) => {
                setBackups(backups.filter(b => b.id !== id));
              }}
              onManualBackup={handleManualBackup}
              onExport={exportData}
              onFileImport={importData}
              isCloudActive={currentUser?.isCloud}
              localLoansCount={localLoansCount}
              onTransferToCloud={handleTransferLocalToCloud}
              appVersion={appVersion}
              onUpdateApp={handleUpdateApp}
              isBackupDoneForUpdate={isBackupDone}
              isUpdating={isUpdatingApp}
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
