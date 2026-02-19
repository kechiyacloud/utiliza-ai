import React, { useEffect, useState } from 'react';
import { ChevronRight, Search, Filter } from 'lucide-react';
import { getEmployeeList } from '../../api/employeeApi';
import EmployeeStatusTag, { getEmployeeTag } from '../../components/EmployeeStatusTag';

// StatusBadge - matching ClientTable status pill style
const StatusBadge = ({ status }) => {
    const styles = {
        'Allocated': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Bench': 'bg-orange-50 text-orange-600 border-orange-100',
        'Notice period': 'bg-red-50 text-red-600 border-red-100',
    };

    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
            {status}
        </span>
    );
};


// AllocationBar
const AllocationBar = ({ percentage }) => {
    let color = 'bg-emerald-500';
    if (percentage > 100) color = 'bg-red-500';
    if (percentage === 0) color = 'bg-orange-500';

    return (
        <div className="w-full max-w-[110px]">
            <div className="flex justify-end mb-1">
                <span className="text-[10px] font-bold text-gray-600">{percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${percentage > 100 ? 100 : percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

// Main EmployeeTable - matching ClientTable theme
const EmployeeTable = ({ onEmployeeClick, filters }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const data = await getEmployeeList();
                setEmployees(data);
            } catch (err) {
                console.error("Error fetching employees:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    const filteredEmployees = employees.filter(emp => {
        // 1. Search Filter — tag-priority: if search matches a tag prefix, only filter by tag
        const searchValue = filters.search?.toLowerCase().trim();
        const tagLabel = getEmployeeTag(emp.employee_status, emp.billable)?.label?.toLowerCase();

        const ALL_TAG_LABELS = ['active billable', 'non-billable', 'bench', 'shadow billing', 'serving notice'];
        const isTagSearch = searchValue && ALL_TAG_LABELS.some(t => t.startsWith(searchValue));

        const matchesSearch = !searchValue || (
            isTagSearch
                ? tagLabel?.startsWith(searchValue)  // tag-only match (prefix)
                : (
                    emp.employee_name?.toLowerCase().includes(searchValue) ||
                    emp.employee_id?.toLowerCase().includes(searchValue) ||
                    emp.role_designation?.toLowerCase().includes(searchValue) ||
                    emp.location?.toLowerCase().includes(searchValue) ||
                    emp.department?.toLowerCase().includes(searchValue) ||
                    tagLabel?.includes(searchValue) ||
                    (emp.employee_allocations && emp.employee_allocations.toString().includes(searchValue)) ||
                    (emp.skills && emp.skills.some(skill => skill.toLowerCase().includes(searchValue)))
                )
        );

        // 2. Department Filter (Array) - Updated key to 'departments'
        const matchesDept = !filters?.departments || filters.departments.length === 0 || filters.departments.includes(emp.department);

        // 3. Location Filter (Array)
        const matchesLocation = !filters?.locations || filters.locations.length === 0 || filters.locations.includes(emp.location);

        // 4. Employee Type (Array)
        const matchesType = !filters?.types || filters.types.length === 0 || filters.types.includes(emp.employeeType);

        // 5. Skills (Array - check if employee has ANY of the selected skills)
        const matchesSkills = !filters?.skills || filters.skills.length === 0 ||
            (emp.skills && filters.skills.some(skill => emp.skills.includes(skill)));

        // 6. Status Tag Filter (the 5 combined tags)
        const matchesStatusTag = !filters?.statusTags || filters.statusTags.length === 0 ||
            filters.statusTags.includes(getEmployeeTag(emp.employee_status, emp.billable)?.label);

        // 6. Card Filter (Quick filters from stat cards)
        let matchesCardFilter = true;
        if (filters?.cardFilter) {
            // Handle object-based filters (e.g., employee-of-month with specific ID)
            if (typeof filters.cardFilter === 'object' && filters.cardFilter.type === 'employee-of-month') {
                matchesCardFilter = emp.employee_id === filters.cardFilter.employeeId;
            } else if (typeof filters.cardFilter === 'string') {
                const now = new Date();
                const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

                switch (filters.cardFilter) {
                    case 'bench':
                        matchesCardFilter = emp.employee_status?.toLowerCase() === 'bench';
                        break;
                    case 'notice':
                        // Assuming we need to check for notice period status
                        matchesCardFilter = emp.employee_status?.toLowerCase().includes('notice');
                        break;
                    case 'new-joiner':
                        // Filter employees who joined in last 90 days
                        const joiningDate = emp.date_of_joining ? new Date(emp.date_of_joining) : null;
                        matchesCardFilter = joiningDate && joiningDate >= ninetyDaysAgo;
                        break;
                    case 'top-performer':
                        // Filter employees with 100% allocation
                        matchesCardFilter = emp.employee_allocations >= 100;
                        break;
                    default:
                        matchesCardFilter = true;
                }
            }
        }

        return matchesSearch && matchesDept && matchesLocation && matchesType && matchesSkills && matchesCardFilter && matchesStatusTag;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
    }, [filters]);

    if (loading) return <div className="p-10 text-center font-medium text-gray-400">Loading Employees...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800">Employee Directory</h3>
                <div className="text-xs font-medium text-gray-400">
                    Showing {filteredEmployees.length} employees
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[400px]">
                <table className="w-full relative">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Employee</th>
                            <th className="px-6 py-3">Designation</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Allocation</th>
                            <th className="px-6 py-3">Location</th>
                            <th className="px-6 py-3 text-right"></th>
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
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">{emp.employee_name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{emp.employee_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-2">
                                        <div className="text-sm text-gray-700 font-medium">{emp.role_designation}</div>
                                        <div className="text-xs text-gray-400">{emp.department}</div>
                                    </td>
                                    <td className="px-6 py-2">
                                        <EmployeeStatusTag status={emp.employee_status} billable={emp.billable} />
                                    </td>
                                    <td className="px-6 py-2">
                                        <AllocationBar percentage={emp.employee_allocations || 0} />
                                    </td>
                                    <td className="px-6 py-2 text-sm text-gray-500 font-medium">{emp.location}</td>
                                    <td className="px-6 py-2 text-right">
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors inline-block" />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-gray-400">No employees found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {filteredEmployees.length > 0 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                    <div className="text-xs text-gray-500">
                        Showing <span className="font-bold text-gray-700">{startIndex + 1}</span> to <span className="font-bold text-gray-700">{Math.min(startIndex + itemsPerPage, filteredEmployees.length)}</span> of <span className="font-bold text-gray-700">{filteredEmployees.length}</span> entries
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
                            Page {currentPage} of {totalPages}
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
        </div>
    );
};

export default EmployeeTable;