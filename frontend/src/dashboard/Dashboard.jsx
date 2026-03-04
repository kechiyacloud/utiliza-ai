import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Users as UsersIcon, DollarSign, Activity, AlertCircle,
  ArrowRight, Download, BarChart2, PieChart as PieChartIcon,
  Briefcase, AlertTriangle, CheckCircle2, ShieldAlert, Plus, UserPlus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';

import { fetchDashboardData } from '../api/dashboardApi';
import ExecutiveDashboardCards from './landing-dashboard/ExecutiveDashboardCards';
import ResourceForecastChart from './landing-dashboard/ResourceForecastChart';
import HighAllocationProjects from './landing-dashboard/HighAllocationProjects';
import TopPerformers from './landing-dashboard/TopPerformers';
import ResourceAvailability from './landing-dashboard/ResourceAvailability';
import AddProjectPanel from './projects/AddProjectPanel';
import AddClientModal from './clients/AddClientModal';
import EmployeeMonthCard from './landing-dashboard/EmployeeMonthCard';


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-xl text-sm z-50">
        <p className="text-gray-800 font-bold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-600">{entry.name}:</span>
            <span className="text-gray-900 font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interaction States
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchDashboardData();
        setData(res.data);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    // Restore scroll position when loading is complete
    if (!loading) {
      setTimeout(() => {
        let elId = null;
        if (sessionStorage.getItem('returnToTopPerformers') === 'true') {
          elId = 'dashboard-top-performers';
          sessionStorage.removeItem('returnToTopPerformers');
        } else if (sessionStorage.getItem('returnToDashboardCards') === 'true') {
          elId = 'dashboard-cards';
          sessionStorage.removeItem('returnToDashboardCards');
        } else if (sessionStorage.getItem('returnToHighAllocation') === 'true') {
          elId = 'dashboard-high-allocation';
          sessionStorage.removeItem('returnToHighAllocation');
        } else if (sessionStorage.getItem('returnToResourceAvailability') === 'true') {
          elId = 'dashboard-resource-availability';
          sessionStorage.removeItem('returnToResourceAvailability');
        }

        if (elId) {
          const el = document.getElementById(elId);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        }
      }, 100);
    }
  }, [loading]);

  const handleAddProject = (project) => {
    console.log("New project from Dashboard:", project);
    // Logic to add project
  };

  const handleAddClient = (client) => {
    console.log("New client from Dashboard:", client);
    // Logic to add client
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium tracking-wide">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Map Backend Executive Metrics to UI Arrays
  const _metrics = data?.executiveMetrics || {};

  const dynamicKpiData = [
    { title: "Company Utilization", value: `${_metrics.company_utilization || 0}%`, subtext: "Target 85%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
    { title: "Billable Headcount", value: _metrics.billable_headcount || 0, subtext: `out of ${_metrics.total_employees || 0} total`, icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
    { title: "Bench Headcount", value: _metrics.bench_headcount || 0, subtext: "employees currently idle", icon: DollarSign, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
    { title: "Upcoming Bench (30d)", value: _metrics.upcoming_bench || 0, subtext: "Rolling off soon", icon: Activity, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" }
  ];

  const dynamicDemandCapacityData = Array.isArray(_metrics.forecast) && _metrics.forecast.length > 0 ? _metrics.forecast : [];

  const dynamicAllocationData = [
    { name: 'Billable', value: _metrics.billable_headcount || 0, color: '#3b82f6' },
    { name: 'Internal', value: _metrics.internal_headcount || 0, color: '#10b981' },
    { name: 'Bench', value: _metrics.bench_headcount || 0, color: '#f59e0b' },
    { name: 'Notice Period', value: _metrics.notice_period || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const totalAllocationCount = dynamicAllocationData.reduce((sum, item) => sum + item.value, 0);

  const dynamicBenchSkillsData = Array.isArray(_metrics.bench_skills) && _metrics.bench_skills.length > 0 ? _metrics.bench_skills : [];
  const dynamicAlerts = Array.isArray(_metrics.alerts) && _metrics.alerts.length > 0 ? _metrics.alerts : [];
  const dynamicProjectsAtRisk = Array.isArray(_metrics.projects_at_risk) && _metrics.projects_at_risk.length > 0 ? _metrics.projects_at_risk : [];

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 text-slate-800 transition-colors duration-300">
      <div className="p-6 lg:p-8">

        {/* Header with Actions */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1.5 text-sm font-medium text-slate-500">
              Strategic overview of workforce utilization, financials, and project health.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsProjectPanelOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={18} />
              Add Project
            </button>
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <UserPlus size={18} className="text-slate-500" />
              Add Client
            </button>
          </div>
        </div>

        {/* --- EXECUTIVE SECTION --- */}
        <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Executive KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 mt-4">
            {dynamicKpiData.map((kpi, idx) => (
              <div key={idx} className={`bg-white border text-slate-800 ${kpi.border} p-5 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-sm`}>
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${kpi.bg}`}></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                    <kpi.icon size={22} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-slate-500 text-sm font-semibold tracking-wide uppercase mb-1">{kpi.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">{kpi.value}</span>
                  </div>
                  <p className={`text-xs mt-2 font-medium text-slate-500`}>
                    {kpi.subtext}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Executive Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Demand vs Capacity (Span 2) */}
            <div className="lg:col-span-2 bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BarChart2 size={18} className="text-blue-500" />
                    Demand vs. Capacity Forecast
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Projected required headcount vs available staff over 6 months.</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dynamicDemandCapacityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCapacity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                    <Area type="monotone" dataKey="capacity" name="Available Capacity" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCapacity)" />
                    <Area type="monotone" dataKey="demand" name="Projected Demand" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDemand)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actionable Alerts (Span 1) */}
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col max-h-[420px]">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                <AlertCircle size={18} className="text-rose-500" />
                Actionable Intelligence
              </h2>
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {dynamicAlerts.map((alert) => (
                  <div key={alert.id} className="bg-slate-50 border border-gray-100 p-4 rounded-xl relative group">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {alert.type === 'critical' ? <ShieldAlert size={16} className="text-rose-500" /> :
                          alert.type === 'warning' ? <AlertTriangle size={16} className="text-amber-500" /> :
                            <AlertCircle size={16} className="text-blue-500" />}
                      </div>
                      <div>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{alert.message}</p>
                        <p className="text-[10px] text-slate-500 mt-2 font-semibold uppercase tracking-wider">{alert.time}</p>
                      </div>
                    </div>
                    <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl opacity-50 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: alert.type === 'critical' ? '#f43f5e' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6' }}>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Executive Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Allocation Distribution */}
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                <PieChartIcon size={18} className="text-indigo-500" />
                Workforce Allocation
              </h2>
              <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dynamicAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {dynamicAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800">{totalAllocationCount}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Total</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {dynamicAllocationData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                    {item.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Skills on Bench */}
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UsersIcon size={18} className="text-emerald-500" />
                  Top Skills on Bench
                </h2>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicBenchSkillsData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9', opacity: 0.8 }} content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Employees" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16}>
                      {
                        dynamicBenchSkillsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#34d399'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Projects at Risk */}
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
                <Briefcase size={18} className="text-amber-500" />
                Delivery Risk Board
              </h2>
              <div className="space-y-4 flex-1">
                {dynamicProjectsAtRisk.map((project, idx) => (
                  <div key={idx} className="bg-slate-50 border border-gray-100 p-3.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-slate-800 text-sm font-bold truncate group-hover:text-blue-600 transition-colors">{project.name}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">{project.client}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${project.risk === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                        {project.risk} Risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 text-left truncate">{project.reason}</p>

                    {/* Tiny Health Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.health}%`, backgroundColor: project.health < 50 ? '#ef4444' : '#f59e0b' }}>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center justify-center gap-1 transition-colors">
                View All Delivery Risks <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* --- OPERATIONAL SECTION --- */}
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800">

          {/* Top Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 w-full" id="dashboard-cards">
            <ExecutiveDashboardCards data={data?.executiveCards} />
            <EmployeeMonthCard />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 w-full mt-2">
            <div className="w-full lg:w-2/3 min-w-0">
              <ResourceForecastChart data={data?.resourceForecast} />
            </div>
            <div className="w-full lg:w-1/3" id="dashboard-high-allocation">
              <HighAllocationProjects projects={data?.highAllocationProjects} />
            </div>
          </div>

          {/* Top Performers Row */}
          <div className="w-full" id="dashboard-top-performers">
            <TopPerformers employees={data?.topPerformers} />
          </div>

          {/* Availability Row */}
          <div className="w-full" id="dashboard-resource-availability">
            <ResourceAvailability availability={data?.resourceAvailability} />
          </div>
        </div>

      </div>

      {/* Interaction Components */}
      <AddProjectPanel
        isOpen={isProjectPanelOpen}
        onClose={() => setIsProjectPanelOpen(false)}
        onAdd={handleAddProject}
      />

      <AddClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onAdd={handleAddClient}
      />
    </div>
  );
}

export default Dashboard;