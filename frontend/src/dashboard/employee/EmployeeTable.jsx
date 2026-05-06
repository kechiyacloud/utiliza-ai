import React, { useEffect, useState, useMemo } from 'react';
import { ChevronRight, Search, Filter, SquarePen, Trash2, ArrowUpDown, Check, Undo2, Download, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmployeeStatusTag, { getEmployeeTag } from '../../components/EmployeeStatusTag';
import { normalizeSkillName } from '../../utils/skillTopics';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { deleteEmployee, restoreEmployee } from '../../api/employeeApi';
import ExportPreviewModal from './ExportPreviewModal';

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
                <span className="text-[10px] font-semibold text-gray-600">
                    {percentage === 0 ? 'No Allocation' : `${percentage}%`}
                </span>
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
const EmployeeTable = ({ employees = [], loading = false, onEmployeeClick, onEmployeeEdit, onEmployeeDelete, onRestore, showArchived, filters, searchValue, onSearchChange, onFilterClick, hideControls = false }) => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        const saved = localStorage.getItem('employeeRowsPerPage');
        return saved ? parseInt(saved, 10) : 15;
    });
    const [showExportModal, setShowExportModal] = useState(false);

    // Count active filters for badge
    const activeFilterCount = [
        ...(filters?.types || []),
        ...(filters?.skills || []),
        ...(filters?.locations || []),
        ...(filters?.statusTags || []),
        ...(filters?.designations || [])
    ].length;

    // Sort State with "Long Term Memory" (localStorage)
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('employee_sort_config');
        return saved ? JSON.parse(saved) : { key: 'employee_name', direction: 'asc', label: 'Name (A-Z)' };
    });

    useEffect(() => {
        localStorage.setItem('employee_sort_config', JSON.stringify(sortConfig));
    }, [sortConfig]);

    const sortOptions = [
        { key: 'employee_name', direction: 'asc', label: 'Name (A-Z)' },
        { key: 'employee_name', direction: 'desc', label: 'Name (Z-A)' },
        { key: 'employee_allocations', direction: 'desc', label: 'Allocation: High-to-Low' },
        { key: 'employee_allocations', direction: 'asc', label: 'Allocation: Low-to-High' },
        { key: 'date_of_joining', direction: 'desc', label: 'Joined: Newest First' },
        { key: 'date_of_joining', direction: 'asc', label: 'Joined: Oldest First' }
    ];

    // 1. First apply all filtering logic
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            // A. Search Query matching
            const sv = (searchValue || '').toLowerCase().trim();
            const matchesSearch = !sv || (
                emp.employee_name?.toLowerCase().includes(sv) ||
                emp.employee_id?.toLowerCase().includes(sv) ||
                emp.role_designation?.toLowerCase().includes(sv) ||
                emp.location?.toLowerCase().includes(sv) ||
                emp.department?.toLowerCase().includes(sv) ||
                (emp.skills && emp.skills.some(skill => skill.toLowerCase().includes(sv)))
            );
            if (!matchesSearch) return false;

            // B. Filter drawer and Department selection
            const matchesDept = !filters?.departments?.length || filters.departments.includes(emp.department);
            const matchesType = !filters?.types?.length || filters.types.includes(emp.employee_type);
            const matchesLocation = !filters?.locations?.length || filters.locations.includes(emp.location);
            const matchesDesig = !filters?.designations?.length || filters.designations.includes(emp.role_designation);
            
            // Skill matching with normalization
            const matchesSkills = !filters?.skills?.length || filters.skills.some(fs => 
                emp.skills?.some(es => normalizeSkillName(es).toLowerCase() === normalizeSkillName(fs).toLowerCase())
            );

            // Status tag filtering (matches FilterOverlay logic)
            const matchesStatus = !filters?.statusTags?.length || (
                emp.employee_status && filters.statusTags.includes(getEmployeeTag(emp.employee_status).label)
            );

            if (!(matchesDept && matchesType && matchesLocation && matchesDesig && matchesStatus && matchesSkills)) {
                return false;
            }

            // C. Special Card Filters (from Dashboard redirects)
            const cf = filters?.cardFilter;
            if (cf) {
                const s = (emp.employee_status || '').toLowerCase();
                const isNoticeOrPip = s.includes('notice') || s.includes('pip');

                if (cf === 'bench') return !isNoticeOrPip && (emp.employee_allocations || 0) <= 0;
                if (cf === 'billable') return !isNoticeOrPip && emp.billable === 'billable' && (emp.employee_allocations || 0) > 0;
                if (cf === 'non-billable') return !isNoticeOrPip && emp.billable === 'non-billable' && (emp.employee_allocations || 0) > 0;
                if (cf === 'notice') return isNoticeOrPip;
                if (cf === 'overallocated') return (emp.employee_allocations || 0) > 100;
                if (cf === 'certifications') return (emp.cert_count || 0) > 0;
                if (cf === 'new-joiner') {
                    const now = new Date();
                    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    const joinDate = emp.date_of_joining ? new Date(emp.date_of_joining) : null;
                    const isLeaving = isNoticeOrPip || emp.date_of_resign;
                    return joinDate && joinDate >= thirtyDaysAgo && !isLeaving;
                }
            }

            return true;
        });
    }, [employees, filters, searchValue]);

    // 2. Then sort the filtered list
    const sortedEmployees = useMemo(() => {
        const sortableItems = [...filteredEmployees];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Handle nulls / N/A
                const isAEmpty = aVal === undefined || aVal === null || String(aVal).trim() === '' || String(aVal).trim().toLowerCase() === 'n/a';
                const isBEmpty = bVal === undefined || bVal === null || String(bVal).trim() === '' || String(bVal).trim().toLowerCase() === 'n/a';
                if (isAEmpty && isBEmpty) return 0;
                if (isAEmpty) return 1;
                if (isBEmpty) return -1;

                // Date logic
                if (sortConfig.key === 'date_of_joining') {
                    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                    return a.employee_name.localeCompare(b.employee_name);
                }

                // Numeric vs String
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }

                const sA = String(aVal).toLowerCase();
                const sB = String(bVal).toLowerCase();
                return sortConfig.direction === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
            });
        }
        return sortableItems;
    }, [filteredEmployees, sortConfig]);

    const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentEmployees = sortedEmployees.slice(startIndex, startIndex + itemsPerPage);

    const handleDelete = async (permanent = false) => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteEmployee(deleteTarget.employee_id, permanent);
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
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">Organization Directory</h3>
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                        {sortedEmployees.length} employees
                    </span>
                </div>
                {!hideControls && (
                    <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find an employee or skill"
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-80 transition-all font-poppins"
                            value={searchValue || ''}
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all shadow-sm ${isSortOpen ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <ArrowUpDown size={18} className="text-gray-400" />
                            Sort
                        </button>
                        {isSortOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort Order</p>
                                </div>
                                <div className="py-1">
                                    {sortOptions.map((opt) => (
                                        <button
                                            key={opt.label}
                                            onClick={() => {
                                                setSortConfig(opt);
                                                setIsSortOpen(false);
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                        >
                                            <span className={sortConfig.label === opt.label ? 'font-bold text-blue-600' : ''}>{opt.label}</span>
                                            {sortConfig.label === opt.label && <Check size={14} className="text-blue-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {isSortOpen && <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />}
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
                            onClick={() => navigate('/info/allocation#forecast-bench', { state: { showBack: true } })}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center gap-2 border border-orange-200"
                        >
                            <TrendingUp size={14} />
                            View Upcoming Bench
                        </button>
                    )}

                    {/* Export Button */}
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-all shadow-sm"
                        title="Export Filtered List"
                    >
                        <Download size={18} />
                        Export
                    </button>
                </div>
            )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full relative">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Employee</th>
                            {filters?.cardFilter !== 'certifications' ? (
                                <>
                                    <th className="px-6 py-3">Designation</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Allocation</th>
                                    <th className="px-6 py-3">Location</th>
                                </>
                            ) : (
                                <th className="px-6 py-3">Certifications</th>
                            )}
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {currentEmployees.length > 0 ? (
                            currentEmployees.map((emp) => {
                                const isArchived = emp.date_of_resign || emp.is_deleted;

                                return (
                                    <tr
                                        key={emp.employee_id}
                                        onClick={() => onEmployeeClick && onEmployeeClick(emp)}
                                        className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${isArchived ? 'bg-gray-50/60 opacity-80' : ''}`}
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
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100 uppercase">
                                                        {(emp.employee_name || 'Unknown Name').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('') || 'UN'}
                                                    </div>
                                                )}
                                                <div className="flex flex-col justify-center">
                                                    <span className="font-semibold text-gray-800 text-sm truncate max-w-[150px]" title={emp.employee_name || 'Unknown Name'}>
                                                        {emp.employee_name || 'Unknown Name'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-mono">{emp.employee_id || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {filters?.cardFilter !== 'certifications' ? (
                                            <>
                                                <td className="px-6 py-2">
                                                    <div className="text-sm text-gray-700 font-medium">{emp.role_designation}</div>
                                                    <div className="text-xs text-gray-400">{emp.department}</div>
                                                </td>
                                                <td className="px-6 py-2">
                                                    {(() => {
                                                        const tag = getEmployeeTag(emp.employee_status);
                                                        const isBillable = emp.billable === 'billable';
                                                        return (
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${tag.color} whitespace-nowrap shadow-sm`}>
                                                                {tag.label}
                                                                <span className="mx-1"></span>
                                                                <span className={isBillable ? '' : 'opacity-70'}>
                                                                    {isBillable ? 'Billable' : 'Non-Billable'}
                                                                </span>
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-2">
                                                    <AllocationBar percentage={emp.employee_allocations || 0} status={emp.employee_status} />
                                                </td>
                                                <td className="px-6 py-2 text-sm text-gray-500 font-medium">{emp.location}</td>
                                            </>
                                        ) : (
                                            <td className="px-6 py-2">
                                                <div className="flex flex-wrap gap-1.5 max-w-[500px]">
                                                    {(emp.cert_list || []).map((cert, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold uppercase tracking-tight shadow-sm">
                                                            {cert}
                                                        </span>
                                                    ))}
                                                    {(!emp.cert_list || emp.cert_list.length === 0) && (
                                                        <span className="text-xs text-gray-400 italic font-medium">No certifications listed</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        
                                        <td className="px-6 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onEmployeeEdit && onEmployeeEdit(emp);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                                                >
                                                    <SquarePen size={13} />
                                                    Edit
                                                </button>
                                                {!isArchived ? (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setDeleteTarget(emp);
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-100"
                                                    >
                                                        <Trash2 size={13} />
                                                        Delete
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={async (event) => {
                                                            event.stopPropagation();
                                                            try {
                                                                 await restoreEmployee(emp.employee_id);
                                                                if (onRestore) onRestore();
                                                            } catch (err) {
                                                                alert('Failed to restore employee');
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-100"
                                                    >
                                                        <Undo2 size={13} />
                                                        Restore
                                                    </button>
                                                )}
                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors inline-block" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                            <Search className="w-8 h-8 text-slate-200" />
                                        </div>
                                        {filters?.cardFilter === 'bench' ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-lg font-bold text-gray-800">Excellent! No one is on bench.</p>
                                                    <p className="text-sm text-gray-400 max-w-[300px] mx-auto mt-1">Your entire workforce is currently engaged in active project work.</p>
                                                </div>
                                                <div className="flex flex-col items-center gap-3">
                                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Or</p>
                                                    <button 
                                                        onClick={() => navigate('/info/allocation#forecast-bench', { state: { showBack: true } })}
                                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                                    >
                                                        <TrendingUp size={16} />
                                                        View Upcoming Bench
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-lg font-bold text-gray-800">No employees found</p>
                                                <p className="text-sm text-gray-400">Adjust your filters or search query to see more results.</p>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {employees.length > 0 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-gray-500">
                            Showing <span className="font-bold text-gray-700">{startIndex + 1}</span> to <span className="font-bold text-gray-700">{Math.min(startIndex + itemsPerPage, employees.length)}</span> of <span className="font-bold text-gray-700">{employees.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Rows:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setItemsPerPage(val);
                                    localStorage.setItem('employeeRowsPerPage', val);
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

            {showExportModal && (
                <ExportPreviewModal
                    employees={employees}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </div>
    );
};

export default EmployeeTable;
