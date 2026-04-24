import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line
} from 'recharts';
import { Briefcase, Users, TrendingUp, Zap, UserPlus } from 'lucide-react';

const OrganizationInsights = ({ departments, metrics, loading = false }) => {
  const executive = metrics?.executiveMetrics || {};
  const skillsGap = metrics?.skillsGap || [];

  // Grouped Utilization from departments
  const utilizationData = (departments || []).map(d => {
    const total = d.employees.length || 1;
    const active = d.employees.filter(e => (e.status || '').toLowerCase() === 'active').length;
    return {
      name: d.name,
      billable: Math.round((active / total) * 100),
      nonBillable: 100 - Math.round((active / total) * 100),
      total: total
    };
  });

  // Skills from real skillsGap
  const skillData = skillsGap.slice(0, 6).map(s => ({
    subject: s.skill,
    A: s.certified,
    B: s.demand,
    fullMark: Math.max(s.certified, s.demand) + 10
  }));

  // Growth data from utilization_trends
  const trendData = metrics?.executiveMetrics?.utilization_trends || [];
  const growthData = trendData.map(t => ({
    month: t.month,
    headcount: t.value || 0
  }));

  if (loading && !metrics) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-500"></div>
          <p className="text-sm font-semibold">Loading organization insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg. Utilization', value: `${executive.company_utilization || 0}%`, icon: Zap, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Bench Strength', value: executive.bench_headcount || 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Billable Roles', value: executive.billable_headcount || 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Upcoming Bench', value: executive.upcoming_bench || 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${kpi.bg}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{kpi.label}</p>
                <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
                Utilization by Department
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase tracking-tighter">Current Day</span>
              </h3>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">As of {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} • Billable vs Non-Billable</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={utilizationData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="billable" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
                <Bar dataKey="nonBillable" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Radar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 tracking-tight">Skills Concentration</h3>
            <span className="text-sm font-medium text-gray-500">Organization-Wide proficiency</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                <Radar name="Current" dataKey="A" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.5} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrganizationInsights;
