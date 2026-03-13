
import React, { useState, useEffect, useRef } from 'react';
import { Save, User, MapPin, Phone, Scale, Info, MessageSquare, X, CheckCircle2, Calendar, Percent, Image as ImageIcon, Trash2 } from 'lucide-react';
import { LoanEntry, MetalType } from '../types';
import Modal from './Modal';

interface LoanEntryFormProps {
  onSave: (loan: Omit<LoanEntry, 'id' | 'status'> & { status: 'Active' | 'Closed' }) => void;
  nextSerial: number;
  editingLoan: LoanEntry | null;
  onCancel?: () => void;
}

const LoanEntryForm: React.FC<LoanEntryFormProps> = ({ onSave, nextSerial, editingLoan, onCancel }) => {
  const [formData, setFormData] = useState({
    serialNumber: String(nextSerial),
    date: new Date().toISOString().split('T')[0],
    name: '',
    guardian: '',
    address: '',
    contactNumber: '',
    metalType: 'Gold' as MetalType,
    description: '',
    weight: '' as string | number,
    netWeight: '' as string | number,
    goldWeight: '' as string | number,
    goldNetWeight: '' as string | number,
    silverWeight: '' as string | number,
    silverNetWeight: '' as string | number,
    remark: '',
    amount: '' as string | number,
    interestRate: '' as string | number,
    status: 'Active' as 'Active' | 'Closed',
    imageUrl: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        
        // Create an image to get dimensions and compress
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.6 quality to keep it small for localStorage
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          
          // Final check on size (should be well under 2MB now)
          if (compressedBase64.length > 1.5 * 1024 * 1024) {
            showModal("Image Too Large", "The selected image is too large even after compression. Please try a different photo.", "warning");
            setIsProcessingImage(false);
            return;
          }
          
          setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
          setIsProcessingImage(false);
        };
        img.onerror = () => {
          showModal("Error", "Failed to process image. Please try again.", "warning");
          setIsProcessingImage(false);
        };
      };
      reader.onerror = () => {
        showModal("Error", "Failed to read file. Please try again.", "warning");
        setIsProcessingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, imageUrl: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (editingLoan) {
      setFormData({
        serialNumber: String(editingLoan.serialNumber),
        date: editingLoan.date,
        name: editingLoan.name,
        guardian: editingLoan.guardian,
        address: editingLoan.address,
        contactNumber: editingLoan.contactNumber,
        metalType: editingLoan.metalType,
        description: editingLoan.description,
        weight: editingLoan.weight,
        netWeight: editingLoan.netWeight,
        goldWeight: editingLoan.goldWeight || '',
        goldNetWeight: editingLoan.goldNetWeight || '',
        silverWeight: editingLoan.silverWeight || '',
        silverNetWeight: editingLoan.silverNetWeight || '',
        remark: editingLoan.remark,
        amount: editingLoan.amount,
        interestRate: editingLoan.interestRate,
        status: editingLoan.status,
        imageUrl: editingLoan.imageUrl || ''
      });
    } else {
      setFormData(prev => ({ 
        ...prev, 
        serialNumber: String(nextSerial),
        date: new Date().toISOString().split('T')[0],
        interestRate: 3 
      }));
    }
  }, [editingLoan, nextSerial]);

  const handleMetalChange = (metal: MetalType) => {
    let rate = 3;
    if (metal === 'Silver') rate = 4;
    if (metal === 'Both') rate = 3.5;
    setFormData({ ...formData, metalType: metal, interestRate: rate });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      serialNumber: Number(formData.serialNumber),
      weight: Number(formData.weight),
      netWeight: Number(formData.netWeight),
      goldWeight: formData.metalType === 'Both' ? Number(formData.goldWeight) : undefined,
      goldNetWeight: formData.metalType === 'Both' ? Number(formData.goldNetWeight) : undefined,
      silverWeight: formData.metalType === 'Both' ? Number(formData.silverWeight) : undefined,
      silverNetWeight: formData.metalType === 'Both' ? Number(formData.silverNetWeight) : undefined,
      amount: Number(formData.amount),
      interestRate: Number(formData.interestRate),
      status: formData.status,
      imageUrl: formData.imageUrl || undefined
    });
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all outline-none text-base";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <header className="mb-6 flex justify-between items-center px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{editingLoan ? 'Edit Ledger' : 'New Girvi Entry'}</h1>
          <p className="text-xs text-slate-500 font-medium">Step-by-step documentation</p>
        </div>
        {editingLoan && (
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-800 transition-colors bg-white rounded-xl border border-slate-200 shadow-sm">
            <X size={20} />
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>S.No (Serial)</label>
              <input type="number" className={`${inputClass} font-mono font-bold`} value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} required />
            </div>
            <div>
              <label className={labelClass}>Booking Date</label>
              <input type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div>
              <label className={labelClass}>Payment Status</label>
              <select 
                className={`${inputClass} font-bold ${formData.status === 'Active' ? 'text-blue-600' : 'text-red-600'}`}
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Active">UNPAID (Active)</option>
                <option value="Closed">PAID (Closed)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Customer Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" className={inputClass} placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input type="text" className={inputClass} placeholder="Father/Guardian Name" value={formData.guardian} onChange={e => setFormData({...formData, guardian: e.target.value})} required />
              <input type="tel" className={inputClass} placeholder="Mobile Number" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} required />
              <input type="text" className={inputClass} placeholder="Complete Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
            </div>
          </div>

          <div className="space-y-4 pt-4">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Asset & Collateral</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select className={inputClass} value={formData.metalType} onChange={e => handleMetalChange(e.target.value as any)}>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Both">Both</option>
                </select>
                <div className="md:col-span-2">
                  <input type="text" className={inputClass} placeholder="e.g. 2 Gold Bangles" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.metalType !== 'Both' ? (
                  <>
                    <div>
                      <label className={labelClass}>Gross (g)</label>
                      <input type="number" step="0.001" className={inputClass} value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} required />
                    </div>
                    <div>
                      <label className={labelClass}>Net (g)</label>
                      <input type="number" step="0.001" className={inputClass} value={formData.netWeight} onChange={e => setFormData({...formData, netWeight: e.target.value})} required />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gold Details</span>
                    </div>
                    <div>
                      <label className={labelClass}>Gold Gross (g)</label>
                      <input type="number" step="0.001" className={inputClass} value={formData.goldWeight} onChange={e => setFormData({...formData, goldWeight: e.target.value})} required />
                    </div>
                    <div>
                      <label className={labelClass}>Gold Net (g)</label>
                      <input type="number" step="0.001" className={inputClass} value={formData.goldNetWeight} onChange={e => setFormData({...formData, goldNetWeight: e.target.value})} required />
                    </div>
                    <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-1 mt-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Silver Details</span>
                    </div>
                    <div>
                      <label className={labelClass}>Silver Gross (g)</label>
                      <input type="number" step="0.001" className={inputClass} value={formData.silverWeight} onChange={e => setFormData({...formData, silverWeight: e.target.value})} required />
                    </div>
                    <div>
                      <label className={labelClass}>Silver Net (g)</label>
                      <input type="number" step="0.001" className={inputClass} value={formData.silverNetWeight} onChange={e => setFormData({...formData, silverNetWeight: e.target.value})} required />
                    </div>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Principal</label>
                  <input type="number" className={`${inputClass} font-bold text-lg`} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                </div>
                <div>
                  <label className={labelClass}>Interest %</label>
                  <input type="number" step="0.01" className={`${inputClass} font-bold text-yellow-700 bg-yellow-50`} value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})} required />
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-4">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-yellow-500 pl-3">Ornament Photo</h3>
             <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-48 h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative group">
                   {isProcessingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processing...</p>
                      </div>
                   ) : formData.imageUrl ? (
                      <>
                        <img src={formData.imageUrl} alt="Ornament" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                   ) : (
                      <div className="text-center p-4">
                         <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Photo Added</p>
                      </div>
                   )}
                </div>
                
                 <div className="flex-1 space-y-3 w-full">
                   <p className="text-xs text-slate-500 leading-relaxed">
                      Capture a clear photo of the ornament for visual verification and record keeping. 
                      Supports direct camera capture or gallery upload.
                   </p>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        type="button"
                        disabled={isProcessingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-yellow-600 transition-all shadow-md active:scale-95 ${isProcessingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ImageIcon size={16} />
                        {isProcessingImage ? 'Processing...' : 'Capture or Upload'}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        capture="environment"
                        className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                      />
                   </div>
                   <p className="text-[10px] text-slate-400 italic">Max size: 2MB. Recommended for mobile devices.</p>
                </div>
             </div>
          </div>

          {editingLoan && formData.status === 'Closed' && (
            <div className="bg-red-600 rounded-2xl p-4 md:p-6 text-white flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <CheckCircle2 size={24} />
                 <span className="font-bold text-sm md:text-base">Fully Settled Account</span>
               </div>
               <div className="text-right">
                 <p className="text-[9px] uppercase font-bold opacity-80">Closed On</p>
                 <p className="font-black text-sm md:text-lg">{new Date(editingLoan.closeDate || new Date()).toLocaleDateString()}</p>
               </div>
            </div>
          )}

          <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl shadow-xl shadow-yellow-100 transition-all flex items-center justify-center space-x-2">
            <Save size={22} />
            <span className="uppercase tracking-widest text-sm">{editingLoan ? 'Update Record' : 'Save to Ledger'}</span>
          </button>
        </div>
      </form>

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

export default LoanEntryForm;
