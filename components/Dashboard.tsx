
import React, { useMemo, useState } from 'react';
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
  Pie,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { IndianRupee, Users, Scale, AlertCircle, Coins, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { LoanEntry } from '../types';

interface DashboardProps {
  loans: LoanEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ loans }) => {
  const [viewMode, setViewMode] = useState<'Monthly' | 'Weekly'>('Monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === 'Active');
    const closedLoans = loans.filter(l => l.status === 'Closed');
    
    const livePrincipal = activeLoans.reduce((acc, curr) => acc + curr.amount, 0);
    const settledPrincipal = closedLoans.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPrincipal = loans.reduce((acc, curr) => acc + curr.amount, 0);
    
    const liveInterestMonthly = activeLoans.reduce((acc, curr) => acc + (curr.amount * curr.interestRate / 100), 0);
    
    const calculateInterest = (amount: number, rate: number, date: string, closeDate?: string) => {
      const start = new Date(date);
      const end = closeDate ? new Date(closeDate) : new Date();
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = diffDays / 30;
      const totalMonths = Math.max(1, Math.round(months * 100) / 100); 
      return (amount * rate / 100) * totalMonths;
    };

    const settledInterestTotal = closedLoans.reduce((acc, curr) => {
      return acc + calculateInterest(curr.amount, curr.interestRate, curr.date, curr.closeDate);
    }, 0);

    const totalInterestImpact = settledInterestTotal + liveInterestMonthly;
    
    const metalCounts = {
      Gold: activeLoans.filter(l => l.metalType === 'Gold').length,
      Silver: activeLoans.filter(l => l.metalType === 'Silver').length,
      Both: activeLoans.filter(l => l.metalType === 'Both').length,
    };

    const goldWeight = activeLoans.reduce((acc, curr) => {
      if (curr.metalType === 'Gold') return acc + curr.weight;
      if (curr.metalType === 'Both') return acc + (curr.goldWeight || (curr.weight * 0.5));
      return acc;
    }, 0);

    const silverWeight = activeLoans.reduce((acc, curr) => {
      if (curr.metalType === 'Silver') return acc + curr.weight;
      if (curr.metalType === 'Both') return acc + (curr.silverWeight || (curr.weight * 0.5));
      return acc;
    }, 0);

    let chartData: any[] = [];

    if (viewMode === 'Monthly') {
      // Monthly Data Calculation (Last 6 Months)
      const monthlyDataMap = new Map<string, { label: string, inwards: number, outwards: number, interest: number, timestamp: number }>();
      
      const getMonthKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
          key: `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`,
          timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime()
        };
      };

      loans.forEach(loan => {
        const inKey = getMonthKey(loan.date);
        if (!monthlyDataMap.has(inKey.key)) {
          monthlyDataMap.set(inKey.key, { label: inKey.key, inwards: 0, outwards: 0, interest: 0, timestamp: inKey.timestamp });
        }
        monthlyDataMap.get(inKey.key)!.inwards += 1;

        if (loan.status === 'Closed' && loan.closeDate) {
          const outKey = getMonthKey(loan.closeDate);
          if (!monthlyDataMap.has(outKey.key)) {
            monthlyDataMap.set(outKey.key, { label: outKey.key, inwards: 0, outwards: 0, interest: 0, timestamp: outKey.timestamp });
          }
          monthlyDataMap.get(outKey.key)!.outwards += 1;
          monthlyDataMap.get(outKey.key)!.interest += calculateInterest(loan.amount, loan.interestRate, loan.date, loan.closeDate);
        }
      });

      chartData = Array.from(monthlyDataMap.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-6);
    } else {
      // Weekly Data Calculation for Selected Month
      const [year, month] = selectedMonth.split('-').map(Number);
      const weeklyData: any[] = [
        { label: 'Week 1', inwards: 0, outwards: 0, interest: 0 },
        { label: 'Week 2', inwards: 0, outwards: 0, interest: 0 },
        { label: 'Week 3', inwards: 0, outwards: 0, interest: 0 },
        { label: 'Week 4', inwards: 0, outwards: 0, interest: 0 },
        { label: 'Week 5+', inwards: 0, outwards: 0, interest: 0 },
      ];

      const getWeekIndex = (dateStr: string) => {
        const d = new Date(dateStr);
        if (d.getFullYear() !== year || (d.getMonth() + 1) !== month) return -1;
        const day = d.getDate();
        if (day <= 7) return 0;
        if (day <= 14) return 1;
        if (day <= 21) return 2;
        if (day <= 28) return 3;
        return 4;
      };

      loans.forEach(loan => {
        const inWeek = getWeekIndex(loan.date);
        if (inWeek !== -1) weeklyData[inWeek].inwards += 1;

        if (loan.status === 'Closed' && loan.closeDate) {
          const outWeek = getWeekIndex(loan.closeDate);
          if (outWeek !== -1) {
            weeklyData[outWeek].outwards += 1;
            weeklyData[outWeek].interest += calculateInterest(loan.amount, loan.interestRate, loan.date, loan.closeDate);
          }
        }
      });
      chartData = weeklyData;
    }

    return { 
      livePrincipal, 
      settledPrincipal, 
      totalPrincipal, 
      liveInterestMonthly, 
      settledInterestTotal, 
      totalInterestImpact,
      activeLoansCount: activeLoans.length, 
      closedLoansCount: closedLoans.length, 
      metalCounts, 
      goldWeight, 
      silverWeight, 
      chartData 
    };
  }, [loans, viewMode, selectedMonth]);

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard label="Live Principal" value={`₹${stats.livePrincipal.toLocaleString()}`} icon={IndianRupee} colorClass="bg-yellow-100 text-yellow-700" />
        <StatCard label="Settled Principal" value={`₹${stats.settledPrincipal.toLocaleString()}`} icon={CheckCircle} colorClass="bg-blue-100 text-blue-700" />
        <StatCard label="Total Principal" value={`₹${stats.totalPrincipal.toLocaleString()}`} icon={Coins} colorClass="bg-slate-100 text-slate-700" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard label="Live Monthly Int." value={`₹${stats.liveInterestMonthly.toLocaleString()}`} icon={TrendingUp} colorClass="bg-green-100 text-green-700" />
        <StatCard label="Settled Interest" value={`₹${stats.settledInterestTotal.toLocaleString()}`} icon={IndianRupee} colorClass="bg-emerald-100 text-emerald-700" />
        <StatCard label="Total Int. Impact" value={`₹${stats.totalInterestImpact.toLocaleString()}`} icon={TrendingUp} colorClass="bg-slate-100 text-slate-700" subValue="Settled + Live Monthly" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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

      {/* Monthly/Weekly Performance Chart */}
      <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} className="text-yellow-500" />
                Performance Report
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {viewMode === 'Monthly' ? 'Last 6 months overview' : `Weekly breakdown for ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button 
                onClick={() => setViewMode('Monthly')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'Monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setViewMode('Weekly')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'Weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Weekly
              </button>
            </div>

            {viewMode === 'Weekly' && (
              <input 
                type="month" 
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Inwards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Outwards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Interest</span>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Bar dataKey="inwards" name="Inwards (New)" fill="#FACC15" radius={[4, 4, 0, 0]} barSize={viewMode === 'Monthly' ? 20 : 30} />
              <Bar dataKey="outwards" name="Outwards (Paid)" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={viewMode === 'Monthly' ? 20 : 30} />
              <Bar dataKey="interest" name="Interest Received" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={viewMode === 'Monthly' ? 20 : 30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
