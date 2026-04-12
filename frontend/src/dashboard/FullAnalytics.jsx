import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogoAsBase64, buildPDFHeader } from '../utils/exportUtils';
import cdBlueLogo from '../assets/CD-Blue.svg';
import { 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  Users, 
  Clock, 
  Award,
  Calendar,
  Target,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { fetchDashboardData, exportRiskBoard } from '../api/dashboardApi';
import { fetchPossibleProjects } from '../api/allocationApi';
import PossibleProjectMatches from './allocation/PossibleProjectMatches';
import { getSkillTopic } from '../utils/skillTopics';
import { getEmployeeList } from '../api/employeeApi';

const FullAnalytics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(location.state?.departmentFilter || 'Overall');
  
  // Project Matching State
  const [selectedEmpForProjects, setSelectedEmpForProjects] = useState(null);
  const [possibleProjects, setPossibleProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState(['Overall']);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetchDashboardData(false, selectedDept);
        setData(res?.data);
      } catch (error) {
        console.error("Failed to load analytics data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedDept]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const employees = await getEmployeeList();
        const departments = [...new Set((employees || []).map((employee) => employee.department).filter(Boolean))].sort();
        setDepartmentOptions(['Overall', ...departments]);
      } catch (error) {
        console.error('Failed to load departments for analytics filter', error);
      }
    };
    loadDepartments();
  }, []);

  const handleEmployeeClick = async (employee) => {
    setSelectedEmpForProjects(employee);
    setLoadingProjects(true);
    try {
      // Map analytics structure to what possible projects expects
      const empData = {
          employee_id: employee.id || employee.employee_id,
          employee_name: employee.name || employee.employee_name
      };
      const projects = await fetchPossibleProjects(empData.employee_id);
      setPossibleProjects(projects);
    } catch (error) {
      console.error("Failed to load possible projects", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Analyzing resource intelligence...</p>
        </div>
      </div>
    );
  }

  const executiveMetrics = data?.executiveMetrics || {};
  const benchAging = executiveMetrics?.bench_aging || [];
  const trends = executiveMetrics?.utilization_trends || [];
  const recentTrends = trends.slice(-3);
  const availability = data?.resourceAvailability || [];
  const skillsGap = data?.skillsGap || [];
  const transitions = data?.recentTransitions || [];

  const groupedSkills = Object.values(skillsGap.reduce((acc, item) => {
    const topic = getSkillTopic(item.skill);
    if (!acc[topic]) {
      acc[topic] = {
        topic,
        allocated: 0,
        availability: 0,
        items: []
      };
    }

    acc[topic].allocated += item.allocated || 0;
    acc[topic].availability += item.availability || 0;
    acc[topic].items.push(item);
    return acc;
  }, {})).sort((left, right) => {
    const delta = (right.allocated + right.availability) - (left.allocated + left.availability);
    if (delta !== 0) return delta;
    return left.topic.localeCompare(right.topic);
  });

  // Risk Categories for Table
  const criticalBench = benchAging.filter(h => h.days > 30);
  const moderateBench = benchAging.filter(h => h.days > 15 && h.days <= 30);
  const stableBench = benchAging.filter(h => h.days <= 15);

  const benchRiskData = [
    { name: 'Critical (>30d)', value: criticalBench.length, color: '#ef4444' },
    { name: 'Moderate (15-30d)', value: moderateBench.length, color: '#f59e0b' },
    { name: 'Stable (<15d)', value: stableBench.length, color: '#10b981' },
  ].filter(d => d.value > 0);

  const analyticsHighlights = [
    { label: 'Total Workforce', value: executiveMetrics?.total_employees || 0, tone: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'Bench Risk Cases', value: criticalBench.length, tone: 'bg-rose-50 text-rose-600 border-rose-100' },
    { label: 'Recent Moves', value: transitions.length, tone: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { label: 'Top Skill Allocated', value: skillsGap[0]?.skill || 'None', tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  ];

  const handleExportAnalytics = async () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const BRAND_BLUE = [59, 169, 251];

      const logoBase64 = await loadLogoAsBase64(cdBlueLogo);
      const subtitle = `Department: ${selectedDept}  |  Generated: ${new Date().toLocaleString('en-GB')}`;
      let y = buildPDFHeader(doc, logoBase64, 'Workforce Pulse Analytics', subtitle);

      // Highlights summary section
      const pageW = doc.internal.pageSize.getWidth();
      const cardW = (pageW - 28 - 9) / 4; // 4 cards with gaps

      analyticsHighlights.forEach((item, i) => {
        const x = 14 + i * (cardW + 3);
        doc.setFillColor(245, 250, 255);
        doc.setDrawColor(...BRAND_BLUE);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardW, 16, 2, 2, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label.toUpperCase(), x + cardW / 2, y + 5.5, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(String(item.value), x + cardW / 2, y + 13, { align: 'center' });
      });

      y += 22;

      // Section title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Employee Transitions', 14, y);
      y += 5;

      // Transitions table
      const tableRows = transitions.map((t) => [
        t.employee || '',
        t.role || '',
        t.fromProject || '',
        t.toProject || '',
        t.date ? new Date(t.date).toLocaleDateString('en-GB') : 'TBD',
      ]);

      autoTable(doc, {
        head: [['Employee', 'Role', 'From Project', 'To Project', 'Date']],
        body: tableRows,
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        margin: { left: 14, right: 14, bottom: 18 },
      });

      doc.save(`workforce-pulse-analytics-${selectedDept}.pdf`);
    } catch (error) {
      console.error('Failed to export analytics PDF', error);
      alert('Failed to export analytics PDF.');
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-8">
      {/* Header */}
      <div className="mb-10 rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <button 
              onClick={() => navigate(-1)}
              className="mt-1 p-3 hover:bg-white hover:shadow-lg rounded-2xl transition-all bg-sky-50 text-sky-700 border border-sky-100"
              title="Go Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="mb-3 inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-sky-700">
                Workforce Pulse
              </p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight md:text-4xl">Workforce Pulse Analytics</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium text-slate-500">
                Strategic workforce signals for <span className="font-black text-slate-700">{selectedDept}</span>, with faster visibility into releases, bench pressure, transitions, and availability coverage.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-4 lg:items-end">
            <div className="flex items-center gap-4">
              <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                <select 
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-transparent px-4 py-2 text-xs font-black text-slate-700 outline-none cursor-pointer uppercase tracking-wider"
                >
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleExportAnalytics} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95">
                <Download size={18} />
                Export Data
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Releases</p>
                <p className="mt-1 text-xl font-black text-slate-900">{availability.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Skills</p>
                <p className="mt-1 text-xl font-black text-slate-900">{skillsGap.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">3M Trend</p>
                <p className="mt-1 text-xl font-black text-slate-900">{recentTrends.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {analyticsHighlights.map((item) => (
          <div key={item.label} className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)]">
            <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-slate-100/70 blur-2xl"></div>
            <p className="relative mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <div className={`relative inline-flex rounded-2xl border px-3 py-1.5 text-sm font-black ${item.tone}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
        
        {/* Release Forecast (Bar) */}
        <div className="xl:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Resource Release Forecast</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee roll-offs in next 30 days</p>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={availability} layout="vertical" margin={{ left: 24, right: 12, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  width={150}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                />
                <Bar dataKey="availability" name="Availability %" radius={[0, 8, 8, 0]} fill="#3b82f6" barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution (Pie + Table) */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Risk Stagnation</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bench aging risk distribution</p>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="h-48 w-full">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                    <Pie
                        data={benchRiskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={10}
                        dataKey="value"
                    >
                        {benchRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                    />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex justify-between">
                    Risk Breakdown
                    <span>{benchAging.length} Staff</span>
                </h4>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                    {benchRiskData.map((risk, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-tight flex items-center gap-2" style={{ color: risk.color }}>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: risk.color }}></div>
                                    {risk.name}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">{risk.value} resources</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {(risk.name.includes('Critical') ? criticalBench : risk.name.includes('Moderate') ? moderateBench : stableBench).slice(0, 5).map((r, i) => (
                                    <span key={i} className="text-[9px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                        {r.name}
                                    </span>
                                ))}
                                {(risk.name.includes('Critical') ? criticalBench : risk.name.includes('Moderate') ? moderateBench : stableBench).length > 5 && (
                                    <span className="text-[9px] font-bold text-slate-400 px-2 py-0.5">
                                        +{ (risk.name.includes('Critical') ? criticalBench : risk.name.includes('Moderate') ? moderateBench : stableBench).length - 5 } more
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>

        {/* Utilization History (Area) */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <TrendingUp size={20} />
            </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Utilization Trend</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previous 3 months operational trajectory</p>
              </div>
            </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={recentTrends}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="value" name="Utilization %" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Equilibrium by Topic */}
        <div className="xl:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Certification Equilibrium</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Topic-level coverage with expandable subskills</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {groupedSkills.length > 0 ? (showAllTopics ? groupedSkills : groupedSkills.slice(0, 4)).map((group) => {
              const isExpanded = expandedTopic === group.topic;
              return (
                <div key={group.topic} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70">
                    <button
                      type="button"
                      onClick={() => setExpandedTopic((current) => current === group.topic ? null : group.topic)}
                      className="flex w-full items-center justify-between px-4 py-4 text-left"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-900">{group.topic}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{group.items.length} subskills</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Allocated</p>
                          <p className="text-base font-black text-slate-900">{group.allocated}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right shadow-sm">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-500">Availability</p>
                          <p className="text-base font-black text-emerald-700">{group.availability}</p>
                        </div>
                        {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-white px-4 py-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {group.items.sort((left, right) => right.allocated - left.allocated).map((item) => (
                            <div key={`${group.topic}-${item.skill}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{item.skill}</p>
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Subskill</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-slate-900">{item.allocated} / {item.availability}</p>
                                  <p className="text-[10px] font-medium text-slate-500">Allocated / Availability</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            }) : (
              <div className="h-[320px] flex flex-col items-center justify-center opacity-30">
                <Award size={64} className="mb-4" />
                <p className="font-black text-sm uppercase tracking-widest">No Competency Data</p>
              </div>
            )}
            {groupedSkills.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllTopics((current) => !current)}
                className="mt-2 self-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 transition-colors hover:bg-slate-50"
              >
                {showAllTopics ? 'View Less' : 'View More'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Bench Optimization & Matching Panel */}
      <div className="flex flex-col xl:flex-row gap-8 mb-12">
          {/* Main Table */}
          <div className={`bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 overflow-hidden transition-all duration-500 ${selectedEmpForProjects ? 'xl:w-2/3' : 'w-full'}`}>
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                    <Users size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Bench Optimization Engine</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Identify top project matches for bench resources</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto h-[450px] custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="pb-5 px-6">Strategic Resource</th>
                        <th className="pb-5 px-6">Bench Duration</th>
                        <th className="pb-5 px-6 text-center">Risk Status</th>
                        <th className="pb-5 px-6 text-right">Optimization</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {benchAging.length > 0 ? benchAging.map((row, idx) => {
                        const isSelected = selectedEmpForProjects?.name === row.name || selectedEmpForProjects?.employee_name === row.name;
                        return (
                            <tr key={idx} className={`group hover:bg-slate-50/50 transition-all cursor-pointer ${isSelected ? 'bg-blue-50/30' : ''}`} onClick={() => handleEmployeeClick(row)}>
                                <td className="py-6 px-6">
                                    <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm border border-slate-200 group-hover:bg-white group-hover:shadow-md transition-all">
                                        {row.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="font-bold text-slate-800 tracking-tight text-base">{row.name}</span>
                                    </div>
                                </td>
                                <td className="py-6 px-6 font-mono font-bold text-slate-600 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-slate-300" />
                                        {row.days} Days
                                    </div>
                                </td>
                                <td className="py-6 px-6 text-center">
                                    <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase border shadow-sm ${row.days > 30 ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50' : row.days > 15 ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-50' : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50'}`}>
                                    {row.days > 30 ? 'Critical' : row.days > 15 ? 'Moderate' : 'Stable'}
                                    </span>
                                </td>
                                <td className="py-6 px-6 text-right">
                                    <button className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${isSelected ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                                    {isSelected ? 'View Matches' : 'Find Project'}
                                    </button>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan="4" className="py-20 text-center opacity-30">
                                <Users size={64} className="mx-auto mb-4" />
                                <p className="text-sm font-black uppercase tracking-[0.2em]">Engine idle: No resources on bench</p>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
          </div>

          {/* Project Matches Panel */}
          {selectedEmpForProjects && (
              <div className="xl:w-1/3 animate-in fade-in slide-in-from-right-8 duration-500">
                  <PossibleProjectMatches 
                    employee={{
                        employee_name: selectedEmpForProjects.name || selectedEmpForProjects.employee_name,
                        employee_id: selectedEmpForProjects.id || selectedEmpForProjects.employee_id
                    }}
                    projects={possibleProjects}
                    loading={loadingProjects}
                    onClose={() => setSelectedEmpForProjects(null)}
                  />
                  <div className="mt-4 p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative z-10">
                          <h4 className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-widest text-[10px] mb-2">
                              <Target size={14} /> Intelligence Note
                          </h4>
                          <p className="text-xs font-medium leading-relaxed text-slate-300">
                              Matching is based on skill overlap, project criticality, and recent role transitions. 80%+ score indicates an ideal immediate deployment target.
                          </p>
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Transitions Table</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project movement history with from and to details</p>
          </div>
          <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {transitions.length} moves
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="py-3 pr-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">From</th>
                <th className="py-3 px-4">To</th>
                <th className="py-3 pl-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {transitions.length > 0 ? transitions.map((transition) => (
                <tr key={transition.id} className="border-b border-slate-50 text-sm text-slate-700">
                  <td className="py-4 pr-4 font-bold text-slate-900">{transition.employee}</td>
                  <td className="py-4 px-4 text-slate-500">{transition.role}</td>
                  <td className="py-4 px-4">
                    <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{transition.fromProject}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">{transition.toProject}</span>
                  </td>
                  <td className="py-4 pl-4 text-right text-slate-400">
                    {transition.date ? new Date(transition.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-sm font-bold text-slate-400">
                    No recent transitions found for this department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FullAnalytics;
