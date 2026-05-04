import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, UserCheck, Activity, UserMinus, AlertCircle, Search, Filter, Award } from 'lucide-react';
import { getEmployeeList } from '../../api/employeeApi';
import { useDataRefresh } from '../../context';
import EmployeeTable from './EmployeeTable';
import FilterOverlay from './FilterOverlay';

const ResourceHighlights = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const { refreshKey } = useDataRefresh();

    // Get params from state
    const [searchParams] = useSearchParams();
    
    // Get params from URL first, then state
    const cardType = searchParams.get('type') || location.state?.cardType || 'total';
    const departmentParam = searchParams.get('dept');
    const departmentFilter = departmentParam ? departmentParam.split(',') : (location.state?.departmentFilter || []);
    const fromDashboard = location.state?.fromDashboard || false;

    // Local filters for the table
    const [filters, setFilters] = useState({
        departments: Array.isArray(departmentFilter) ? departmentFilter : (departmentFilter ? [departmentFilter] : []),
        types: [],
        skills: [],
        locations: [],
        statusTags: [],
        designations: [],
        cardFilter: cardType === 'total' ? null : cardType
    });

    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const data = await getEmployeeList(refreshKey > 0);
                setAllEmployees(data);
            } catch (err) {
                setError(err.message || 'Failed to load resources');
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, [refreshKey]);

    const pageConfig = useMemo(() => {
        switch (cardType) {
            case 'billable':
                return {
                    title: 'Billable Headcount',
                    icon: UserCheck,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    description: 'See team members currently on billable engagements.'
                };
            case 'non-billable':
                return {
                    title: 'Non-Billable Headcount',
                    icon: Activity,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    description: 'See internal and shared operations resources.'
                };
            case 'bench':
                return {
                    title: 'Bench Headcount',
                    icon: UserMinus,
                    color: 'text-rose-600',
                    bg: 'bg-rose-50',
                    description: 'See team members available for new projects.'
                };
            case 'overallocated':
                return {
                    title: 'Overallocated Resources',
                    icon: AlertCircle,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                    description: 'See team members with allocation exceeding 100%.'
                };
            case 'new-joiner':
                return {
                    title: 'New Joiners',
                    icon: Users,
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                    description: 'See team members who joined in the last 30 days.'
                };
            case 'certifications':
                return {
                    title: 'Certified Employees',
                    icon: Award,
                    color: 'text-teal-600',
                    bg: 'bg-teal-50',
                    description: 'See team members with professional certifications.'
                };
            default:
                return {
                    title: 'Resource Overview',
                    icon: Users,
                    color: 'text-slate-600',
                    bg: 'bg-slate-50',
                    description: 'See comprehensive workforce distribution.'
                };
        }
    }, [cardType]);

    const contextLabel = filters.departments.length > 0 ? filters.departments.join(', ') : 'Across Organization';

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.departments.length > 0) count++;
        if (filters.types.length > 0) count++;
        if (filters.skills.length > 0) count++;
        if (filters.locations.length > 0) count++;
        if (filters.statusTags.length > 0) count++;
        if (filters.designations.length > 0) count++;
        return count;
    }, [filters]);

    if (loading && !allEmployees.length) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/25 border-t-blue-500"></div>
                    <p className="text-sm font-medium text-slate-500 tracking-wide">Loading detailed view...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto bg-slate-50">
            {/* Header - Matches Allocations.jsx Forecast View */}
            <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-lg ${pageConfig.bg} ${pageConfig.color} shadow-sm border border-white/50`}>
                            <pageConfig.icon size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{contextLabel} {pageConfig.title}</h1>
                            <p className="text-sm font-medium text-gray-500">{pageConfig.description}</p>
                        </div>
                    </div>
                </div>

                {/* Integrated Search & Filter in Header */}
                <div className="flex items-center gap-3">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-80 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all shadow-sm ${activeFilterCount > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <Filter size={17} />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-blue-600 text-[10px] font-bold ml-0.5">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Overlay */}
            <FilterOverlay
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onFilterChange={setFilters}
                employees={allEmployees}
            />

            {/* Content Section */}
            <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {cardType === 'certifications' ? (
                    <div className="flex flex-col gap-6">
                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allEmployees
                                .filter(emp => {
                                    if ((emp.cert_count || 0) <= 0) return false;
                                    const sv = searchQuery.toLowerCase().trim();
                                    const matchesSearch = !sv || (
                                        emp.employee_name?.toLowerCase().includes(sv) ||
                                        emp.employee_id?.toLowerCase().includes(sv) ||
                                        emp.cert_list?.some(c => c.toLowerCase().includes(sv))
                                    );
                                    const matchesDept = !filters.departments.length || filters.departments.includes(emp.department);
                                    return matchesSearch && matchesDept;
                                })
                                .map((emp) => (
                                    <div 
                                        key={emp.employee_id}
                                        onClick={() => navigate(`/info/employee/${emp.employee_id}`)}
                                        className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-100 transition-all cursor-pointer flex items-start gap-4"
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                                <Award size={20} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight truncate group-hover:text-teal-600 transition-colors">
                                                {emp.employee_name}
                                            </h3>
                                            <div className="mt-2 flex flex-col gap-1">
                                                {(emp.cert_list || []).slice(0, 2).map((cert, idx) => (
                                                    <p key={idx} className="text-[11px] font-bold text-teal-600 leading-snug line-clamp-1">
                                                        {cert}
                                                    </p>
                                                ))}
                                                {(emp.cert_list || []).length > 2 && (
                                                    <div className="mt-1">
                                                        <span className="inline-flex px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-bold uppercase tracking-widest border border-teal-100/50">
                                                            +{(emp.cert_list || []).length - 2} MORE CERTIFICATES
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        
                        {allEmployees.filter(emp => (emp.cert_count || 0) > 0).length === 0 && (
                            <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                No certified employees found
                            </div>
                        )}
                    </div>
                ) : (
                    <EmployeeTable
                        employees={allEmployees}
                        loading={loading}
                        filters={filters}
                        searchValue={searchQuery}
                        onSearchChange={setSearchQuery}
                        onEmployeeClick={(emp) => navigate(`/info/employee/${emp.employee_id}`, { state: { employee: emp } })}
                        onEmployeeEdit={(emp) => navigate('/info/employee/add', { state: { editData: emp, editEmployeeId: emp.employee_id, isEditMode: true } })}
                        onFilterClick={() => setIsFilterOpen(true)}
                        hideControls={true}
                    />
                )}
            </div>
        </div>
    );
};

export default ResourceHighlights;
