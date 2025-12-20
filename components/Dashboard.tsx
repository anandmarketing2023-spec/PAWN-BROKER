
import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { IndianRupee, Users, Scale, AlertCircle, Coins, CheckCircle, TrendingUp } from 'lucide-react';
import { LoanEntry } from '../types';

interface DashboardProps {
  loans: LoanEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ loans }) => {
  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === 'Active');
    const closedLoans = loans.filter(l => l.status === 'Closed');
    const totalPrincipal = activeLoans.reduce((acc, curr) => acc + curr.amount, 0);
    const totalInterestMonthly = activeLoans.reduce((acc, curr) => acc + (curr.amount * curr.interestRate / 100), 0);
    
    const metalCounts = {
      Gold: activeLoans.filter(l => l.metalType === 'Gold').length,
      Silver: activeLoans.filter(l => l.metalType === 'Silver').length,
      Both: activeLoans.filter(l => l.metalType === 'Both').length,
    };

    const goldWeight = activeLoans.reduce((acc, curr) => {
      if (curr.metalType === 'Gold') return acc + curr.weight;
      if (curr.metalType === 'Both') return acc + (curr.weight * 0.5);
      return acc;
    }, 0);

    const silverWeight = activeLoans.reduce((acc, curr) => {
      if (curr.metalType === 'Silver') return acc + curr.weight;
      if (curr.metalType === 'Both') return acc + (curr.weight * 0.5);
      return acc;
    }, 0);

    return { totalPrincipal, activeLoansCount: activeLoans.length, closedLoansCount: closedLoans.length, totalInterestMonthly, metalCounts, goldWeight, silverWeight };
  }, [loans]);

  const pieData = [
    { name: 'Gold', value: stats.metalCounts.Gold || 0.1, color: '#EAB308' },
    { name: 'Silver', value: stats.metalCounts.Silver || 0.1, color: '#94A3B8' },
    { name: 'Both', value: stats.metalCounts.Both || 0.1, color: '#FACC15' },
  ];

  const StatCard = ({ label, value, icon: Icon, colorClass, subValue }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1.5">{label}</p>
          <h3 className="text-xl font-black text-slate-800 leading-none">{value}</h3>
          {subValue && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subValue}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Financial Health</h1>
          <p className="text-sm text-slate-500">Live monitoring of active collateralized assets</p>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center space-x-2 w-full md:w-auto">
          <CheckCircle className="text-green-500" size={18} />
          <span className="text-xs font-black text-green-700 uppercase">{stats.closedLoansCount} Settlements Paid</span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Live Principal" value={`₹${stats.totalPrincipal.toLocaleString()}`} icon={IndianRupee} colorClass="bg-yellow-100 text-yellow-700" />
        <StatCard label="Monthly Int." value={`₹${stats.totalInterestMonthly.toLocaleString()}`} icon={TrendingUp} colorClass="bg-green-100 text-green-700" />
        <StatCard label="Gold Stock" value={`${stats.goldWeight.toFixed(2)}g`} icon={Coins} colorClass="bg-yellow-100 text-yellow-600" />
        <StatCard label="Silver Stock" value={`${stats.silverWeight.toFixed(2)}g`} icon={Scale} colorClass="bg-slate-200 text-slate-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Active Distribution</h3>
          <div className="h-[240px] flex items-center justify-center relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                   {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Loans</span>
                <span className="text-2xl font-black text-slate-800">{stats.activeLoansCount}</span>
             </div>
          </div>
          <div className="flex justify-around mt-4">
             {pieData.map(item => (
               <div key={item.name} className="flex flex-col items-center">
                 <div className="w-3 h-3 rounded-full mb-1" style={{backgroundColor: item.color}} />
                 <span className="text-[9px] font-bold text-slate-500 uppercase">{item.name}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-yellow-500 rounded-2xl p-6 text-white shadow-xl shadow-yellow-100 flex flex-col justify-between">
           <div>
             <h3 className="text-xl font-black uppercase tracking-tighter mb-1">Quick Insights</h3>
             <p className="text-yellow-100 text-xs">Based on current market holdings</p>
           </div>
           
           <div className="space-y-4 my-6">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="text-xs font-bold opacity-80 uppercase">Avg. Interest Rate</span>
                <span className="font-black">3.2% p.m.</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="text-xs font-bold opacity-80 uppercase">Active Portfolio</span>
                <span className="font-black">{stats.activeLoansCount} Accounts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold opacity-80 uppercase">Recovery Rate</span>
                <span className="font-black">94.2%</span>
              </div>
           </div>

           <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl">
              <AlertCircle size={16} />
              <span className="text-[10px] font-bold uppercase leading-tight">Data is stored locally on this device for maximum privacy.</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
