import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users as UsersIcon, Briefcase, Activity,
  AlertCircle, ChevronRight, BarChart2, DollarSign, Clock, UserCheck, UserMinus,
  PieChart as PieChartIcon, ShieldAlert, AlertTriangle, ArrowRight, UserPlus, Plus, Trophy,
  CheckCircle2, Trash2, Download, Send, ArrowUpRight, ListTodo, SquarePen, UserCog, X, ArrowLeft, Building2
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
  updateTodo,
  clearDashboardCache,
  fetchDepartments
} from '../api/dashboardApi';
import { getEmployeeList } from '../api/employeeApi';
import { createProject } from '../api/projectsApi';
import { createClient } from '../api/clientApi';

import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ModuleLoader from '../components/ModuleLoader';
import ResourceForecastChart from './landing-dashboard/ResourceForecastChart';

import AddProjectPanel from './projects/AddProjectPanel';
import AddClientModal from './clients/AddClientModal';
import OrganizationHighlights from './landing-dashboard/OrganizationHighlights';
import WorkforceSplitView from './landing-dashboard/WorkforceSplitView';
import NominationModal from './employee/NominationModal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

import { useDataRefresh } from '../context';


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
            {entry.name === 'Allocated' && entry.payload.ratio !== undefined && (
              <span className="text-blue-600 text-[10px] font-bold ml-auto">({entry.payload.ratio}% Ratio)</span>
            )}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const { refreshKey } = useDataRefresh();
  const lastHandledRefreshKeyRef = useRef(-1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Interaction States
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSplitViewOpen, setIsSplitViewOpen] = useState(false);
  const [isNominationModalOpen, setIsNominationModalOpen] = useState(false);

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_filters_v1');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Failed to parse dashboard filters:', err);
    }
    return {
      departments: [],
      types: [],
      skills: [],
      locations: [],
      statusTags: [],
      designations: []
    };
  });

  const selectedDepartments = filters.departments;
  const setSelectedDepartments = (depts) => setFilters(prev => ({ ...prev, departments: depts }));

  useEffect(() => {
    localStorage.setItem('dashboard_filters_v1', JSON.stringify(filters));
  }, [filters]);

  const [allEmployees, setAllEmployees] = useState([]);
  const allDepts = useMemo(() =>
    [...new Set(allEmployees.map(e => e.department).filter(Boolean))].sort()
    , [allEmployees]);

  // Actionable Todo States
  const [actionableTodos, setActionableTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  const [isDeletingTodo, setIsDeletingTodo] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadData = async () => {
      const forceRefresh = refreshKey > 0 && lastHandledRefreshKeyRef.current !== refreshKey;
      if (forceRefresh) {
        lastHandledRefreshKeyRef.current = refreshKey;
      }
      
      try {
        setLoading(true);
        
        // Pass signal to fetchDashboardData if possible, or handle post-fetch cancellation
        const [dashRes, empListRes, deptsRes] = await Promise.allSettled([
          fetchDashboardData(forceRefresh, filters),
          getEmployeeList(forceRefresh),
          fetchDepartments()
        ]);

        if (controller.signal.aborted) return;

        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value.data);
          setActionableTodos(dashRes.value.todos);
        }

        if (empListRes.status === 'fulfilled') {
          setAllEmployees(empListRes.value);
        }


        if (dashRes.status === 'rejected' && empListRes.status === 'rejected' && deptsRes.status === 'rejected') {
          setError("Connection failed. Please ensure the backend is running.");
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Failed to load dashboard data", err);
          setError("Failed to load some dashboard components.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => controller.abort();
  }, [filters, refreshKey]);

  // Standalone loadTodos effect removed because fetchDashboardData already provides both dynamic and manual todos

  const handleToggleTodo = async (id) => {
    try {
      const updated = await toggleTodo(id);
      setActionableTodos(prev => prev.map(t => t.id === id ? { ...t, status: updated.status } : t));
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
      setActionableTodos(prev => prev.filter(t => t.id !== todoToDelete.id));
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
        setActionableTodos(prev => prev.map(todo => todo.id === editingTodoId ? { ...todo, ...updated } : todo));
        setEditingTodoId(null);
      } else {
        const created = await addTodo(msg, 'info');
        setActionableTodos(prev => [created, ...prev]);
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

  useEffect(() => {
    // Restore scroll position when loading is complete
    if (!loading) {
      setTimeout(() => {
        let elId = null;
        if (localStorage.getItem('returnToTopPerformers') === 'true') {
          elId = 'dashboard-top-performers';
          localStorage.removeItem('returnToTopPerformers');
        } else if (localStorage.getItem('returnToDashboardCards') === 'true') {
          elId = 'dashboard-cards';
          localStorage.removeItem('returnToDashboardCards');
        } else if (localStorage.getItem('returnToHighAllocation') === 'true') {
          elId = 'dashboard-high-allocation';
          localStorage.removeItem('returnToHighAllocation');
        } else if (localStorage.getItem('returnToResourceAvailability') === 'true' || localStorage.getItem('returnToDashboardOperational') === 'true') {
          elId = 'dashboard-operational-insights';
          localStorage.removeItem('returnToResourceAvailability');
          localStorage.removeItem('returnToDashboardOperational');
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
      const deptParam = selectedDepartments.length > 0 ? selectedDepartments.join(',') : 'Overall';
      const res = await fetchDashboardData(true, deptParam);
      setData(res.data);
      if (res.todos) setActionableTodos(res.todos);
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
      const deptParam = selectedDepartments.length > 0 ? selectedDepartments.join(',') : 'Overall';
      const res = await fetchDashboardData(true, deptParam);
      setData(res.data);
      if (res.todos) setActionableTodos(res.todos);
    } catch (e) {
      console.error("Failed to add client", e);
      alert("Failed to create client");
    }
  };

  // Map Backend Executive Metrics to UI Arrays
  const _metrics = data?.executiveMetrics || {};

  const contextLabel = Array.isArray(selectedDepartments) && selectedDepartments.length === 0 ? 'Organization' : 'Team';

  const dynamicKpiData = [
    { 
      title: "Total Employee", 
      value: _metrics?.totalEmployees || 0, 
      subtext: "Across all departments", 
      icon: UsersIcon, 
      color: "text-slate-500", 
      bg: "bg-slate-50", 
      border: "border-slate-100", 
      route: "/info/employees/list", 
      state: { cardFilter: null, fromDashboard: true, departmentFilter: selectedDepartments } 
    },
    { 
      title: "Billable Headcount", 
      value: _metrics?.billableHeadcount || 0, 
      subtext: `out of ${String(_metrics?.totalEmployees || 0)} total`, 
      icon: UserCheck, 
      color: "text-blue-500", 
      bg: "bg-blue-50", 
      border: "border-blue-100", 
      route: "/info/employees/list", 
      state: { cardFilter: 'billable', fromDashboard: true, departmentFilter: selectedDepartments } 
    },
    { 
      title: "Non-Billable Headcount", 
      value: _metrics?.internalHeadcount || 0, 
      subtext: "Internal & Shared services", 
      icon: Activity, 
      color: "text-emerald-500", 
      bg: "bg-emerald-50", 
      border: "border-emerald-100", 
      route: "/info/employees/list", 
      state: { cardFilter: 'non-billable', fromDashboard: true, departmentFilter: selectedDepartments } 
    },
    { 
      title: "Bench Headcount", 
      value: _metrics?.benchHeadcount || 0, 
      subtext: "resources currently idle", 
      icon: UserMinus, 
      color: "text-rose-500", 
      bg: "bg-rose-50", 
      border: "border-rose-100", 
      route: "/info/employees/list", 
      state: { cardFilter: 'bench', fromDashboard: true, departmentFilter: selectedDepartments } 
    },
    { 
      title: `${String(contextLabel)} Utilization`, 
      value: `${_metrics?.companyUtilization || 0}%`, 
      subtext: "Target 85%", 
      icon: TrendingUp, 
      color: "text-emerald-500", 
      bg: "bg-emerald-50", 
      border: "border-emerald-100", 
      route: "/info/allocation", 
      state: { showUtilizationOnly: true, showBack: true, fromDashboard: true } 
    },
    { 
      title: "Active Clients", 
      value: data?.executiveCards?.activeClients?.value || 0, 
      subtext: data?.executiveCards?.activeClients?.change || "Current month", 
      icon: Building2, 
      color: "text-blue-600", 
      bg: "bg-blue-50", 
      border: "border-blue-100", 
      route: "/info/client", 
      state: { showBack: true, fromDashboard: true } 
    },
    { 
      title: "Running Projects", 
      value: data?.executiveCards?.runningProjects?.value || 0, 
      subtext: data?.executiveCards?.runningProjects?.change || "Active delivery", 
      icon: Briefcase, 
      color: "text-amber-500", 
      bg: "bg-amber-50", 
      border: "border-amber-100", 
      route: "/info/projects", 
      state: { showBack: true, fromDashboard: true } 
    },
    { 
      title: "Upcoming Bench (30days)", 
      value: _metrics?.upcomingBench || 0, 
      subtext: "Resources roll-off", 
      icon: Clock, 
      color: "text-amber-500", 
      bg: "bg-amber-50", 
      border: "border-amber-100", 
      route: "/info/allocation", 
      hash: "#forecast-bench",
      state: { showBack: true, fromDashboard: true, departmentFilter: Array.isArray(selectedDepartments) && selectedDepartments.length > 0 ? selectedDepartments.join(',') : undefined } 
    }
  ];

  const allocateAvailableData = Array.isArray(_metrics.forecast) && _metrics.forecast.length > 0 ? _metrics.forecast : [];

  const dynamicAllocationData = [
    { name: 'Billable', value: _metrics.billableHeadcount || 0, color: '#3b82f6' },
    { name: 'Non-billable', value: _metrics.internalHeadcount || 0, color: '#10b981' },
    { name: 'Bench', value: _metrics.benchHeadcount || 0, color: '#f59e0b' },
    { name: 'Notice Period', value: _metrics.noticePeriod || 0, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const totalAllocationCount = dynamicAllocationData.reduce((sum, item) => sum + item.value, 0);

  // Filtered dataset for dashboard employees
  const filteredDashboardEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      const matchesDept = !filters.departments?.length || filters.departments.includes(emp.department);
      const matchesType = !filters.types?.length || filters.types.includes(emp.employee_type);
      const matchesLocation = !filters.locations?.length || filters.locations.includes(emp.location);
      const matchesDesig = !filters.designations?.length || filters.designations.includes(emp.role_designation);

      const matchesSkills = !filters.skills?.length || (
        Array.isArray(emp.skills) && filters.skills.some(fs =>
          emp.skills.some(s => s.toLowerCase().includes(fs.toLowerCase()))
        )
      );

      // Status filtering logic (matching backend logic roughly)
      const matchesStatus = !filters.statusTags?.length || (
        filters.statusTags.some(tag => {
          const lowerTag = tag.toLowerCase();
          const alloc = emp.employee_allocations || 0;
          if (lowerTag === 'bench') return alloc <= 0;
          if (lowerTag === 'allocated') return alloc >= 100;
          if (lowerTag === 'partially allocated') return alloc > 0 && alloc < 100;
          return true;
        })
      );

      return matchesDept && matchesType && matchesLocation && matchesDesig && matchesSkills && matchesStatus;
    });
  }, [allEmployees, filters]);

  // Derive bench employees with their skills from the filtered employee list
  const dynamicBenchIndividualSkills = useMemo(() => {
    return filteredDashboardEmployees
      .filter(emp => (emp.employee_allocations || 0) <= 0 && Array.isArray(emp.skills) && emp.skills.length > 0)
      .slice(0, 4)
          .map(emp => ({
        name: emp.employee_name,
        skills: emp.skills.join(', ')
      }));
  }, [filteredDashboardEmployees]);

  const deptCounts = useMemo(() => {
    return allEmployees.reduce((acc, emp) => {
      if (emp.department) {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
      }
      return acc;
    }, {});
  }, [allEmployees]);

  if (error && !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-6 min-h-[400px] w-full bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">Backend Connection Error</h3>
          <p className="text-gray-500 max-w-sm text-sm">
            We couldn't reach the dashboard analytics engine. Please ensure the backend server and its matching containers are running.
          </p>
        </div>
        <div className="text-red-500 text-xs font-medium bg-red-50/50 px-4 py-2 rounded-lg border border-red-100/50 max-w-md truncate">
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (loading) {
    return <ModuleLoader label="Loading Dashboard" />;
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
              title="Go Back"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm font-medium text-gray-500">
                See how your {contextLabel.toLowerCase()} is doing, track project progress, and check overall health.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <MultiSelectDropdown
              options={allDepts}
              selectedValues={selectedDepartments}
              onChange={setSelectedDepartments}
              placeholder="Select Departments"
              icon={Building2}
              counts={deptCounts}
            />
            <button
              onClick={() => navigate('/info/projects/add')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} />
              Add Project
            </button>
          </div>
        </div>

        {/* --- EXECUTIVE SECTION --- */}
        <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="dashboard-cards">
            {dynamicKpiData.map((kpi, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (kpi.route) {
                    navigate(kpi.route + (kpi.hash || ''), { state: kpi.state });
                  }
                }}
                className={`bg-white border border-slate-200 p-4 rounded-2xl relative overflow-hidden group hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all duration-300 shadow-sm cursor-pointer flex flex-col justify-between min-h-[100px]`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <p className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {kpi.value}
                  </p>
                  <div className={`p-2 rounded-xl transition-all ${kpi.bg} ${kpi.color} group-hover:bg-blue-100 group-hover:text-blue-700`}>
                    <kpi.icon size={20} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600/80 transition-colors">
                    {kpi.title}
                  </p>
                  {kpi.subtext && (
                    <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{kpi.subtext}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
            {/* Allocated vs Availability (Span 2) */}
            <div
              className="lg:col-span-2 bg-white border border-slate-100 p-5 rounded-2xl shadow-md flex flex-col cursor-pointer group hover:border-slate-300 transition-colors"
              onClick={() => navigate('/info/allocation', { state: { showBack: true } })}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BarChart2 size={18} className="text-blue-500" />
                    Allocated vs Available
                  </h2>
                  <p className="text-sm font-medium text-gray-500 mt-1">Comparing how many people are working versus who is available</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[300px]">
                {allocateAvailableData.length > 0 ? (
                  <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={allocateAvailableData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                      <Bar dataKey="available" name="Available" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="allocate" name="Allocated" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                    Forecast data unavailable
                  </div>
                )}
              </div>
            </div>

            {/* Actionable Todo List (Span 1) — Coming Soon */}
            <div className="relative bg-white border border-slate-100 rounded-2xl shadow-md flex flex-col overflow-hidden min-h-[380px]">

              {/* Blurred background preview */}
              <div className="flex flex-col gap-3 p-5 blur-[3px] opacity-40 pointer-events-none select-none">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ListTodo size={18} className="text-blue-500" />
                  Actionable Todo List
                  <span className="ml-auto text-xs font-bold text-slate-400">{actionableTodos.length} pending</span>
                </h2>
                <div className="flex gap-2">
                  <div className="flex-1 h-8 bg-slate-100 rounded-lg" />
                  <div className="w-14 h-8 bg-blue-200 rounded-lg" />
                </div>
                {[
                  { w: 'w-3/4', type: 'bg-rose-100' },
                  { w: 'w-full', type: 'bg-amber-100' },
                  { w: 'w-2/3', type: 'bg-blue-100' },
                ].map((item, i) => (
                  <div key={i} className="border border-slate-100 bg-slate-50 p-3 rounded-xl flex items-start gap-3">
                    <div className="w-4 h-4 mt-0.5 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className={`h-3 ${item.w} bg-slate-200 rounded`} />
                      <div className={`h-2 w-10 ${item.type} rounded`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-[2px]">
                <div className="relative flex items-center justify-center">
                  {/* Pulsing ring */}
                  <span className="absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-20 animate-ping" />
                  <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <ListTodo size={24} className="text-white" strokeWidth={2} />
                  </div>
                </div>

                <div className="text-center px-6">
                  <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Coming Soon
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Actionable Todo List</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                    A smart task board to track and act on your team's priorities — launching soon.
                  </p>
                </div>

                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-blue-300"
                      style={{ animationDelay: `${i * 0.2}s`, animation: 'pulse 1.5s ease-in-out infinite' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Executive Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Allocation Distribution */}
            <div
              className={`bg-white border p-6 rounded-2xl shadow-md cursor-pointer group hover:border-blue-300 transition-all duration-300 flex flex-col ${data?.executiveMetrics?.utilizationPrediction?.gap > 0 ? 'border-amber-100 ring-4 ring-amber-50/50' : 'border-slate-100'}`}
              onClick={() => setIsSplitViewOpen(true)}
            >
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                <PieChartIcon size={18} className="text-indigo-500" />
                {contextLabel} Allocation
              </h2>
              <div className="h-[200px] w-full relative">
                {dynamicAllocationData.length > 0 ? (
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
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px] italic">
                    No allocation data
                  </div>
                )}
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
              {data?.executiveMetrics?.utilizationPrediction && (
                <div className={`mt-auto p-3 rounded-xl border flex items-start gap-2.5 transition-all group-hover:scale-[1.02] ${data.executiveMetrics.utilizationPrediction.gap > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className={`mt-0.5 ${data.executiveMetrics.utilizationPrediction.gap > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    <Trophy size={14} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-[10px] font-bold uppercase tracking-tight ${data.executiveMetrics.utilizationPrediction.gap > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Strategic Tip</p>
                    <p className={`text-[10px] font-bold leading-tight ${data.executiveMetrics.utilizationPrediction.gap > 0 ? 'text-amber-600/80' : 'text-emerald-600/80'}`}>
                      {data.executiveMetrics.utilizationPrediction.tip}
                    </p>
                  </div>
                  <ChevronRight size={14} className="mt-2 text-slate-400" />
                </div>
              )}
            </div>

            {/* Top Skills on Bench */}
            <div
              className="bg-white border border-slate-100 rounded-2xl shadow-md flex flex-col transition-all overflow-hidden cursor-pointer group hover:border-blue-300"
              onClick={() => navigate('/info/employees/list', { state: { cardFilter: 'bench', showBack: true, departmentFilter: selectedDepartments.length > 0 ? selectedDepartments.join(',') : undefined } })}
            >
              <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-50 bg-slate-50/30">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-emerald-500" />
                  Top Skills on Bench
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50 bg-white">
                      <th className="text-left py-2 px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="text-left py-2 px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skill Set</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dynamicBenchIndividualSkills.length > 0 ? dynamicBenchIndividualSkills.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/info/employees/list', { state: { search: row.name, showBack: true } })}>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{row.name}</span>
                        </td>
                        <td className="py-2.5 px-3">
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
            <OrganizationHighlights
              contextLabel={contextLabel}
              availability={data?.resourceAvailability || []}
              transitions={data?.recentTransitions || []}
              certifications={data?.certificationExpiry || []}
              benchAging={data?.executiveMetrics?.benchAging || []}
              highUtilizationEmployee={data?.topPerformers || []}
              highUtilizationProject={data?.highAllocationProjects || []}
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
        contextLabel={contextLabel}
      />

      {isNominationModalOpen && (
        <NominationModal
          onClose={() => setIsNominationModalOpen(false)}
          onSuccess={() => {
            // Manual refresh of dashboard data without reloading page
            fetchDashboardData(true, filters).then(res => {
              if (res.data) setData(res.data);
              if (res.todos) setActionableTodos(res.todos);
            }).catch(console.error);
          }}
        />
      )}

    </div>
  );
}

export default Dashboard;
