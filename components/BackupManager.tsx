import React from 'react';
import { 
  Shield, 
  Clock, 
  Calendar, 
  RotateCcw, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { BackupConfig, BackupEntry, LoanEntry } from '../types';

interface BackupManagerProps {
  config: BackupConfig;
  onConfigChange: (config: BackupConfig) => void;
  backups: BackupEntry[];
  onRestore: (data: LoanEntry[]) => void;
  onDeleteBackup: (id: string) => void;
  onManualBackup: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ 
  config, 
  onConfigChange, 
  backups, 
  onRestore, 
  onDeleteBackup,
  onManualBackup
}) => {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-500 p-2 rounded-xl text-white shadow-md">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Auto Backup</h1>
        </div>
        <button 
          onClick={onManualBackup}
          className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl transition-all font-bold text-sm shadow-lg shadow-yellow-100"
        >
          <Plus size={18} />
          <span>Backup Now</span>
        </button>
      </div>

      {/* Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Clock size={18} className="mr-2 text-slate-400" />
            Backup Schedule
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
            <button 
              onClick={() => onConfigChange({ ...config, enabled: !config.enabled })}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                config.enabled 
                ? 'bg-green-100 text-green-600' 
                : 'bg-slate-100 text-slate-400'
              }`}
            >
              {config.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Frequency</label>
            <div className="flex p-1 bg-slate-100 rounded-xl">
              {(['Daily', 'Weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => onConfigChange({ ...config, frequency: freq })}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    config.frequency === freq 
                    ? 'bg-white text-yellow-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              {config.frequency === 'Daily' 
                ? 'A backup will be created every 24 hours when you use the app.' 
                : 'A backup will be created every 7 days when you use the app.'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Last Backup</span>
              <span className="text-xs font-mono text-slate-800">
                {config.lastBackup ? new Date(config.lastBackup).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Storage Limit</span>
              <span className="text-xs font-mono text-slate-800">Last 10 Backups</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Calendar size={18} className="mr-2 text-slate-400" />
            Backup History
          </h3>
          <span className="text-xs font-bold text-slate-400">{backups.length} Saved</span>
        </div>

        {backups.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No backups found yet.</p>
            <p className="text-slate-400 text-xs mt-1">Automatic backups will appear here based on your schedule.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {backups.map((backup) => (
              <div key={backup.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    backup.type === 'Daily' ? 'bg-blue-50 text-blue-600' : 
                    backup.type === 'Weekly' ? 'bg-purple-50 text-purple-600' : 
                    'bg-yellow-50 text-yellow-600'
                  }`}>
                    {backup.type === 'Daily' ? <Clock size={18} /> : 
                     backup.type === 'Weekly' ? <Calendar size={18} /> : 
                     <Shield size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-bold text-slate-800">
                        {new Date(backup.timestamp).toLocaleDateString()}
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
                        {new Date(backup.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center">
                        <HardDrive size={10} className="mr-1" />
                        {backup.recordCount} Records
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        backup.type === 'Daily' ? 'bg-blue-100 text-blue-700' : 
                        backup.type === 'Weekly' ? 'bg-purple-100 text-purple-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {backup.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => onRestore(backup.data)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-all text-xs font-bold"
                  >
                    <RotateCcw size={14} />
                    <span>Restore</span>
                  </button>
                  <button 
                    onClick={() => onDeleteBackup(backup.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Warning */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start space-x-3">
        <AlertCircle size={20} className="text-amber-600 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-900">Storage Information</h4>
          <p className="text-xs text-amber-800/80 leading-relaxed mt-1">
            These backups are stored in your browser's local storage. If you clear your browser data or use a different device, these backups will not be available. We recommend using the <strong>Export</strong> feature in the Storage tab for long-term safety.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;
