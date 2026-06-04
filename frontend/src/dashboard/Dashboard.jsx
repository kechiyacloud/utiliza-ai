import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users as UsersIcon, Briefcase, Activity,
  AlertCircle, ChevronRight, BarChart2, DollarSign, Clock, UserCheck, UserMinus,
  PieChart as PieChartIcon, ShieldAlert, AlertTriangle, ArrowRight, UserPlus, Plus, Trophy,
  CheckCircle2, Trash2, Download, Send, ArrowUpRight, ListTodo, SquarePen, UserCog, X, ArrowLeft, Building2, Check, RefreshCw, Hourglass
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import { toast } from 'react-hot-toast';

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
        {label && <p className="text-gray-800 font-bold mb-2">{label}</p>}
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
  const { refreshKey, triggerRefresh } = useDataRefresh();
  const lastHandledRefreshKeyRef = useRef(-1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [targetPercentage, setTargetPercentage] = useState(() => {
    try {
      const saved = localStorage.getItem('utilization_target_percentage');
      if (saved) return parseInt(saved, 10);
    } catch (e) {}
    return 85;
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);

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
  const [todoFilter, setTodoFilter] = useState('ALL');
  const [highlightsTabOverride, setHighlightsTabOverride] = useState(null);
  const [timelineMonths, setTimelineMonths] = useState(6);
  const [benchViewTab, setBenchViewTab] = useState('RESOURCE');

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
      toast.success(updated.status === 'completed' ? 'Task completed' : 'Task reopened');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update task');
    }
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
      toast.success('Task deleted successfully');
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete task.");
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
        toast.success('Task updated');
      } else {
        const created = await addTodo(msg, 'info');
        setActionableTodos(prev => [created, ...prev]);
        toast.success('Task added successfully');
      }
      setNewTodoText('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save task');
    }
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
      toast.success('Project created successfully');
    } catch (e) {
      console.error("Failed to add project", e);
      toast.error("Failed to create project");
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
      toast.success('Client created successfully');
    } catch (e) {
      console.error("Failed to add client", e);
      toast.error("Failed to create client");
    }
  };

  // Map Backend Executive Metrics to UI Arrays
  const _metrics = data?.executiveMetrics || {};
  const utilizationVal = _metrics?.companyUtilization || 0;

  const avgBenchTenureText = useMemo(() => {
    const aging = data?.executiveMetrics?.benchAging || [];
    if (aging.length === 0) return '';
    const total = aging.reduce((sum, item) => sum + (item.days_in_year || 0), 0);
    const avg = Math.round(total / aging.length);
    return `Avg. tenure: ${avg} days`;
  }, [data]);

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
      title: "Internal Headcount",
      value: _metrics?.internalHeadcount || 0,
      subtext: "Leadership & admin operations",
      icon: Building2,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      route: "/info/employees/list",
      state: { cardFilter: 'internal', fromDashboard: true, departmentFilter: selectedDepartments }
    },
    {
      title: "Non-Billable Headcount",
      value: _metrics?.nonBillableHeadcount || 0,
      subtext: "On internal projects",
      icon: Activity,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      route: "/info/employees/list",
      state: { cardFilter: 'non-billable', fromDashboard: true, departmentFilter: selectedDepartments }
    },
    {
      title: "Bench Headcount",
      value: _metrics?.benchHeadcount || 0,
      subtext: `resources currently idle${_metrics?.noticePeriod > 0 ? ` (${_metrics.noticePeriod} leaving soon)` : ''}${avgBenchTenureText ? ` • ${avgBenchTenureText}` : ''}`,
      icon: UserMinus,
      color: "text-rose-500",
      bg: "bg-rose-50",
      border: "border-rose-100",
      route: "/info/employees/list",
      state: { cardFilter: 'bench', fromDashboard: true, departmentFilter: selectedDepartments }
    },
    {
      title: "Notice Period",
      value: _metrics?.noticePeriod || 0,
      subtext: "Employees leaving soon",
      icon: Hourglass,
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
      route: "/info/employees/list",
      state: { cardFilter: 'notice', fromDashboard: true, departmentFilter: selectedDepartments }
    },
    {
      title: `${String(contextLabel)} Allocation`,
      value: `${_metrics?.companyUtilization || 0}%`,
      subtext: `Target ${targetPercentage}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      route: "/info/allocation",
      state: { showUtilizationOnly: true, showBack: true, fromDashboard: true, departmentFilter: selectedDepartments }
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
      state: { showBack: true, fromDashboard: true, departmentFilter: selectedDepartments }
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
      state: { showBack: true, fromDashboard: true, departmentFilter: selectedDepartments }
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

  const allocateAvailableData = useMemo(() => {
    const rawForecast = Array.isArray(_metrics.forecast) && _metrics.forecast.length > 0 ? _metrics.forecast : [];
    return rawForecast.slice(0, timelineMonths);
  }, [_metrics.forecast, timelineMonths]);

  const dynamicAllocationData = [
    { name: 'Billable', value: _metrics.billableHeadcount || 0, color: '#3b82f6' },
    { name: 'Internal', value: _metrics.internalHeadcount || 0, color: '#6366f1' },
    { name: 'Non-billable', value: _metrics.nonBillableHeadcount || 0, color: '#10b981' },
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
      .filter(emp => {
        const isBench = (emp.employee_allocations || 0) <= 0;
        const status = emp.employee_status || '';
        const isDelivery = status !== 'Leadership' && 
                           status !== 'Internal Operations' && 
                           status !== 'System account' &&
                           status !== 'system_account' &&
                           status !== 'System_account';
        return isBench && isDelivery;
      })
      .slice(0, 4)
      .map(emp => ({
        name: emp.employee_name,
        role: emp.role_designation,
        skills: Array.isArray(emp.skills) ? emp.skills.filter(Boolean) : []
      }));
  }, [filteredDashboardEmployees]);

  // Aggregate bench skills for Skill View
  const benchSkillsAggregated = useMemo(() => {
    const benchEmployees = filteredDashboardEmployees.filter(emp => {
      const isBench = (emp.employee_allocations || 0) <= 0;
      const status = emp.employee_status || '';
      const isDelivery = status !== 'Leadership' && 
                         status !== 'Internal Operations' && 
                         status !== 'System account' &&
                         status !== 'system_account' &&
                         status !== 'System_account';
      return isBench && isDelivery;
    });

    const counts = {};
    benchEmployees.forEach(emp => {
      if (Array.isArray(emp.skills)) {
        emp.skills.forEach(skill => {
          if (skill) {
            counts[skill] = (counts[skill] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredDashboardEmployees]);

  const deptCounts = useMemo(() => {
    return allEmployees.reduce((acc, emp) => {
      if (emp.department) {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
      }
      return acc;
    }, {});
  }, [allEmployees]);

  const filteredTodos = useMemo(() => {
    return actionableTodos.filter(todo => {
      const isSystem = todo.isSystemSuggestion || todo.type === 'warning' || todo.type === 'alert';
      if (todoFilter === 'ALERTS') return isSystem;
      if (todoFilter === 'TASKS') return !isSystem;
      return true;
    });
  }, [actionableTodos, todoFilter]);

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
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm font-medium text-gray-500">
                See how your {contextLabel.toLowerCase()} is doing, track project progress, and check overall health.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => {
                clearDashboardCache();
                triggerRefresh();
              }}
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
              title="Refresh Dashboard Data"
            >
              <RefreshCw size={18} className={`${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8" id="dashboard-cards">
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

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
            {/* Allocated vs Availability (Span 3 for 60% split) */}
            <div
              className="lg:col-span-3 bg-white border border-slate-100 p-5 rounded-2xl shadow-md flex flex-col cursor-pointer group hover:border-slate-300 transition-colors h-[490px]"
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
                <div className="flex gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-100" onClick={(e) => e.stopPropagation()}>
                  {[
                    { val: 3, label: '3M' },
                    { val: 6, label: '6M' },
                    { val: 12, label: '1Y' }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setTimelineMonths(item.val)}
                      className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all ${
                        timelineMonths === item.val
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
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

            {/* Actionable Todo List — Dashboard Theme (Span 2 for 40% split) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col overflow-hidden h-[490px]">
              <div className="flex flex-col h-full">

                {/* ── Header ── */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 rounded-lg">
                        <ListTodo size={16} className="text-blue-500" />
                      </div>
                      Actionable Todo List
                    </h2>
                    <div className="flex items-center gap-2">
                      {actionableTodos.filter(t => t.status === 'done' || t.status === 'completed').length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          {actionableTodos.filter(t => t.status === 'done' || t.status === 'completed').length} Done
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        {actionableTodos.filter(t => t.status !== 'done' && t.status !== 'completed').length} Pending
                      </span>
                    </div>
                  </div>

                  {/* Filter toggle buttons */}
                  <div className="flex gap-1 mt-3 bg-slate-100/80 p-0.5 rounded-lg border border-slate-100 max-w-[240px]">
                    {['ALL', 'ALERTS', 'TASKS'].map(f => (
                      <button
                        key={f}
                        onClick={() => setTodoFilter(f)}
                        className={`flex-1 text-[9px] font-black uppercase tracking-wider py-1 rounded transition-all ${
                          todoFilter === f 
                            ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {f === 'ALL' ? 'All' : f === 'ALERTS' ? 'Alerts' : 'My Tasks'}
                      </button>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {actionableTodos.length > 0 && (
                    <div className="mt-3">
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round(
                              (actionableTodos.filter(t => t.status === 'done' || t.status === 'completed').length /
                                actionableTodos.length) * 100
                            )}%`
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        {Math.round(
                          (actionableTodos.filter(t => t.status === 'done' || t.status === 'completed').length /
                            actionableTodos.length) * 100
                        )}% complete
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Input Row ── */}
                <div className="px-4 py-3 border-b border-slate-100 flex gap-2 items-center bg-slate-50/40">
                  <input
                    type="text"
                    placeholder={editingTodoId ? 'Editing task...' : 'Add a new task and press Enter...'}
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                  />
                  {editingTodoId && (
                    <button
                      onClick={cancelTodoEditing}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Cancel editing"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleAddTodo}
                    disabled={todoLoading || !newTodoText.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
                    title={editingTodoId ? 'Save edit' : 'Add task'}
                  >
                    {editingTodoId ? <Check size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
                  </button>
                </div>

                {/* ── Task List ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                  {filteredTodos.length > 0 ? (
                    filteredTodos.map((todo) => {
                      const isDone = todo.status === 'done' || todo.status === 'completed';
                      const isEditing = editingTodoId === todo.id;
                      const isWarning = todo.type === 'warning' || todo.type === 'alert';
                      const isSuggestion = todo.isSystemSuggestion;
                      return (
                        <div
                          key={todo.id}
                          className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200
                            ${isDone
                              ? 'bg-slate-50/60 border-slate-100'
                              : isSuggestion
                                ? 'bg-amber-50/40 border-amber-100 hover:border-amber-200'
                                : isWarning
                                  ? 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
                                  : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'
                            }`}
                        >
                          {/* Left accent line */}
                          {!isDone && (
                            <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${isSuggestion ? 'bg-amber-400' : isWarning ? 'bg-rose-400' : 'bg-blue-400'
                              }`} />
                          )}

                          {/* Checkbox / Icon */}
                          {isSuggestion ? (
                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-amber-200 bg-amber-50 flex items-center justify-center">
                              <AlertCircle size={10} className="text-amber-500" strokeWidth={3} />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleTodo(todo.id)}
                              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                ${isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                            >
                              {isDone && <Check size={11} strokeWidth={3} />}
                            </button>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  value={newTodoText}
                                  onChange={(e) => setNewTodoText(e.target.value)}
                                  rows={2}
                                  className="w-full text-sm text-slate-700 bg-white border border-blue-300 rounded-lg px-3 py-2 outline-none resize-none focus:ring-2 focus:ring-blue-100 transition-all"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <p className={`text-sm font-semibold leading-snug break-words ${isDone ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'
                                  }`}>
                                  {todo.message || todo.text}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isSuggestion ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                                      ⚡ System Suggestion
                                    </span>
                                  ) : isWarning ? (
                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100">
                                      Alert
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                      Task
                                    </span>
                                  )}
                                  {isDone && (
                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                                      ✓ Done
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action buttons — manual tasks only */}
                          {!isSuggestion && !isEditing && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0">
                              <button
                                onClick={() => startEditingTodo(todo)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit task"
                              >
                                <SquarePen size={13} />
                              </button>
                              <button
                                onClick={() => promptDeleteTodo(todo)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <ListTodo size={22} className="text-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-400">All clear!</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">Add a task above to get started.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 font-medium">
                    {actionableTodos.filter(t => t.status !== 'done' && t.status !== 'completed').length > 0
                      ? `${actionableTodos.filter(t => t.status !== 'done' && t.status !== 'completed').length} task${actionableTodos.filter(t => t.status !== 'done' && t.status !== 'completed').length > 1 ? 's' : ''} remaining`
                      : 'All tasks completed 🎉'}
                  </p>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest cursor-not-allowed"
                  >
                    Full Board
                    <ArrowRight size={11} />
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Executive Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Allocation Distribution */}
            <div
              className={`bg-white border p-4 rounded-2xl shadow-md cursor-pointer group hover:border-blue-300 transition-all duration-300 flex flex-col ${data?.executiveMetrics?.utilizationPrediction?.gap > 0 ? 'border-amber-100 ring-4 ring-amber-50/50' : 'border-slate-100'}`}
              onClick={() => setIsSplitViewOpen(true)}
            >
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                <PieChartIcon size={18} className="text-indigo-500" />
                {contextLabel} Allocation
              </h2>
              <div className="h-[220px] w-full relative">
                {dynamicAllocationData.length > 0 ? (
                  <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie
                        data={dynamicAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {dynamicAllocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} position={{ y: 0 }} allowEscapeViewBox />
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
              {data?.executiveMetrics && (() => {
                const targetGap = Math.max(0, targetPercentage - utilizationVal);
                const isWarning = targetGap > 0;
                return (
                  <div className={`mt-auto p-3 rounded-xl border flex items-start gap-2.5 transition-all group-hover:scale-[1.02] ${isWarning ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className={`mt-0.5 ${isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                      <Trophy size={14} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[10px] font-bold uppercase tracking-tight ${isWarning ? 'text-amber-700' : 'text-emerald-700'}`}>Strategic Tip</p>
                      <p 
                        className={`text-[10px] font-bold leading-tight ${isWarning ? 'text-amber-600/80' : 'text-emerald-600/80'} flex items-center flex-wrap`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Target </span>
                        {isEditingTarget ? (
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={targetPercentage}
                            autoFocus
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1));
                              setTargetPercentage(val);
                              try {
                                localStorage.setItem('utilization_target_percentage', val.toString());
                              } catch (err) {}
                            }}
                            onBlur={() => setIsEditingTarget(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape') {
                                setIsEditingTarget(false);
                              }
                            }}
                            className="w-12 text-center bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-black mx-1 inline-block text-slate-800 px-1 py-0.5"
                          />
                        ) : (
                          <span 
                            className="relative inline-block cursor-pointer group/target peer mx-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingTarget(true);
                            }}
                          >
                            <span className="font-black hover:text-slate-900 transition-colors">
                              {targetPercentage}
                            </span>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-slate-800 text-white text-[9px] font-bold uppercase rounded shadow-lg whitespace-nowrap z-50 transition-all animate-in fade-in slide-in-from-bottom-1 pointer-events-none hidden group-hover/target:block">
                              Edit
                            </span>
                          </span>
                        )}
                        <span>% utilization.</span>
                        <span className={`transition-all ${isEditingTarget ? 'inline' : 'hidden peer-hover:inline'} ml-1`}>
                          {targetGap > 0 ? `Current: ${utilizationVal}% (Gap: ${targetGap}%)` : `Current: ${utilizationVal}% (Optimal)`}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Top Skills on Bench */}
            <div
              className="bg-white border border-slate-100 rounded-2xl shadow-md flex flex-col transition-all overflow-hidden group hover:border-blue-300 min-h-[300px]"
            >
              <div className="flex justify-between items-start p-6 pb-4 border-b border-gray-50 bg-slate-50/30">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ShieldAlert size={18} className="text-emerald-500" />
                    Top Skills on Bench
                  </h2>
                  {/* View toggle tabs */}
                  <div className="flex gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setBenchViewTab('RESOURCE')}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all ${benchViewTab === 'RESOURCE' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Resource View
                    </button>
                    <button
                      onClick={() => setBenchViewTab('SKILL')}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all ${benchViewTab === 'SKILL' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Skill View
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                {benchViewTab === 'RESOURCE' ? (
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
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{row.name}</span>
                              {row.role && (
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 self-start px-1 py-0.5 bg-slate-50 border border-slate-100/50 rounded">
                                  {row.role}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {row.skills.length > 0 ? (
                                row.skills.map((skill, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate('/info/employees/list', { state: { search: skill, showBack: true } });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-100 text-[8px] font-black uppercase transition-all cursor-pointer"
                                    title={`Search ${skill}`}
                                  >
                                    {skill}
                                  </button>
                                ))
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-200 text-[8px] font-black uppercase tracking-wider animate-pulse">
                                  Skills Pending Update
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="2" className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                            <ShieldAlert opacity={0.5} size={24} />
                            No resources currently on bench.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50 bg-white">
                        <th className="text-left py-2 px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skill Name</th>
                        <th className="text-right py-2 px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bench Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {benchSkillsAggregated.length > 0 ? benchSkillsAggregated.map((row, idx) => (
                        <tr
                          key={idx}
                          className="group hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => navigate('/info/employees/list', { state: { search: row.name, cardFilter: 'bench', showBack: true } })}
                        >
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase">
                              {row.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-bold text-slate-800 text-xs">{row.count} Resource{row.count > 1 ? 's' : ''}</span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="2" className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                            <ShieldAlert opacity={0.5} size={24} />
                            No skills recorded on the bench.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* View All Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end mt-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/info/employees/list', { state: { cardFilter: 'bench', showBack: true, departmentFilter: selectedDepartments.length > 0 ? selectedDepartments.join(',') : undefined } });
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-all"
                >
                  View All Bench
                  <ArrowRight size={11} />
                </button>
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
              activeTabOverride={highlightsTabOverride}
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
