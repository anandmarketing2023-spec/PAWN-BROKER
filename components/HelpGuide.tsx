
import React from 'react';
import { 
  BookOpen, 
  Database, 
  Smartphone, 
  ShieldCheck, 
  Camera, 
  Download, 
  Share2, 
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';

const HelpGuide: React.FC = () => {
  const sections = [
    {
      title: "Getting Started",
      icon: <BookOpen className="text-blue-500" />,
      content: "Welcome to Balaji Ledger. This app helps you manage Gold and Silver loans with automatic interest calculation. All your data is stored locally on this phone for 100% privacy."
    },
    {
      title: "Adding Loans",
      icon: <PlusCircle className="text-green-500" />,
      content: "Tap 'New Entry' to add a loan. You can take a high-quality photo of the ornament. The app automatically assigns a serial number and calculates interest based on the date."
    },
    {
      title: "Managing Interest",
      icon: <IndianRupee className="text-yellow-500" />,
      content: "Interest is calculated monthly. You can adjust the 'Interest Date' if a customer pays interest partially or if you want to reset the calculation period."
    },
    {
      title: "Data Safety",
      icon: <ShieldCheck className="text-indigo-500" />,
      content: "Since data is local, if you lose your phone, you lose your data. ALWAYS use the 'Simple Backup' in Settings to download a backup file and save it to your Google Drive or Email."
    },
    {
      title: "Mobile App (PWA)",
      icon: <Smartphone className="text-slate-800" />,
      content: "For the best experience, use 'Add to Home Screen' in your browser menu. This installs the app on your phone, making it work offline and faster."
    }
  ];

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">User Guide</h1>
        <p className="text-slate-500">Master your digital ledger in minutes</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-slate-50 rounded-xl">
                {section.icon}
              </div>
              <h3 className="font-bold text-slate-800">{section.title}</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-yellow-500 rounded-3xl p-8 text-white shadow-xl shadow-yellow-100 mt-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-white/20 p-2 rounded-xl">
            <Info size={24} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight">Quick Tips</h3>
        </div>
        <ul className="space-y-4">
          <li className="flex items-start space-x-3">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-yellow-200" />
            <p className="text-sm font-medium">Use the <strong>Search Bar</strong> in Ledger to find customers by name, phone, or serial number.</p>
          </li>
          <li className="flex items-start space-x-3">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-yellow-200" />
            <p className="text-sm font-medium">The <strong>Transfer Key</strong> is the fastest way to copy all your data to a new phone.</p>
          </li>
          <li className="flex items-start space-x-3">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-yellow-200" />
            <p className="text-sm font-medium">Click on any <strong>Ornament Image</strong> in the ledger to see a full-screen high-quality view.</p>
          </li>
        </ul>
      </div>

      <div className="text-center py-8">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
          Balaji Pawn Brokers • Digital Ledger v1.0
        </p>
      </div>
    </div>
  );
};

// Helper components for icons
const PlusCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
);

const IndianRupee = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c5 0 5-5 0-5H6"/></svg>
);

export default HelpGuide;
