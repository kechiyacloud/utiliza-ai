import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, Download, Users, Briefcase, Zap, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getEmployeeList } from '../../api/employeeApi';
import EmployeeStatusTag from '../../components/EmployeeStatusTag';
import { normalizeSkillName } from '../../utils/skillTopics';

// Helper function to calculate tenure
const calculateTenure = (joiningDate) => {
    if (!joiningDate) return 'N/A';

    const start = new Date(joiningDate);
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years === 0 && months === 0) {
        return 'Less than 1 month';
    }

    const yearStr = years > 0 ? `${years} Yr${years > 1 ? 's' : ''}` : '';
    const monthStr = months > 0 ? `${months} Mo${months > 1 ? 's' : ''}` : '';

    return [yearStr, monthStr].filter(Boolean).join(' ');
};

const StatCard = ({ icon: Icon, value, label, colorTheme = 'blue' }) => {
    const themeStyles = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' }
    };
    const theme = themeStyles[colorTheme] || themeStyles.blue;

    return (
        <div className={`bg-white p-4 rounded-2xl shadow-sm border ${theme.border} flex flex-col items-start relative overflow-hidden flex-1`}>
            <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-3xl opacity-20 ${theme.bg}`}></div>
            <div className="flex w-full items-start justify-between z-10 mb-2">
                <div className={`p-1.5 rounded-lg ${theme.bg} ${theme.text}`}>
                    <Icon size={20} strokeWidth={2.5} />
                </div>
            </div>
            <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">{value || 0}</h3>
                <p className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">{label}</p>
            </div>
        </div>
    );
};


export default function EmployeeMasterList() {
    const navigate = useNavigate();
    const location = useLocation();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first
    const [filterLabel, setFilterLabel] = useState("");

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const data = await getEmployeeList();
                // Sort by date of joining (newest first by default)
                const sorted = [...data].sort((a, b) => {
                    const dateA = a.date_of_joining ? new Date(a.date_of_joining) : new Date(0);
                    const dateB = b.date_of_joining ? new Date(b.date_of_joining) : new Date(0);
                    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                });

                // Filter logic
                const cardFilter = location.state?.cardFilter;
                const deptFilter = location.state?.departmentFilter;
                const searchTerm = String(location.state?.search || '').trim().toLowerCase();
                
                let filtered = [...sorted];
                let label = "";

                if (deptFilter) {
                    filtered = filtered.filter(emp => emp.department === deptFilter);
                    label += ` (${deptFilter})`;
                }

                if (cardFilter === 'bench') {
                    filtered = filtered.filter(emp => (emp.employee_status || '').toLowerCase() === 'bench' && (!emp.employee_status || !emp.employee_status.toLowerCase().includes('notice')));
                    label += " - Bench Only";
                } else if (cardFilter === 'billable') {
                    filtered = filtered.filter(emp => emp.billable === 'billable' && (!emp.employee_status || !emp.employee_status.toLowerCase().includes('notice')));
                    label += " - Billable Only";
                }

                if (searchTerm) {
                    filtered = filtered.filter((emp) => {
                        const normalizedSkills = (emp.skills || []).map((skill) => normalizeSkillName(skill).toLowerCase());
                        return (
                            (emp.employee_name || '').toLowerCase().includes(searchTerm) ||
                            (emp.employee_id || '').toLowerCase().includes(searchTerm) ||
                            (emp.role_designation || '').toLowerCase().includes(searchTerm) ||
                            (emp.department || '').toLowerCase().includes(searchTerm) ||
                            (emp.location || '').toLowerCase().includes(searchTerm) ||
                            normalizedSkills.some((skill) => skill.includes(searchTerm))
                        );
                    });
                    label += ` - Search: ${location.state?.search}`;
                }

                setEmployees(filtered);
                setFilterLabel(label);
            } catch (err) {
                console.error("Error fetching employees:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, [sortOrder, location.state?.cardFilter, location.state?.departmentFilter, location.state?.search]);

    const stats = React.useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        return {
            total: employees.length,
            onProjects: employees.filter(emp => (emp.billable || '').toLowerCase() === 'billable').length,
            onBench: employees.filter(emp => (emp.employee_status || '').toLowerCase() === 'bench').length,
            newJoiners: employees.filter(emp => {
                const joiningDate = emp.date_of_joining ? new Date(emp.date_of_joining) : null;
                return joiningDate && joiningDate >= thirtyDaysAgo;
            }).length
        };
    }, [employees]);

    const contextLabel = location.state?.departmentFilter ? 'Team' : 'Organization';

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    if (loading) {
        return (
            <div className="p-6 h-full flex items-center justify-center">
                <p className="text-gray-400 text-lg">Loading {contextLabel.toLowerCase()} records...</p>
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-fade-in overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    {location.state?.showBack && (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {contextLabel} Master List{filterLabel}
                        </h1>
                        <p className="text-gray-500 text-sm">A full list of employees showing when they started.</p>
                    </div>
                </div>
                <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                    {contextLabel === 'Team' ? 'Team Size' : 'Total Talent'}: <span className="text-gray-800 font-bold">{employees.length}</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                <StatCard 
                    icon={Users} 
                    value={stats.total} 
                    label={`Total ${contextLabel === 'Team' ? 'Team' : 'Talent'}`} 
                    colorTheme="slate" 
                />
                <StatCard 
                    icon={Briefcase} 
                    value={stats.onProjects} 
                    label="On Projects" 
                    colorTheme="blue" 
                />
                <StatCard 
                    icon={Zap} 
                    value={stats.onBench} 
                    label="Available Now" 
                    colorTheme="rose" 
                />
                <StatCard 
                    icon={TrendingUp} 
                    value={stats.newJoiners} 
                    label="Joined Recently" 
                    colorTheme="emerald" 
                />
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">

                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                            <tr className="text-xs text-gray-600 uppercase tracking-wider">
                                <th className="py-3 pl-6 font-bold">Employee Details</th>
                                <th className="py-3 font-bold">Role & Department</th>
                                <th className="py-3 font-bold">Location</th>
                                <th className="py-3 pr-6 font-bold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, index) => {
                                const initials = emp.employee_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '??';
                                const joiningDate = emp.date_of_joining ? new Date(emp.date_of_joining) : null;

                                return (
                                    <tr
                                        key={emp.employee_id || index}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Employee Details */}
                                        <td className="py-3 pl-6">
                                            <div className="flex items-center gap-3">
                                                {emp.photo_url ? (
                                                    <img
                                                        src={emp.photo_url}
                                                        alt={emp.employee_name}
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                        {initials}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-gray-800 text-sm font-semibold">{emp.employee_name || 'N/A'}</div>
                                                    <div className="text-gray-500 text-xs">{emp.employee_id || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role & Department */}
                                        <td className="py-3">
                                            <div className="text-gray-800 text-sm font-medium">{emp.role_designation || 'N/A'}</div>
                                            <div className="text-gray-500 text-xs">{emp.department || 'N/A'}</div>
                                        </td>

                                        {/* Location */}
                                        <td className="py-3 text-gray-600 text-sm">
                                            {emp.location || 'N/A'}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 pr-6 text-right">
                                            <EmployeeStatusTag status={emp.employee_status} billable={emp.billable} size="sm" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {employees.length === 0 && (
                        <div className="p-10 text-center text-gray-400">
                            No employees found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
