import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
  IndianRupee, Scale, AlertCircle, Coins, CheckCircle,
  TrendingUp, Calendar, AlertTriangle
} from 'lucide-react';
import { LoanEntry } from '../types';
import { calculateInterest, formatINR } from '../utils';

interface DashboardProps {
  loans: LoanEntry[];
}

const OVERDUE_MONTHS = 12;

const Dashboard: React.FC<DashboardProps> = ({ loans }) => {
  const [viewMode, setViewMode] = useState<'Monthly' | 'Weekly'>('Monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === 'Active');
    const closedLoans = loans.filter(l => l.status === 'Closed');

    const livePrincipal = activeLoans.reduce((s, l) => s + l.amount, 0);
    const settledPrincipal = closedLoans.reduce((s, l) => s + l.amount, 0);
    const totalPrincipal = loans.reduce((s, l) => s + l.amount, 0);
    const liveInterestMonthly = activeLoans.reduce((s, l) => s + (l.amount * l.interestRate / 100), 0);

    const settledInterestTotal = closedLoans.reduce((s, l) =>
      s + (l.settledInterest !== undefined
        ? l.settledInterest
        : calculateInterest(l.amount, l.interestRate, l.date, l.closeDate)), 0);

    const totalInterestImpact = settledInterestTotal + liveInterestMonthly;

    const avgInterestRate = activeLoans.length > 0
      ? activeLoans.reduce((s, l) => s + l.interestRate, 0) / activeLoans.length
      : 0;

    const recoveryRate = loans.length > 0 ? (closedLoans.length / loans.length) * 100 : 0;

    const metalCounts = {
      Gold: activeLoans.filter(l => l.metalType === 'Gold').length,
      Silver: activeLoans.filter(l => l.metalType === 'Silver').length,
      Both: activeLoans.filter(l => l.metalType === 'Both').length,
    };

    const goldWeight = activeLoans.reduce((s, l) => {
      if (l.metalType === 'Gold') return s + l.weight;
      if (l.metalType === 'Both') return s + (l.goldWeight || l.weight * 0.5);
      return s;
    }, 0);

    const silverWeight = activeLoans.reduce((s, l) => {
      if (l.metalType === 'Silver') return s + l.weight;
      if (l.metalType === 'Both') return s + (l.silverWeight || l.weight * 0.5);
      return s;
    }, 0);

    const overdueCount = activeLoans.filter(l => {
      const diffMonths = (new Date().getFullYear() - new Date(l.date).getFullYear()) * 12
        + (new Date().getMonth() - new Date(l.date).getMonth());
      return diffMonths >= OVERDUE_MONTHS;
    }).length;

    // Chart data
    let chartData: {
      label: string; principalOut: number; principalIn: number;
      interest: number; timestamp?: number;
    }[] = [];

    if (viewMode === 'Monthly') {
      const map = new Map<string, { label: string; principalOut: number; principalIn: number; interest: number; timestamp: number }>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        map.set(label, { label, principalOut: 0, principalIn: 0, interest: 0, timestamp: d.getTime() });
      }

      const monthKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      };

      loans.forEach(loan => {
        const inKey = monthKey(loan.date);
        if (map.has(inKey)) map.get(inKey)!.principalOut += loan.amount;
        if (loan.status === 'Closed' && loan.closeDate) {
          const outKey = monthKey(loan.closeDate);
          if (map.has(outKey)) {
            map.get(outKey)!.principalIn += loan.amount;
            map.get(outKey)!.interest += loan.settledInterest !== undefined
              ? loan.settledInterest
              : calculateInterest(loan.amount, loan.interestRate, loan.date, loan.closeDate);
          }
        }
      });

      chartData = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      const weeks = [
        { label: 'Week 1', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 2', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 3', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 4', principalOut: 0, principalIn: 0, interest: 0 },
        { label: 'Week 5+', principalOut: 0, principalIn: 0, interest: 0 },
      ];

      const weekOf = (dateStr: string) => {
        const d = new Date(dateStr);
        if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return -1;
        const day = d.getDate();
        return day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : day <= 28 ? 3 : 4;
      };

      loans.forEach(loan => {
        const i = weekOf(loan.date);
        if (i >= 0) weeks[i].principalOut += loan.amount;
        if (loan.status === 'Closed' && loan.closeDate) {
          const j = weekOf(loan.closeDate);
          if (j >= 0) {
            weeks[j].principalIn += loan.amount;
            weeks[j].interest += loan.settledInterest !== undefined
              ? loan.settledInterest
              : calculateInterest(loan.amount, loan.interestRate, loan.date, loan.closeDate);
          }
        }
      });
      chartData = weeks;
    }

    return {
      livePrincipal, settledPrincipal, totalPrincipal,
      liveInterestMonthly, settledInterestTotal, totalInterestImpact,
      activeLoansCount: activeLoans.length, closedLoansCount: closedLoans.length,
      metalCounts, goldWeight, silverWeight, chartData,
      avgInterestRate, recoveryRate, overdueCount
    };
  }, [loans, viewMode, selectedMonth]);

  const pieData = useMemo(() => {
    const data = [
      { name: 'Gold', value: stats.metalCounts.Gold, color: '#EAB308' },
      { name: 'Silver', value: stats.metalCounts.Silver, color: '#94A3B8' },
      { name: 'Both', value: stats.metalCounts.Both, color: '#FACC15' },
    ].filter(d => d.value > 0);
    return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#f1f5f9' }];
  }, [stats.metalCounts]);

  const StatCard = ({ label, value, icon: Icon, colorClass, subValue }: {
    label: string; value: string; icon: React.ElementType;
    colorClass: string; subValue?: string;
  }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl shrink-0 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1.5 truncate">{label}</p>
        <h3 className="text-xl font-black text-slate-800 leading-none">{value}</h3>
        {subValue && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subValue}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded uppercase tracking-widest">Premium Ledger</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Welcome back, Admin</h1>
          <p className="text-sm text-slate-500">Live monitoring of active collateralized assets</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center space-x-2 shadow-sm">
            <CheckCircle className="text-green-500 shrink-0" size={18} />
            <span className="text-xs font-black text-green-700 uppercase">{stats.closedLoansCount} Settlements Paid</span>
          </div>
          {stats.overdueCount > 0 && (
            <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 flex items-center space-x-2 shadow-sm">
              <AlertTriangle className="text-orange-500 shrink-0" size={18} />
              <span className="text-xs font-black text-orange-700 uppercase">{stats.overdueCount} Overdue</span>
            </div>
          )}
        </div>
      </header>

      {/* Principal Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard label="Live Principal" value={`₹${formatINR(stats.livePrincipal)}`} icon={IndianRupee} colorClass="bg-yellow-100 text-yellow-700" />
        <StatCard label="Settled Principal" value={`₹${formatINR(stats.settledPrincipal)}`} icon={CheckCircle} colorClass="bg-blue-100 text-blue-700" />
        <StatCard label="Total Principal" value={`₹${formatINR(stats.totalPrincipal)}`} icon={Coins} colorClass="bg-slate-100 text-slate-700" />
      </div>

      {/* Interest Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard label="Live Monthly Int." value={`₹${formatINR(stats.liveInterestMonthly)}`} icon={TrendingUp} colorClass="bg-green-100 text-green-700" />
        <StatCard label="Settled Interest" value={`₹${formatINR(stats.settledInterestTotal)}`} icon={IndianRupee} colorClass="bg-emerald-100 text-emerald-700" />
        <StatCard label="Total Int. Impact" value={`₹${formatINR(stats.totalInterestImpact)}`} icon={TrendingUp} colorClass="bg-slate-100 text-slate-700" subValue="Settled + Live Monthly" />
      </div>

      {/* Metal Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <StatCard label="Gold Stock (Active)" value={`${stats.goldWeight.toFixed(2)}g`} icon={Coins} colorClass="bg-yellow-100 text-yellow-600" />
        <StatCard label="Silver Stock (Active)" value={`${stats.silverWeight.toFixed(2)}g`} icon={Scale} colorClass="bg-slate-200 text-slate-600" />
      </div>

      {/* Pie + Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Active Distribution</h3>
          <div className="h-[240px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-slate-400 uppercase">Loans</span>
              <span className="text-2xl font-black text-slate-800">{stats.activeLoansCount}</span>
            </div>
          </div>
          <div className="flex justify-around mt-4">
            {pieData.map(item => (
              <div key={item.name} className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: item.color }} />
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
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <span className="text-xs font-bold opacity-80 uppercase">Recovery Rate</span>
              <span className="font-black">{stats.recoveryRate.toFixed(1)}%</span>
            </div>
            {stats.overdueCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold opacity-80 uppercase">Overdue (&gt;12mo)</span>
                <span className="font-black text-orange-200">{stats.overdueCount} accounts</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl">
            <AlertCircle size={16} />
            <span className="text-[10px] font-bold uppercase leading-tight">Data is stored locally on this device for maximum privacy.</span>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} className="text-yellow-500" />
                Performance Report
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {viewMode === 'Monthly'
                  ? 'Last 6 months overview'
                  : `Weekly breakdown for ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              {(['Monthly', 'Weekly'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {viewMode === 'Weekly' && (
              <input
                type="month"
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            {[
              { color: '#FACC15', label: 'Principal Out' },
              { color: '#1e293b', label: 'Principal In' },
              { color: '#22c55e', label: 'Interest' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                formatter={(value: number) => [`₹${formatINR(value)}`, '']}
              />
              {[
                { key: 'principalOut', name: 'Principal Out (New)', fill: '#FACC15' },
                { key: 'principalIn', name: 'Principal In (Settled)', fill: '#1e293b' },
                { key: 'interest', name: 'Interest Received', fill: '#22c55e' },
              ].map(bar => (
                <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.fill}
                  radius={[4, 4, 0, 0]} barSize={viewMode === 'Monthly' ? 20 : 30} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
update Dashboard.tsx
