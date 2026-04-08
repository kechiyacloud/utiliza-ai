import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users as UsersIcon, Briefcase, Activity,
  AlertCircle, ChevronRight, BarChart2, DollarSign,
  PieChart as PieChartIcon, ShieldAlert, AlertTriangle, ArrowRight, UserPlus, Plus, Trophy,
  CheckCircle2, Trash2, Download, Send, ArrowUpRight, ListTodo, SquarePen, UserCog, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';

import { 
  fetchDashboardData, 
  fetchTodos, 
  addTodo, 
  toggleTodo, 
  clearTodo, 
  exportRiskBoard, 
  updateTodo, 
  clearDashboardCache,
  fetchDepartments 
} from '../api/dashboardApi';
import { getEmployeeList } from '../api/employeeApi';
import { createProject } from '../api/projectsApi';
import { createClient } from '../api/clientApi';

import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ExecutiveDashboardCards from './landing-dashboard/ExecutiveDashboardCards';
import ResourceForecastChart from './landing-dashboard/ResourceForecastChart';

import AddProjectPanel from './projects/AddProjectPanel';
import AddClientModal from './clients/AddClientModal';
import DashboardTables from './landing-dashboard/DashboardTables';
import WorkforceSplitView from './landing-dashboard/WorkforceSplitView';
import NominationModal from './employee/NominationModal';


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
  const [isSplitViewOpen, setIsSplitViewOpen] = useState(false);
  const [isNominationModalOpen, setIsNominationModalOpen] = useState(false);

  // Filter States
  const [selectedDepartment, setSelectedDepartment] = useState(() => {
    return localStorage.getItem('dashboard_department_filter') || 'Overall';
  });
  const [allEmployees, setAllEmployees] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  useEffect(() => {
    localStorage.setItem('dashboard_department_filter', selectedDepartment);
  }, [selectedDepartment]);

  // Actionable Todo States
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  const [isDeletingTodo, setIsDeletingTodo] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Parallel fetch for all initial dashboard requirements
        const [dashRes, empListRes, todosRes, deptsRes] = await Promise.allSettled([
          fetchDashboardData(false, selectedDepartment),
          getEmployeeList(),
          fetchTodos(),
          fetchDepartments()
        ]);

        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value.data);
          // The todos from dashRes are dynamic suggestions, we combine them with manual todos
          // if (dashRes.value.todos) setTodos(prev => [...dashRes.value.todos, ...prev.filter(t => !t.isSystemSuggestion)]);
        }

        if (empListRes.status === 'fulfilled') {
          setAllEmployees(empListRes.value);
        }
        
        if (todosRes.status === 'fulfilled') {
          setTodos(todosRes.value);
        }

        if (deptsRes.status === 'fulfilled') {
          setDepartmentOptions(deptsRes.value);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedDepartment]);

  // Standalone loadTodos effect removed because fetchDashboardData already provides both dynamic and manual todos

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
      if (editingTodoId) {
        const realId = editingTodoId.toString().replace('manual-', '');
        const updated = await updateTodo(realId, { message: msg, type: 'info' });
        setTodos(prev => prev.map(todo => todo.id === editingTodoId ? { ...todo, ...updated } : todo));
        setEditingTodoId(null);
      } else {
        const created = await addTodo(msg, 'info');
        setTodos(prev => [created, ...prev]);
      }
      setNewTodoText('');
    } catch (e) { console.error(e); }
    finally { setTodoLoading(false); }
  };

  const startEditingTodo = (todo) => {
    if (todo?.isSystemSuggestion) return;
    setEditingTodoId(todo.id);
    setNewTodoText(todo.message || '');
  };

  const cancelTodoEditing = () => {
    setEditingTodoId(null);
    setNewTodoText('');
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
      const payload = {
        project_id: (projectData.name.replace(/\s+/g, '-').toUpperCase() + '-' + Math.floor(Math.random() * 1000)).substring(0, 20),
        project_name: projectData.name,
        project_status: projectData.status,
        billable: projectData.type === 'Client' ? 'Yes' : 'No',
        start_date: projectData.startDate || null,
        end_date: projectData.endDate || null
      };
      await createProject(payload);

      setIsProjectPanelOpen(false);
      clearDashboardCache();
      const res = await fetchDashboardData(true, selectedDepartment);
      setData(res.data);
      if (res.todos) setTodos(res.todos);
    } catch (e) {
      console.error("Failed to add project", e);
      alert("Failed to create project");
    }
  };

  const handleAddClient = async (clientData) => {
    try {
      await createClient(clientData);
      setIsClientModalOpen(false);
      clearDashboardCache();
      const res = await fetchDashboardData(true, selectedDepartment);
      setData(res.data);
      if (res.todos) setTodos(res.todos);
    } catch (e) {
      console.error("Failed to add client", e);
      alert("Failed to create client");
    }
  };

  // Map Backend Executive Metrics to UI Arrays
  const _metrics = data?.executiveMetrics || {};

  const dynamicKpiData = [
    { title: "Company Utilization", value: `${_metrics?.company_utilization || 0}%`, subtext: "Target 85%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100", route: "/info/allocation", state: { showUtilizationOnly: true, showBack: true } },
    { title: "Billable Headcount", value: _metrics?.billable_headcount || 0, subtext: `out of ${_metrics?.total_employees || 0} total`, icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100", route: "/info/employees/list", state: { cardFilter: 'billable', showBack: true, departmentFilter: selectedDepartment !== 'Overall' ? selectedDepartment : undefined } },
    { title: "Bench Headcount", value: _metrics?.bench_headcount || 0, subtext: "employees currently idle", icon: UsersIcon, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100", route: "/info/employees/list", state: { cardFilter: 'bench', showBack: true, departmentFilter: selectedDepartment !== 'Overall' ? selectedDepartment : undefined } },
    { title: "Upcoming Bench (30d)", value: _metrics?.upcoming_bench || 0, subtext: "Rolling off soon", icon: Activity, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", route: "/info/allocation", state: { showForecastOnly: true, showBack: true, departmentFilter: selectedDepartment !== 'Overall' ? selectedDepartment : undefined } }
  ];

  const dynamicDemandCapacityData = Array.isArray(_metrics.forecast) && _metrics.forecast.length > 0 ? _metrics.forecast : [];

  const dynamicAllocationData = [
    { name: 'Billable', value: _metrics.billable_headcount || 0, color: '#3b82f6' },
    { name: 'Internal', value: _metrics.internal_headcount || 0, color: '#10b981' },
    { name: 'Bench', value: _metrics.bench_headcount || 0, color: '#f59e0b' },
    { name: 'Notice Period', value: _metrics.notice_period || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const totalAllocationCount = dynamicAllocationData.reduce((sum, item) => sum + item.value, 0);

  const dynamicBenchSkillsData = Array.isArray(_metrics?.bench_skills) && _metrics.bench_skills.length > 0 ? _metrics.bench_skills : [];
  const dynamicBenchIndividualSkills = Array.isArray(_metrics?.bench_individual_skills) && _metrics.bench_individual_skills.length > 0 ? _metrics.bench_individual_skills : [];
  const dynamicAlerts = Array.isArray(_metrics?.alerts) && _metrics.alerts.length > 0 ? _metrics.alerts : [];
  const dynamicProjectsAtRisk = Array.isArray(_metrics?.projects_at_risk) && _metrics.projects_at_risk.length > 0 ? _metrics.projects_at_risk : [];
  
  const filteredDashboardEmployees = useMemo(() => (
    selectedDepartment === 'Overall'
      ? allEmployees
      : allEmployees.filter((employee) => employee.department === selectedDepartment)
  ), [allEmployees, selectedDepartment]);

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
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-white border text-sm font-bold text-slate-700 border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="Overall">All Departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <button
              onClick={() => navigate('/info/employee/add')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
            >
              <UserCog size={18} />
              Add Employee
            </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4" id="dashboard-cards">
            <ExecutiveDashboardCards data={data?.executiveCards} selectedDepartment={selectedDepartment} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
            {/* Allocated vs Availability (Span 2) */}
            <div
              className="lg:col-span-2 bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex flex-col cursor-pointer group hover:border-slate-300 transition-colors"
              onClick={() => navigate('/info/allocation', { state: { showBack: true } })}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <BarChart2 size={16} className="text-blue-500" />
                    Allocate vs Available
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">Monthly allocated FTE vs remaining active availability</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={dynamicDemandCapacityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                    <Bar dataKey="availability" name="Availability" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="allocated" name="Allocated" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actionable Todo List (Span 1) */}
            <div className="relative bg-gray-50 border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col gap-3 overflow-hidden">
              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[3px] rounded-2xl p-6">
                <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100 mb-3">
                  <ListTodo size={28} className="text-blue-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-1 shadow-white">Coming Soon</h3>
                <p className="text-xs font-semibold text-slate-600 shadow-white">Intelligent task management is under development.</p>
              </div>

              {/* Blurred Content */}
              <div className="opacity-40 blur-[3px] flex flex-col gap-3 pointer-events-none select-none h-full">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ListTodo size={16} className="text-blue-500" />
                  Actionable Todo List
                  <span className="ml-auto text-[10px] font-bold text-slate-400">{todos.filter(t => t.status === 'pending').length} pending</span>
                </h2>

              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] text-slate-600">
                <span className="font-semibold">Admin controls are enabled for this board.</span>
                <span className="font-black uppercase tracking-wider text-blue-600">{editingTodoId ? 'Editing task' : 'Live task manager'}</span>
              </div>

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
                  {editingTodoId ? 'Save' : 'Add'}
                </button>
                {editingTodoId && (
                  <button
                    onClick={cancelTodoEditing}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    <X size={13} />
                  </button>
                )}
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
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {todo.isSystemSuggestion && todo.actionType && todo.actionType !== 'none' && todo.status === 'pending' && (
                        <button
                          onClick={() => navigate(todo.actionType === 'project' ? '/info/projects' : '/info/allocation', { state: { showBack: true } })}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Take Action"
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      )}
                      {!todo.isSystemSuggestion && (
                        <button
                          onClick={() => startEditingTodo(todo)}
                          className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                          title="Edit task"
                        >
                          <SquarePen size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => promptDeleteTodo(todo)}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>

          {/* Executive Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Allocation Distribution */}
            <div
              className={`bg-white border p-6 rounded-2xl shadow-sm cursor-pointer group hover:border-blue-300 transition-all duration-300 flex flex-col ${data?.executiveMetrics?.utilization_prediction?.gap > 0 ? 'border-amber-100 ring-4 ring-amber-50/50' : 'border-gray-100'}`}
              onClick={() => setIsSplitViewOpen(true)}
            >
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                <PieChartIcon size={18} className="text-indigo-500" />
                Workforce Allocation
              </h2>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
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
                    <span className="font-semibold">{item.name}</span> <span className="opacity-75">({item.value})</span>
                  </div>
                ))}
              </div>

              {/* Strategic Predictor Tip */}
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
              className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col transition-all overflow-hidden cursor-pointer group hover:border-blue-300"
              onClick={() => navigate('/info/employees/list', { state: { cardFilter: 'bench', showBack: true, departmentFilter: selectedDepartment !== 'Overall' ? selectedDepartment : undefined } })}
            >
              <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-50 bg-slate-50/30">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-emerald-500" />
                  Top Skills on Bench
                </h2>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-1 max-h-[260px]">
                <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                            <th className="text-left py-2 px-5">Employee</th>
                            <th className="text-left py-2 px-5">Skill Set</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {dynamicBenchIndividualSkills.length > 0 ? dynamicBenchIndividualSkills.map((row, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/info/employees/list', { state: { search: row.name, showBack: true } })}>
                                <td className="py-2.5 px-5">
                                    <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{row.name}</span>
                                </td>
                                <td className="py-2.5 px-5">
                                    <div className="flex flex-wrap gap-1">
                                        {row.skills.split(', ').map((skill, sIdx) => (
                                            <span key={sIdx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                          <tr>
                            <td colSpan="2" className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                                <ShieldAlert opacity={0.5} size={24} />
                                No resources currently on bench with skills listed.
                            </td>
                          </tr>
                        )}
                    </tbody>
                </table>
              </div>
            </div>


          </div>
        </div>

        {/* --- OPERATIONAL SECTION --- */}
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800">



          {/* Operational Insights Tables */}
          <div className="w-full mt-2 pb-8">
            <DashboardTables
              availability={data?.resourceAvailability || []}
              skillsGap={data?.skillsGap || []}
              transitions={data?.recentTransitions || []}
              certifications={data?.certificationExpiry || []}
              benchAging={data?.executiveMetrics?.bench_aging || []}
              highUtilizationEmployee={data?.topPerformers || []}
              highUtilizationProject={data?.highAllocationProjects || []}
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
        onSubmit={handleAddClient}
      />

      <WorkforceSplitView
        isOpen={isSplitViewOpen}
        onClose={() => setIsSplitViewOpen(false)}
        employees={filteredDashboardEmployees}
      />

      {isNominationModalOpen && (
        <NominationModal 
          onClose={() => setIsNominationModalOpen(false)} 
          onSuccess={() => {
            // Simplified refresh: reload the page to see new data
            window.location.reload();
          }} 
        />
      )}
    </div>
  );
}

export default Dashboard;
