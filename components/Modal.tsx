import React, { ReactNode } from 'react';
import { X, Info, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  type?: 'info' | 'warning' | 'success' | 'confirm';
  onConfirm?: () => void;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message,
  children,
  type = 'info',
  onConfirm,
  maxWidth = 'max-w-md' 
}) => {
  if (!isOpen) return null;

  const icons = {
    info: <Info className="text-blue-500" size={24} />,
    warning: <AlertTriangle className="text-red-500" size={24} />,
    success: <CheckCircle className="text-green-500" size={24} />,
    confirm: <HelpCircle className="text-yellow-500" size={24} />
  };

  const colors = {
    info: 'bg-blue-500',
    warning: 'bg-red-500',
    success: 'bg-green-500',
    confirm: 'bg-yellow-500'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div 
        className={`bg-white rounded-3xl w-full ${maxWidth} shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200`}
      >
        <div className={`${colors[type]} p-6 text-white flex justify-between items-center`}>
          <h2 className="text-xl font-bold">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          {message && (
            <div className="flex items-start space-x-4 mb-6">
              <div className="mt-1 shrink-0">
                {icons[type]}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                {message}
              </p>
            </div>
          )}
          
          {children}

          {type === 'confirm' || type === 'warning' ? (
            <div className="flex gap-3 mt-6">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
                className={`flex-1 px-4 py-3 ${colors[type]} hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95`}
              >
                Confirm
              </button>
            </div>
          ) : (
            <button 
              onClick={onClose}
              className={`w-full mt-6 px-4 py-3 ${colors[type]} hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95`}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
