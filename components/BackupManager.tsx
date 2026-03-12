import React from 'react';
import { 
  Shield, 
  Clock, 
  Calendar, 
  RotateCcw, 
  Trash2, 
  Plus, 
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center">
          <Shield size={18} className="mr-2 text-yellow-500" />
          Auto Backup Settings
        </h3>
        <button 
          onClick={onManualBackup}
          className="flex items-center space-x-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg transition-all font-bold text-xs shadow-sm"
        >
          <Plus size={14} />
          <span>Backup Now</span>
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Auto Backup:</span>
            <button 
              onClick={() => onConfigChange({ ...config, enabled: !config.enabled })}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                config.enabled 
                ? 'bg-green-100 text-green-600' 
                : 'bg-slate-200 text-slate-500'
              }`}
            >
              {config.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="flex p-1 bg-white border border-slate-200 rounded-lg">
            {(['Daily', 'Weekly'] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => onConfigChange({ ...config, frequency: freq })}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                  config.frequency === freq 
                  ? 'bg-yellow-500 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center">
            <Clock size={10} className="mr-1" />
            Last: {config.lastBackup ? new Date(config.lastBackup).toLocaleString() : 'Never'}
          </span>
          <span>Keeps last 10 versions</span>
        </div>
      </div>

      {/* Backup History */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
          <Calendar size={14} className="mr-2" />
          Saved Versions ({backups.length})
        </h4>

        {backups.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <AlertCircle size={20} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-xs italic">No automatic backups yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {backups.map((backup) => (
              <div key={backup.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-yellow-200 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-lg ${
                    backup.type === 'Daily' ? 'bg-blue-50 text-blue-600' : 
                    backup.type === 'Weekly' ? 'bg-purple-50 text-purple-600' : 
                    'bg-yellow-50 text-yellow-600'
                  }`}>
                    {backup.type === 'Daily' ? <Clock size={14} /> : 
                     backup.type === 'Weekly' ? <Calendar size={14} /> : 
                     <Shield size={14} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {new Date(backup.timestamp).toLocaleDateString()} at {new Date(backup.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {backup.recordCount} Records • {backup.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => onRestore(backup.data)}
                    className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md transition-all text-[10px] font-bold"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>
                  <button 
                    onClick={() => onDeleteBackup(backup.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-all"
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
  );
};

export default BackupManager;
