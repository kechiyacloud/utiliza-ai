import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserCheck, Activity, UserMinus, Search, Filter } from 'lucide-react';
import { getEmployeeList } from '../../api/employeeApi';
import EmployeeTable from './EmployeeTable';
import FilterOverlay from './FilterOverlay';

const ResourceHighlights = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Get params from state
    const cardType = location.state?.cardType || 'total';
    const departmentFilter = location.state?.departmentFilter || [];
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
                const data = await getEmployeeList();
                setAllEmployees(data);
            } catch (err) {
                setError(err.message || 'Failed to load resources');
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

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
            <div className="flex items-center gap-4 mb-2">
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
                        <p className="text-sm text-gray-500">{pageConfig.description}</p>
                    </div>
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

            {/* Main Table Section */}
            <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <EmployeeTable
                    employees={allEmployees}
                    loading={loading}
                    filters={filters}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onEmployeeClick={(emp) => navigate(`/info/employee/${emp.employee_id}`, { state: { employee: emp } })}
                    onEmployeeEdit={(emp) => navigate('/info/employee/add', { state: { editData: emp, editEmployeeId: emp.employee_id, isEditMode: true } })}
                    onFilterClick={() => setIsFilterOpen(true)}
                />
            </div>
        </div>
    );
};

export default ResourceHighlights;
