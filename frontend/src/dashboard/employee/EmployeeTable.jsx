import React, { useEffect, useState } from 'react';
import { ChevronRight, Search, Filter, SquarePen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmployeeStatusTag, { getEmployeeTag } from '../../components/EmployeeStatusTag';
import { normalizeSkillName } from '../../utils/skillTopics';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { deleteEmployee } from '../../api/employeeApi';

// AllocationBar — color matches EmployeeStatusTag palette
const AllocationBar = ({ percentage, status }) => {
    const s = (status || '').toLowerCase().trim();
    let color = 'bg-emerald-500'; // default: Allocated
    if (s.includes('notice')) color = 'bg-red-400';
    else if (s.includes('pip')) color = 'bg-yellow-400';
    else if (s.includes('resign')) color = 'bg-gray-300';
    else if (s === 'bench') color = 'bg-orange-400';
    else if (s === 'partially bench') color = 'bg-blue-400';
    else if (s === 'partially allocated') color = 'bg-purple-400';
    else if (s === 'allocated') color = 'bg-emerald-500';
    else if (percentage > 100) color = 'bg-red-500';
    else if (percentage === 0) color = 'bg-orange-400';

    const displayPercentage = Math.min(percentage, 100);
    return (
        <div className="w-full max-w-[110px]">
            <div className="flex justify-end mb-1">
                <span className="text-[10px] font-bold text-gray-600">{percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${displayPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};

// BillableStatusTag — text-only, no dollar icon
const BillableStatusTag = ({ billable }) => {
    const isBillable = billable === 'billable';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${isBillable
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
            {isBillable ? 'Billable' : 'Non-Billable'}
        </span>
    );
};

// Main EmployeeTable
const EmployeeTable = ({ employees = [], loading = false, onEmployeeClick, onEmployeeEdit, onEmployeeDelete, filters, searchValue, onSearchChange, onFilterClick, contextLabel = 'Employee' }) => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        const saved = sessionStorage.getItem('employeeRowsPerPage');
        return saved ? parseInt(saved, 10) : 15;
    });

    // Count active filters for badge
    const activeFilterCount = [
        ...(filters?.types || []),
        ...(filters?.skills || []),
        ...(filters?.locations || []),
        ...(filters?.statusTags || []),
        ...(filters?.designations || [])
    ].length;

    const employeeHasMatchingSkill = (employeeSkills = [], selectedSkills = []) => {
        if (!selectedSkills.length) return true;

        const normalizedEmployeeSkills = new Set(
            (employeeSkills || []).map((skill) => normalizeSkillName(skill).toLowerCase()).filter(Boolean)
        );

        return selectedSkills.some((skill) => normalizedEmployeeSkills.has(normalizeSkillName(skill).toLowerCase()));
    };

    const filteredEmployees = employees.filter(emp => {
        const sv = filters.search?.toLowerCase().trim();
        const tagLabel = getEmployeeTag(emp.employee_status)?.label?.toLowerCase();
        const matchesSearch = !sv || (
            emp.employee_name?.toLowerCase().includes(sv) ||
            emp.employee_id?.toLowerCase().includes(sv) ||
            emp.role_designation?.toLowerCase().includes(sv) ||
            emp.location?.toLowerCase().includes(sv) ||
            emp.department?.toLowerCase().includes(sv) ||
            tagLabel?.includes(sv) ||
            (emp.employee_allocations !== null && emp.employee_allocations !== undefined && String(emp.employee_allocations).includes(sv)) ||
            (emp.skills && emp.skills.some(skill => skill.toLowerCase().includes(sv)))
        );
        const matchesDept = !filters?.departments?.length || filters.departments.includes(emp.department);
        const matchesLocation = !filters?.locations?.length || filters.locations.includes(emp.location);
        const matchesType = !filters?.types?.length || filters.types.includes(emp.employee_type);
        const matchesSkills = employeeHasMatchingSkill(emp.skills, filters?.skills || []);
        const matchesStatusTag = !filters?.statusTags?.length ||
            filters.statusTags.includes(getEmployeeTag(emp.employee_status)?.label);
        const matchesDesignation = !filters?.designations?.length ||
            filters.designations.includes(emp.role_designation);

        let matchesCardFilter = true;
        if (filters?.cardFilter) {
            if (typeof filters.cardFilter === 'object' && filters.cardFilter.type === 'employee-of-month') {
                matchesCardFilter = emp.employee_id === filters.cardFilter.employeeId;
            } else if (typeof filters.cardFilter === 'string') {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                switch (filters.cardFilter) {
                    case 'billable':
                        matchesCardFilter = (emp.billable || '').toLowerCase() === 'billable'; break;
                    case 'bench':
                        matchesCardFilter = (emp.employee_allocations || 0) <= 0; break;
                    case 'notice': {
                        const s = (emp.employee_status || '').toLowerCase();
                        matchesCardFilter = s.includes('notice') || s.includes('pip'); break;
                    }
                    case 'new-joiner':
                        const joiningDate = emp.date_of_joining ? new Date(emp.date_of_joining) : null;
                        matchesCardFilter = joiningDate && joiningDate >= thirtyDaysAgo; break;
                    case 'top-performer':
                        matchesCardFilter = emp.employee_allocations >= 100; break;
                    default: matchesCardFilter = true;
                }
            }
        }

        return matchesSearch && matchesDept && matchesLocation && matchesType &&
            matchesSkills && matchesCardFilter && matchesStatusTag && matchesDesignation;
    });

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteEmployee(deleteTarget.employee_id);
            if (onEmployeeDelete) onEmployeeDelete(deleteTarget.employee_id);
        } catch (err) {
            console.error('Delete failed', err);
            alert('Failed to delete employee.');
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, itemsPerPage]);

    if (loading) return <div className="p-10 text-center font-medium text-gray-400">Loading Employees...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">{contextLabel} Directory</h3>
                    <span className="text-xs text-gray-400 font-medium">
                        {filteredEmployees.length} {filters?.cardFilter === 'bench' ? 'bench ' : ''}employees
                    </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find an employee or skill..."
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-52 transition-all"
                            value={searchValue || ''}
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                        />
                    </div>

                    {/* Filter Button with badge */}
                    <button
                        onClick={onFilterClick}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all shadow-sm relative ${activeFilterCount > 0
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-200'
                            }`}
                    >
                        <Filter size={18} />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-blue-600 text-[10px] font-bold ml-0.5">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {filters?.cardFilter === 'bench' && (
                        <button
                            onClick={() => navigate('/info/allocation', { state: { showForecastOnly: true, showBack: true } })}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center gap-2"
                        >
                            View Upcoming Bench
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full relative">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Employee</th>
                            <th className="px-6 py-3">Designation</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Allocation</th>
                            <th className="px-6 py-3">Location</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {currentEmployees.length > 0 ? (
                            currentEmployees.map((emp) => (
                                <tr
                                    key={emp.employee_id}
                                    onClick={() => onEmployeeClick && onEmployeeClick(emp)}
                                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-2">
                                        <div className="flex items-center gap-2">
                                            {emp.photo_url ? (
                                                <img
                                                    src={emp.photo_url}
                                                    alt={emp.employee_name}
                                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 uppercase">
                                                    {(emp.employee_name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                </div>
                                            )}
                                            <div className="flex flex-col justify-center">
                                                <span className="font-bold text-gray-800 text-sm">{emp.employee_name}</span>
                                                <span className="text-xs text-gray-500 font-mono">{emp.employee_id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-2">
                                        <div className="text-sm text-gray-700 font-medium">{emp.role_designation}</div>
                                        <div className="text-xs text-gray-400">{emp.department}</div>
                                    </td>
                                    <td className="px-6 py-2">
                                        <div className="flex flex-col gap-1">
                                            <EmployeeStatusTag status={emp.employee_status} />
                                            <BillableStatusTag billable={emp.billable} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-2">
                                        <AllocationBar percentage={emp.employee_allocations || 0} status={emp.employee_status} />
                                    </td>
                                    <td className="px-6 py-2 text-sm text-gray-500 font-medium">{emp.location}</td>
                                    <td className="px-6 py-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onEmployeeEdit && onEmployeeEdit(emp);
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition-colors hover:bg-blue-100"
                                            >
                                                <SquarePen size={13} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setDeleteTarget(emp);
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-100"
                                            >
                                                <Trash2 size={13} />
                                                Delete
                                            </button>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors inline-block" />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                            <Search className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-800">No employees found</p>
                                        <p className="text-xs text-gray-400">Adjust your filters to see more results.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {filteredEmployees.length > 0 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-gray-500">
                            Showing <span className="font-bold text-gray-700">{startIndex + 1}</span> to <span className="font-bold text-gray-700">{Math.min(startIndex + itemsPerPage, filteredEmployees.length)}</span> of <span className="font-bold text-gray-700">{filteredEmployees.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Rows:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setItemsPerPage(val);
                                    sessionStorage.setItem('employeeRowsPerPage', val);
                                    setCurrentPage(1);
                                }}
                                className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 cursor-pointer font-medium"
                            >
                                <option value={15}>15</option>
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-gray-500 font-medium px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                itemName={deleteTarget?.employee_name}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default EmployeeTable;
