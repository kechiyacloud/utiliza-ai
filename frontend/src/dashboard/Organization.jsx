import React, { useState, useEffect, useRef } from 'react';
import { Search, Mail, Phone, MapPin, Briefcase, Calendar, X, BarChart2, Network } from 'lucide-react';
import { getEmployeeList } from '../api/employeeApi';
import { fetchDashboardData } from '../api/dashboardApi';
import OrganizationInsights from './OrganizationInsights';

const Organization = () => {
    const [departments, setDepartments] = useState([]);
    const [activeDeptId, setActiveDeptId] = useState(null);
    const [activeEmployeeId, setActiveEmployeeId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('map'); // 'map' or 'insights'
    const [metrics, setMetrics] = useState(null);
    const [metricsLoading, setMetricsLoading] = useState(false);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const employees = await getEmployeeList();

                // Group employees by department
                const deptMap = {};
                employees.forEach(emp => {
                    const deptName = emp.department || 'Unassigned';
                    if (!deptMap[deptName]) {
                        deptMap[deptName] = {
                            id: deptName.replace(/\s+/g, '-').toUpperCase(),
                            name: deptName,
                            code: deptName.substring(0, 2).toUpperCase(),
                            employees: []
                        };
                    }
                    deptMap[deptName].employees.push({
                        id: emp.employee_id,
                        name: emp.employee_name,
                        role: emp.role_designation,
                        avatar: emp.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employee_name)}`,
                        email: emp.email || 'user@example.com',
                        phone: emp.phone || '+1 234 567 890',
                        location: emp.location || 'New York, USA',
                        status: emp.employee_status || 'Active'
                    });
                });

                const deptArray = Object.values(deptMap).sort((a, b) => a.name.localeCompare(b.name));
                setDepartments(deptArray);

                if (deptArray.length > 0) {
                    setActiveDeptId(deptArray[0].id);
                }

                setLoading(false);
            } catch (err) {
                console.error("Failed to load organization data:", err);
                setError("Failed to load data");
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (viewMode !== 'insights' || metrics || metricsLoading) {
            return;
        }

        let mounted = true;
        const loadInsights = async () => {
            setMetricsLoading(true);
            try {
                const dashboard = await fetchDashboardData();
                if (mounted) {
                    setMetrics(dashboard.data);
                }
            } catch (err) {
                console.error("Failed to load organization insights:", err);
            } finally {
                if (mounted) {
                    setMetricsLoading(false);
                }
            }
        };

        loadInsights();
        return () => {
            mounted = false;
        };
    }, [viewMode, metrics, metricsLoading]);

    // Derived State
    const activeDept = departments.find(d => d.id === activeDeptId);
    const activeEmployee = activeDept?.employees.find(e => e.id === activeEmployeeId);

    // Filter logic
    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="h-full flex items-center justify-center text-slate-400">Loading Tree...</div>;
    if (error) return <div className="h-full flex items-center justify-center text-red-500">{error}</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-20 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Organization Map</h1>
                    <p className="text-slate-500 text-xs">Navigate through the department hierarchy.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Network size={14} />
                            <span>Map</span>
                        </button>
                        <button
                            onClick={() => setViewMode('insights')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'insights' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart2 size={14} />
                            <span>Insights</span>
                        </button>
                    </div>
                    {viewMode === 'map' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search departments..."
                                className="pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 w-56 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 overflow-hidden ${viewMode === 'insights' ? 'overflow-y-auto p-6 bg-slate-50' : ''}`}>
                {viewMode === 'map' ? (
                    <div className="h-full flex items-stretch gap-12 p-8 relative overflow-x-auto overflow-y-hidden custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">

                        {/* COLUMN 1: DEPARTMENTS */}
                        <div className="flex flex-col gap-2 min-w-[260px] w-[260px] z-10 overflow-y-auto pr-2 custom-scrollbar">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 sticky top-0 bg-slate-50/90 backdrop-blur pb-2 z-10">Departments</h3>
                            {filteredDepartments.map((dept) => {
                                const isActive = dept.id === activeDeptId;
                                return (
                                    <div
                                        key={dept.id}
                                        onClick={() => { setActiveDeptId(dept.id); setActiveEmployeeId(null); }}
                                        className={`
                                    relative px-3 py-2 rounded-full border cursor-pointer transition-all duration-300 group flex items-center gap-3
                                    ${isActive
                                                ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-50 scale-[1.02]'
                                                : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm'}
                                `}
                                    >
                                        {/* Badge */}
                                        <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0
                                    ${isActive ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600'}
                                `}>
                                            {dept.code}
                                        </div>
                                        <span className={`text-xs font-bold truncate ${isActive ? 'text-teal-900' : 'text-slate-700'}`}>
                                            {dept.name}
                                        </span>

                                        {/* Connector Dot */}
                                        {isActive && <div className="absolute -right-1.5 top-1/2 w-3 h-3 bg-teal-500 rounded-full translate-x-0 -translate-y-1/2 ring-2 ring-slate-50 z-20"></div>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* VISUAL CONNECTOR LAYER (Fixed for now to show Tree logic) */}
                        {/* Draws a bracket from the "Active Department" to the list of Employees */}
                        <div className="absolute left-[296px] top-12 bottom-0 w-12 pointer-events-none flex flex-col items-center">
                            {/* 
                        Static visualization:
                        A bracket indicating the 'branch' for the list
                     */}
                            {activeDept && (
                                <svg className="w-full h-full overflow-visible" style={{ position: 'absolute', top: 0, left: -20 }}>
                                    <path
                                        d="M 0 50 C 25 50, 25 100, 50 100"
                                        fill="none"
                                        stroke="#14b8a6"
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                        className="opacity-30"
                                    />
                                    <line x1="20" y1="40" x2="20" y2="90%" stroke="#cbd5e1" strokeWidth="1" />
                                </svg>
                            )}
                        </div>


                        {/* COLUMN 2: EMPLOYEES (Conditional) */}
                        {activeDept && (
                            <div className="flex flex-col gap-2 min-w-[280px] w-[280px] animate-fade-in-right z-10 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="sticky top-0 bg-slate-50/90 backdrop-blur pb-2 z-10 flex justify-between items-center mb-2">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {activeDept.name} Members <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full ml-1">{activeDept.employees.length}</span>
                                    </h3>
                                </div>

                                {activeDept.employees.map((emp) => {
                                    const isSelected = emp.id === activeEmployeeId;
                                    return (
                                        <div
                                            key={emp.id}
                                            onClick={() => setActiveEmployeeId(emp.id)}
                                            className={`
                                        relative px-2 py-1.5 rounded-full border cursor-pointer transition-all duration-300 group flex items-center gap-3
                                        ${isSelected
                                                    ? 'bg-white border-teal-500 shadow-lg scale-105 z-20'
                                                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm grayscale hover:grayscale-0 opacity-90 hover:opacity-100'}
                                    `}
                                        >
                                            <img
                                                src={emp.avatar}
                                                alt={emp.name}
                                                className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>{emp.name}</h4>
                                                <p className="text-[10px] text-slate-500 truncate">{emp.role}</p>
                                            </div>

                                            {/* Connector Dot */}
                                            {isSelected && <div className="absolute -right-1.5 top-1/2 w-3 h-3 bg-teal-500 rounded-full translate-x-0 -translate-y-1/2 ring-2 ring-slate-50 z-20"></div>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* VISUAL CONNECTOR LAYER (Emp -> Details) */}
                        <div className="absolute left-[600px] top-12 bottom-0 w-12 pointer-events-none flex flex-col items-center">
                            {activeEmployee && (
                                <svg className="w-full h-full overflow-visible" style={{ position: 'absolute', top: 0, left: -20 }}>
                                    {/* Horizontal connector stub */}
                                    <line x1="20" y1="50%" x2="40" y2="50%" stroke="#14b8a6" strokeWidth="2" />
                                </svg>
                            )}
                        </div>

                        {/* COLUMN 3: DETAILS (Conditional Pop-out) */}
                        {activeEmployee && (
                            <div className="min-w-[320px] w-[320px] animate-fade-in-right z-10 flex flex-col justify-center py-10 scale-95 origin-left">
                                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden sticky top-8">
                                    {/* Valid Green Header */}
                                    <div className="h-20 bg-gradient-to-r from-teal-500 to-emerald-600 relative">
                                        <button
                                            onClick={() => setActiveEmployeeId(null)}
                                            className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors bg-black/10 rounded-full p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="px-5 relative text-center -mt-10 mb-5">
                                        <img
                                            src={activeEmployee.avatar}
                                            alt={activeEmployee.name}
                                            className="w-20 h-20 rounded-full border-4 border-white shadow-md mx-auto object-cover"
                                        />
                                        <h2 className="text-lg font-bold text-slate-800 mt-2">{activeEmployee.name}</h2>
                                        <p className="text-teal-600 font-medium text-xs">{activeEmployee.role}</p>
                                    </div>

                                    <div className="px-5 pb-5 space-y-3">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <p className="text-slate-400 mb-0.5 flex items-center gap-1"><Briefcase size={10} /> Emp ID</p>
                                                <p className="font-semibold text-slate-700">{activeEmployee.id}</p>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <p className="text-slate-400 mb-0.5 flex items-center gap-1"><Calendar size={10} /> Status</p>
                                                <p className="font-semibold text-slate-700">{activeEmployee.status}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                                <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0"><Mail size={12} /></div>
                                                <span className="truncate">{activeEmployee.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                                <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0"><Phone size={12} /></div>
                                                <span>{activeEmployee.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                                <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0"><MapPin size={12} /></div>
                                                <span>{activeEmployee.location}</span>
                                            </div>
                                        </div>

                                        <button className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 mt-1">
                                            View Full Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto">
                        <OrganizationInsights departments={departments} metrics={metrics} loading={metricsLoading} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Organization;
