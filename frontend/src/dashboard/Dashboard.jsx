import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users as UsersIcon, Briefcase, Activity,
  AlertCircle, ChevronRight, BarChart2, DollarSign,
  PieChart as PieChartIcon, ShieldAlert, AlertTriangle, ArrowRight, UserPlus, Plus, Trophy,
  CheckCircle2, Trash2, Download, Send
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';

import { fetchDashboardData, fetchTodos, addTodo, toggleTodo, clearTodo, exportRiskBoard } from '../api/dashboardApi';
import { createClient } from '../api/clientApi';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ExecutiveDashboardCards from './landing-dashboard/ExecutiveDashboardCards';
import ResourceForecastChart from './landing-dashboard/ResourceForecastChart';
import HighAllocationProjects from './landing-dashboard/HighAllocationProjects';
import TopPerformers from './landing-dashboard/TopPerformers';
import AddProjectPanel from './projects/AddProjectPanel';
import AddClientModal from './clients/AddClientModal';
import EmployeeMonthCard from './landing-dashboard/EmployeeMonthCard';
import DashboardTables from './landing-dashboard/DashboardTables';


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
  const [forcedTab, setForcedTab] = useState(null);
  const navigate = useNavigate();

  // Interaction States
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Actionable Todo States
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  const [isDeletingTodo, setIsDeletingTodo] = useState(false);

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
    const loadTodos = async () => {
      try {
        const data = await fetchTodos();
        setTodos(data);
      } catch (e) {
        console.error('Failed to load todos', e);
      }
    };
    loadTodos();
  }, []);

  const handleToggleTodo = async (id) => {
    try {
      const updated = await toggleTodo(id);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status: updated.status } : t));
    } catch (e) { console.error(e); }
  };

  const promptDeleteTodo = (todo) => {
    setTodoToDelete(todo);
  };

  const confirmDeleteTodo = async () => {
    if (!todoToDelete) return;
    setIsDeletingTodo(true);
    try {
      await clearTodo(todoToDelete.id);
      setTodos(prev => prev.filter(t => t.id !== todoToDelete.id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete task.");
    } finally {
      setIsDeletingTodo(false);
      setTodoToDelete(null);
    }
  };

  const handleAddTodo = async () => {
    const msg = newTodoText.trim();
    if (!msg) return;
    setTodoLoading(true);
    try {
      const created = await addTodo(msg, 'info');
      setTodos(prev => [created, ...prev]);
      setNewTodoText('');
    } catch (e) { console.error(e); }
    finally { setTodoLoading(false); }
  };

  const handleExportRisk = async () => {
    try {
      const blob = await exportRiskBoard();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'delivery_risk_board.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('Export failed', e); }
  };

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

  const handleAddProject = async (projectData) => {
    try {
      setIsProjectPanelOpen(false);
      const res = await fetchDashboardData();
      setData(res.data);
    } catch (e) {
      console.error("Failed to add project", e);
      alert(projectData?.detail || "Failed to refresh dashboard after creating the project.");
    }
  };

  const handleAddClient = async (clientData) => {
    try {
      await createClient(clientData);
      setIsClientModalOpen(false);
      const res = await fetchDashboardData();
      setData(res.data);
    } catch (e) {
      console.error("Failed to add client", e);
      alert("Failed to create client");
    }
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
    { title: "Company Utilization", value: `${_metrics.company_utilization || 0}%`, subtext: "Target 85%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100", route: "/info/allocation", state: { showUtilizationOnly: true, showBack: true } },
    { title: "Billable Headcount", value: _metrics.billable_headcount || 0, subtext: `out of ${_metrics.total_employees || 0} total`, icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100", route: "/info/employees/list", state: { cardFilter: 'billable', showBack: true } },
    { title: "Bench Headcount", value: _metrics.bench_headcount || 0, subtext: "employees currently idle", icon: DollarSign, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", route: "/info/employees/list", state: { cardFilter: 'bench', showBack: true } },
    { title: "Upcoming Bench (30d)", value: _metrics.upcoming_bench || 0, subtext: "Rolling off soon", icon: Activity, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100", route: "/info/allocation", state: { showForecastOnly: true, showBack: true } }
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
      <ConfirmDeleteModal
        isOpen={!!todoToDelete}
        onClose={() => setTodoToDelete(null)}
        onConfirm={confirmDeleteTodo}
        itemName={todoToDelete?.message || "Task"}
        isDeleting={isDeletingTodo}
      />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-2">
            {dynamicKpiData.map((kpi, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (kpi.route) {
                    navigate(kpi.route, { state: kpi.state, hash: kpi.hash || '' });
                  }
                }}
                className={`bg-white border ${kpi.border} p-3 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 shadow-sm cursor-pointer flex flex-col items-start min-w-[140px] h-full flex-1`}
              >
                <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${kpi.bg}`}></div>
                <div className="flex w-full items-start justify-between z-10 mb-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${kpi.bg} ${kpi.color}`}>
                    <kpi.icon size={18} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="relative z-10 flex flex-col justify-end flex-1 w-full text-left">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5 leading-none">{kpi.value}</h3>
                  <p className="text-slate-500 text-[9px] font-bold tracking-wider uppercase mb-0.5 whitespace-nowrap">{kpi.title}</p>
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">{kpi.subtext}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Moved Top Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4" id="dashboard-cards">
            <ExecutiveDashboardCards data={data?.executiveCards} />
            <EmployeeMonthCard />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
            {/* Demand vs Capacity (Span 2) */}
            <div
              className="lg:col-span-2 bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex flex-col cursor-pointer group hover:border-slate-300 transition-colors"
              onClick={() => navigate('/info/allocation', { state: { showBack: true } })}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <BarChart2 size={16} className="text-blue-500" />
                    Demand vs. Capacity Forecast
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">Projected headcount vs staff availability</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicDemandCapacityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                    <Bar dataKey="capacity" name="Available Capacity" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="demand" name="Projected Demand" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actionable Todo List (Span 1) */}
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                Actionable Todo List
                <span className="ml-auto text-[10px] font-bold text-slate-400">{todos.filter(t => t.status === 'pending').length} pending</span>
              </h2>

              {/* Add Task Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={e => setNewTodoText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTodo()}
                  placeholder="Add a new task..."
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-slate-400"
                />
                <button
                  onClick={handleAddTodo}
                  disabled={todoLoading || !newTodoText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <Send size={13} />
                </button>
              </div>

              {/* Todo Items */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar max-h-[280px]">
                {todos.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No tasks yet. Add one above!</p>
                )}
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`border p-3 rounded-xl flex items-start gap-3 group transition-all ${todo.status === 'completed'
                      ? 'bg-slate-50 border-slate-100 opacity-60'
                      : 'bg-white border-gray-100 hover:border-blue-200 shadow-xs hover:shadow-sm'
                      }`}
                  >
                    <button
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`mt-0.5 flex-shrink-0 transition-colors ${todo.status === 'completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'
                        }`}
                    >
                      <CheckCircle2 size={18} strokeWidth={2} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-snug ${todo.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}>
                        {todo.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${todo.type === 'critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          todo.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>{todo.type}</span>
                        <span className="text-[9px] text-slate-400">{todo.time}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => promptDeleteTodo(todo)}
                      className="ml-auto flex-shrink-0 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Executive Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Allocation Distribution */}
            <div
              className={`bg-white border p-6 rounded-2xl shadow-sm cursor-pointer group hover:border-blue-300 transition-all duration-300 flex flex-col ${data?.executiveMetrics?.utilization_prediction?.gap > 0 ? 'border-amber-100 ring-4 ring-amber-50/50' : 'border-gray-100'}`}
              onClick={() => {
                setForcedTab('optimization');
                const el = document.getElementById('dashboard-operational-insights');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                <PieChartIcon size={18} className="text-indigo-500" />
                Workforce Allocation
              </h2>
              <div className="h-[200px] w-full relative">
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
              <div className="flex flex-wrap gap-2 justify-center mt-2 mb-4">
                {dynamicAllocationData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                    {item.name}
                  </div>
                ))}
              </div>

              {/* What-If Predictor Tip */}
              {data?.executiveMetrics?.utilization_prediction && (
                <div className={`mt-auto p-3 rounded-xl border flex items-start gap-2.5 transition-all group-hover:scale-[1.02] ${data.executiveMetrics.utilization_prediction.gap > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className={`mt-0.5 ${data.executiveMetrics.utilization_prediction.gap > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    <Trophy size={14} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-[10px] font-bold uppercase tracking-tight ${data.executiveMetrics.utilization_prediction.gap > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Strategic Tip</p>
                    <p className={`text-[10px] font-bold leading-tight ${data.executiveMetrics.utilization_prediction.gap > 0 ? 'text-amber-600/80' : 'text-emerald-600/80'}`}>
                      {data.executiveMetrics.utilization_prediction.tip}
                    </p>
                  </div>
                  <ChevronRight size={14} className="mt-2 text-slate-400" />
                </div>
              )}
            </div>

            {/* Top Skills on Bench */}
            <div
              className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm cursor-pointer group hover:border-slate-300 transition-colors"
              onClick={() => navigate('/info/employees/list', { state: { cardFilter: 'bench', showBack: true } })}
            >
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
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex flex-col max-h-[420px]">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase size={16} className="text-amber-500" />
                  Delivery Risk Board
                </h2>
                <span className="ml-auto text-[10px] font-bold text-slate-400">{dynamicProjectsAtRisk.length} projects</span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                {dynamicProjectsAtRisk.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No delivery risks detected.</p>
                )}
                {dynamicProjectsAtRisk.map((project, idx) => (
                  <div key={idx} className="bg-slate-50 border border-gray-50 p-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-800 text-xs font-bold truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{project.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-tighter">{project.client}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md border uppercase ${project.risk === 'High' ? 'text-rose-600 bg-rose-50 border-rose-100' :
                        project.risk === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                          'text-emerald-600 bg-emerald-50 border-emerald-100'
                        }`}>
                        {project.risk}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 text-left truncate leading-tight">{project.reason}</p>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.health}%`, backgroundColor: project.health < 50 ? '#ef4444' : project.health < 75 ? '#f59e0b' : '#10b981' }}>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate('/info/projects', { state: { showBack: true } })}
                  className="flex-1 text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center justify-center gap-1 transition-colors"
                >
                  View All <ArrowRight size={14} />
                </button>
                <button
                  onClick={handleExportRisk}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- OPERATIONAL SECTION --- */}
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800">

          {/* Side by side row for High Allocation & Top Performers */}
          <div className="flex flex-col lg:flex-row gap-6 w-full mt-2">
            <div className="w-full lg:w-1/2 min-w-0" id="dashboard-high-allocation">
              <HighAllocationProjects projects={data?.highAllocationProjects} />
            </div>

            <div className="w-full lg:w-1/2 min-w-0" id="dashboard-top-performers">
              <TopPerformers employees={data?.topPerformers} />
            </div>
          </div>

          {/* New Operational Insights Tables */}
          <div className="w-full mt-2 pb-8">
            <DashboardTables
              availability={data?.resourceAvailability || []}
              skillsGap={data?.skillsGap || []}
              transitions={data?.recentTransitions || []}
              certifications={data?.certificationExpiry || []}
              benchAging={data?.executiveMetrics?.bench_aging || []}
              trends={data?.executiveMetrics?.utilization_trends || []}
              forcedTab={forcedTab}
            />
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
