
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
import { IndianRupee, Users, Scale, AlertCircle, Coins, CheckCircle, TrendingUp, Calendar, Eye, EyeOff } from 'lucide-react';
import { LoanEntry } from '../types';
import { calculateInterest, getCurrentPrincipal } from '../src/utils';

interface DashboardProps {
  loans: LoanEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ loans }) => {
  const [viewMode, setViewMode] = useState<'Monthly' | 'Weekly' | 'Daily'>('Monthly');
  const [showFinancials, setShowFinancials] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === 'Active');
    const closedLoans = loans.filter(l => l.status === 'Closed');
    
    const livePrincipal = activeLoans.reduce((acc, curr) => acc + getCurrentPrincipal(curr), 0);
    const settledPrincipal = closedLoans.reduce((acc, curr) => {
      // Principal recovered for closed loans is their amount + additions - payments (should be 0 or original amount depending on tracking)
      // Actually, for closed loans, they recovered the whole current principal at time of closing.
      return acc + curr.amount; // Simplify to initial amount for now as it's the "Book Value"
    }, 0);
    const totalPrincipal = loans.reduce((acc, curr) => acc + curr.amount, 0);
    
    const liveInterestMonthly = activeLoans.reduce((acc, curr) => acc + (getCurrentPrincipal(curr) * curr.interestRate / 100), 0);
    
    // Total interest collected from all sources
    const interestCollectedTotal = loans.reduce((acc, loan) => {
      const partialInterest = (loan.transactions || [])
        .filter(t => t.type === 'Interest Payment')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const settlementInterest = loan.status === 'Closed' && loan.settledInterest !== undefined 
        ? loan.settledInterest 
        : 0; // Settled interest is usually the *remaining* interest paid at close
      
      return acc + partialInterest + settlementInterest;
    }, 0);

    const totalInterestImpact = interestCollectedTotal + liveInterestMonthly;
    
    const avgInterestRate = activeLoans.length > 0 
      ? activeLoans.reduce((acc, curr) => acc + curr.interestRate, 0) / activeLoans.length 
      : 0;

    const recoveryRate = loans.length > 0 
      ? (closedLoans.length / loans.length) * 100 
      : 0;
    
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
      const monthlyDataMap = new Map<string, { label: string, principalOut: number, principalIn: number, interest: number, timestamp: number }>();
      
      // Pre-populate last 6 months with zeros
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        monthlyDataMap.set(label, { label, principalOut: 0, principalIn: 0, interest: 0, timestamp: d.getTime() });
      }

      const getMonthKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
          key: `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`,
          timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime()
        };
      };

      loans.forEach(loan => {
        const inKey = getMonthKey(loan.date);
        if (monthlyDataMap.has(inKey.key)) {
          monthlyDataMap.get(inKey.key)!.principalOut += loan.amount;
        }

        (loan.transactions || []).forEach(tx => {
          const txKey = getMonthKey(tx.date);
          if (monthlyDataMap.has(txKey.key)) {
            const data = monthlyDataMap.get(txKey.key)!;
            if (tx.type === 'Loan Addition') data.principalOut += tx.amount;
            if (tx.type === 'Principal Payment') data.principalIn += tx.amount;
            if (tx.type === 'Interest Payment') data.interest += tx.amount;
          }
        });

        if (loan.status === 'Closed' && loan.closeDate) {
          const outKey = getMonthKey(loan.closeDate);
          if (monthlyDataMap.has(outKey.key)) {
            const data = monthlyDataMap.get(outKey.key)!;
            data.principalIn += getCurrentPrincipal(loan);
            data.interest += loan.settledInterest || 0;
          }
        }
      });

      chartData = Array.from(monthlyDataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    } else if (viewMode === 'Weekly') {
      // Weekly Data Calculation for Selected Month
      const [year, month] = selectedMonth.split('-').map(Number);
      const weeklyData: any[] = [
        { label: 'Week 1', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 2', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 3', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 4', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 5+', principalOut: 0, principalIn: 0, interest: 0 },
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
        if (inWeek !== -1) weeklyData[inWeek].principalOut += loan.amount;

        (loan.transactions || []).forEach(tx => {
          const txWeek = getWeekIndex(tx.date);
          if (txWeek !== -1) {
            if (tx.type === 'Loan Addition') weeklyData[txWeek].principalOut += tx.amount;
            if (tx.type === 'Principal Payment') weeklyData[txWeek].principalIn += tx.amount;
            if (tx.type === 'Interest Payment') weeklyData[txWeek].interest += tx.amount;
          }
        });

        if (loan.status === 'Closed' && loan.closeDate) {
          const outWeek = getWeekIndex(loan.closeDate);
          if (outWeek !== -1) {
            weeklyData[outWeek].principalIn += getCurrentPrincipal(loan);
            weeklyData[outWeek].interest += loan.settledInterest || 0;
          }
        }
      });
      chartData = weeklyData;
    } else {
      // Daily Data Calculation for Selected Month
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyData: any[] = [];
      
      for (let i = 1; i <= daysInMonth; i++) {
        dailyData.push({ label: i.toString(), principalOut: 0, principalIn: 0, interest: 0, fullDate: `${i} ${new Date(year, month - 1).toLocaleString('default', { month: 'short' })}` });
      }

      const getDayIndex = (dateStr: string) => {
        const d = new Date(dateStr);
        if (d.getFullYear() !== year || (d.getMonth() + 1) !== month) return -1;
        return d.getDate() - 1;
      };

      loans.forEach(loan => {
        const inDay = getDayIndex(loan.date);
        if (inDay !== -1) dailyData[inDay].principalOut += loan.amount;

        (loan.transactions || []).forEach(tx => {
          const txDay = getDayIndex(tx.date);
          if (txDay !== -1) {
            if (tx.type === 'Loan Addition') dailyData[txDay].principalOut += tx.amount;
            if (tx.type === 'Principal Payment') dailyData[txDay].principalIn += tx.amount;
            if (tx.type === 'Interest Payment') dailyData[txDay].interest += tx.amount;
          }
        });

        if (loan.status === 'Closed' && loan.closeDate) {
          const outDay = getDayIndex(loan.closeDate);
          if (outDay !== -1) {
            dailyData[outDay].principalIn += getCurrentPrincipal(loan);
            dailyData[outDay].interest += loan.settledInterest || 0;
          }
        }
      });
      chartData = dailyData;
    }

    return { 
      livePrincipal, 
      settledPrincipal, 
      totalPrincipal, 
      liveInterestMonthly, 
      interestCollectedTotal, 
      totalInterestImpact,
      activeLoansCount: activeLoans.length, 
      closedLoansCount: closedLoans.length, 
      metalCounts, 
      goldWeight, 
      silverWeight, 
      chartData,
      avgInterestRate,
      recoveryRate
    };
  }, [loans, viewMode, selectedMonth]);

  const pieData = useMemo(() => {
    const data = [
      { name: 'Gold', value: stats.metalCounts.Gold, color: '#EAB308' },
      { name: 'Silver', value: stats.metalCounts.Silver, color: '#94A3B8' },
      { name: 'Both', value: stats.metalCounts.Both, color: '#FACC15' },
    ];
    // Only show slices with actual values, or a placeholder if all are zero
    const filtered = data.filter(d => d.value > 0);
    return filtered.length > 0 ? filtered : [{ name: 'No Data', value: 1, color: '#f1f5f9' }];
  }, [stats.metalCounts]);

  const StatCard = ({ label, value, icon: Icon, colorClass, subValue, isSecret }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1.5">{label}</p>
          <h3 className={`text-xl font-black text-slate-800 leading-none ${isSecret && !showFinancials ? 'blur-md select-none' : ''}`}>
            {isSecret && !showFinancials ? '₹00,00,000' : value}
          </h3>
          {subValue && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subValue}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded uppercase tracking-widest">Premium Ledger</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Welcome back, Admin</h1>
          <p className="text-sm text-slate-500">Live monitoring of active collateralized assets</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setShowFinancials(!showFinancials)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
            title={showFinancials ? "Hide Totals" : "Show Totals"}
          >
            {showFinancials ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center space-x-2 flex-1 md:flex-none shadow-sm">
            <CheckCircle className="text-green-500" size={18} />
            <span className="text-xs font-black text-green-700 uppercase">{stats.closedLoansCount} Settlements Paid</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard label="Live Principal" value={`₹${stats.livePrincipal.toLocaleString()}`} icon={IndianRupee} colorClass="bg-yellow-100 text-yellow-700" isSecret />
        <StatCard label="Settled Principal" value={`₹${stats.settledPrincipal.toLocaleString()}`} icon={CheckCircle} colorClass="bg-blue-100 text-blue-700" isSecret />
        <StatCard label="Total Principal" value={`₹${stats.totalPrincipal.toLocaleString()}`} icon={Coins} colorClass="bg-slate-100 text-slate-700" isSecret />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard label="Live Monthly Int." value={`₹${stats.liveInterestMonthly.toLocaleString()}`} icon={TrendingUp} colorClass="bg-green-100 text-green-700" isSecret />
        <StatCard label="Int. Collected" value={`₹${stats.interestCollectedTotal.toLocaleString()}`} icon={IndianRupee} colorClass="bg-emerald-100 text-emerald-700" isSecret />
        <StatCard label="Total Int. Impact" value={`₹${stats.totalInterestImpact.toLocaleString()}`} icon={TrendingUp} colorClass="bg-slate-100 text-slate-700" subValue="Settled + Live Monthly" isSecret />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <StatCard label="Gold Stock" value={`${stats.goldWeight.toFixed(2)}g`} icon={Coins} colorClass="bg-yellow-100 text-yellow-600" isSecret />
        <StatCard label="Silver Stock" value={`${stats.silverWeight.toFixed(2)}g`} icon={Scale} colorClass="bg-slate-200 text-slate-600" isSecret />
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
                <span className="font-black">{stats.avgInterestRate.toFixed(1)}% p.m.</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="text-xs font-bold opacity-80 uppercase">Active Portfolio</span>
                <span className="font-black">{stats.activeLoansCount} Accounts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold opacity-80 uppercase">Recovery Rate</span>
                <span className={`font-black ${!showFinancials ? 'blur-sm select-none' : ''}`}>
                  {!showFinancials ? '00.0%' : `${stats.recoveryRate.toFixed(1)}%`}
                </span>
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
                {viewMode === 'Monthly' ? 'Last 6 months overview' : `Breakdown for ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 flex-wrap">
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
              <button 
                onClick={() => setViewMode('Daily')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'Daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Daily
              </button>
            </div>

            {(viewMode === 'Weekly' || viewMode === 'Daily') && (
              <input 
                type="month" 
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Principal Out</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Principal In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Interest</span>
            </div>
          </div>
        </div>

        <div className={`h-[300px] w-full transition-all duration-500 ${!showFinancials ? 'blur-xl grayscale select-none pointer-events-none' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: viewMode === 'Daily' ? 8 : 10, fontWeight: 600 }}
                dy={10}
                interval={viewMode === 'Daily' ? 1 : 0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(value) => value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                labelFormatter={(label, payload) => {
                  if (viewMode === 'Daily' && payload[0]) return payload[0].payload.fullDate;
                  return label;
                }}
                formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
              />
              <Bar dataKey="principalOut" name="Principal Out (New)" fill="#FACC15" radius={[4, 4, 0, 0]} barSize={viewMode === 'Monthly' ? 20 : (viewMode === 'Weekly' ? 30 : 8)} />
              <Bar dataKey="principalIn" name="Principal In (Settled)" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={viewMode === 'Monthly' ? 20 : (viewMode === 'Weekly' ? 30 : 8)} />
              <Bar dataKey="interest" name="Interest Received" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={viewMode === 'Monthly' ? 20 : (viewMode === 'Weekly' ? 30 : 8)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
