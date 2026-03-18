import React, { useState, useEffect, useMemo } from 'react';
import { getAvailabilityData, getAvailabilityFilters } from '../api/availabilityApi';

const Availability = () => {
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({ departments: [], projects: [] });
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedProj, setSelectedProj] = useState('');
    const [loading, setLoading] = useState(true);

    const currentYear = new Date().getFullYear();
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Color palette for different projects
    const projectColors = [
        { name: 'blue', bg: 'bg-[#3b82f6]', border: 'border-[#2563eb]', shadow: 'rgba(59, 130, 246, 0.3)', grad: '#3b82f6, #60a5fa' },
        { name: 'emerald', bg: 'bg-[#10b981]', border: 'border-[#0ea472]', shadow: 'rgba(16, 185, 129, 0.3)', grad: '#10b981, #34d399' },
        { name: 'amber', bg: 'bg-[#f59e0b]', border: 'border-[#d97706]', shadow: 'rgba(245, 158, 11, 0.3)', grad: '#f59e0b, #fbbf24' },
        { name: 'purple', bg: 'bg-[#8b5cf6]', border: 'border-[#7c3aed]', shadow: 'rgba(139, 92, 246, 0.3)', grad: '#8b5cf6, #a78bfa' },
        { name: 'rose', bg: 'bg-[#f43f5e]', border: 'border-[#e11d48]', shadow: 'rgba(244, 63, 94, 0.3)', grad: '#f43f5e, #fb7185' },
        { name: 'indigo', bg: 'bg-[#6366f1]', border: 'border-[#4f46e5]', shadow: 'rgba(99, 102, 241, 0.3)', grad: '#6366f1, #818cf8' },
        { name: 'cyan', bg: 'bg-[#06b6d4]', border: 'border-[#0891b2]', shadow: 'rgba(6, 182, 212, 0.3)', grad: '#06b6d4, #22d3ee' },
    ];

    const getProjectColor = (index) => projectColors[index % projectColors.length];

    const calendarHeader = useMemo(() => {
        return months.map((month, index) => ({
            name: `${month} '${currentYear.toString().slice(-2)}`,
            index: index,
            weeks: ['W1', 'W2', 'W3', 'W4']
        }));
    }, [currentYear]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [filterData, availData] = await Promise.all([
                    getAvailabilityFilters(),
                    getAvailabilityData()
                ]);
                setFilters(filterData);
                setData(availData);
            } catch (error) {
                console.error('Error loading availability data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (loading) return;
            try {
                const result = await getAvailabilityData({
                    department: selectedDept || undefined,
                    project: selectedProj || undefined
                });
                setData(result);
            } catch (error) {
                console.error('Error filtering availability data:', error);
            }
        };
        fetchData();
    }, [selectedDept, selectedProj, loading]);

    const getBarStyle = (startDate, endDate) => {
        if (!startDate || !endDate) return { display: 'none' };

        const start = new Date(startDate);
        const end = new Date(endDate);

        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);

        if (start > yearEnd || end < yearStart) return { display: 'none' };

        const effectiveStart = start < yearStart ? yearStart : start;
        const effectiveEnd = end > yearEnd ? yearEnd : end;

        const totalDays = 365;
        const startOffset = Math.max(0, (effectiveStart - yearStart) / (1000 * 60 * 60 * 24));
        const duration = Math.max(0, (effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24));

        return {
            left: `${(startOffset / totalDays) * 100}%`,
            width: `${(duration / totalDays) * 100}%`,
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#f8fafc]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-CD_Blue"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-mainTheme p-4 overflow-hidden">
            {/* Header section */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-mainTheme">Resource Availability</h1>

                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-500 mb-1">Department</label>
                        <select
                            className="p-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-CD_Blue min-w-[100px]"
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {filters.departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-500 mb-1">Project</label>
                        <select
                            className="p-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-CD_Blue min-w-[150px]"
                            value={selectedProj}
                            onChange={(e) => setSelectedProj(e.target.value)}
                        >
                            <option value="">All Projects</option>
                            {filters.projects.map(proj => (
                                <option key={proj} value={proj}>{proj}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto custom-scrollbar relative">
                <table className="w-full border-collapse table-fixed min-w-[3000px]">
                    <thead>
                        <tr className="sticky top-0 z-30 bg-white">
                            <th className="sticky left-0 z-40 w-44 bg-gray-50 border-r border-b border-gray-100 h-20 px-4 text-left shadow-[4px_0_10px_-2px_rgba(0,0,0,0.1)] transition-shadow">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</span>
                            </th>
                            <th className="sticky left-44 z-40 w-64 bg-gray-50 border-r border-b border-gray-100 h-20 px-4 text-left shadow-[4px_0_10px_-2px_rgba(0,0,0,0.1)] transition-shadow">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project / Allocation</span>
                            </th>
                            {calendarHeader.map(month => (
                                <th key={month.index} className="w-[200px] border-r border-b border-gray-100 bg-gray-50 p-0">
                                    <div className="h-10 border-b border-gray-100 flex items-center justify-center text-[13px] font-bold text-gray-700">
                                        {month.name}
                                    </div>
                                    <div className="h-10 flex">
                                        {month.weeks.map((week, widx) => (
                                            <div key={widx} className="flex-1 border-r border-gray-50 last:border-r-0 flex items-center justify-center text-[10px] font-medium text-gray-400">
                                                {week}
                                            </div>
                                        ))}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((emp) => {
                            const allocs = emp.allocations.length > 0 ? emp.allocations : [{ project_name: 'No Allocation', allocation_percentage: 0, project_tags: 'N/A', start_date: null, end_date: null }];

                            return (
                                <React.Fragment key={emp.employee_id}>
                                    {allocs.map((alloc, aidx) => {
                                        const pColor = getProjectColor(aidx);
                                        return (
                                            <tr key={`${emp.employee_id}-${aidx}`} className="h-16 border-b border-gray-50 group hover:bg-gray-50/20">
                                                {/* Column 1: Employee (Sticky) */}
                                                {aidx === 0 && (
                                                    <td className="sticky left-0 z-20 bg-white border-r border-gray-100 px-4 py-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] transition-shadow" rowSpan={allocs.length}>
                                                        <div className="font-bold text-sm text-gray-800">{emp.employee_name}</div>
                                                        <div className="text-[10px] text-gray-400">ID: {emp.employee_id}</div>
                                                    </td>
                                                )}

                                                {/* Column 2: Project Details (Sticky) */}
                                                <td className="sticky left-44 z-20 bg-white border-r border-gray-100 px-4 py-2 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] transition-shadow">
                                                    <div className="flex flex-col">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-xs font-semibold text-gray-700 truncate max-w-[140px]" title={alloc.project_name}>
                                                                {alloc.project_name}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${alloc.project_tags?.toLowerCase().includes('non')
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : alloc.project_tags === 'N/A'
                                                                    ? 'bg-gray-100 text-gray-400'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                                }`}>
                                                                {alloc.project_tags?.toLowerCase().includes('non') ? 'Non-Billable' : (alloc.project_tags === 'N/A' ? '' : alloc.project_tags)}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-CD_Blue mt-1">
                                                            Allocation: {alloc.allocation_percentage}%
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Column 3: Graph */}
                                                <td colSpan={12} className="p-0 relative h-16">
                                                    {/* Grid background lines */}
                                                    <div className="absolute inset-y-0 left-0 right-0 flex pointer-events-none">
                                                        {Array.from({ length: 48 }).map((_, i) => (
                                                            <div key={i} className="flex-1 border-r border-gray-50 last:border-0 h-full"></div>
                                                        ))}
                                                    </div>

                                                    {/* Availability Bar */}
                                                    {alloc.start_date && alloc.end_date && (
                                                        <div className="relative w-full h-full flex items-center">
                                                            {(() => {
                                                                const barStyle = getBarStyle(alloc.start_date, alloc.end_date);

                                                                return (
                                                                    <div
                                                                        className={`absolute flex items-center px-2 overflow-hidden border transition-all duration-300 hover:z-50 hover:brightness-105 active:scale-[0.99]
                                                                            rounded-r-lg rounded-l-md availability-bar-${pColor.name} ${pColor.bg} ${pColor.border}`}
                                                                        style={{
                                                                            ...barStyle,
                                                                            height: '24px',
                                                                            zIndex: 10,
                                                                            boxShadow: `0 4px 6px -1px ${pColor.shadow}, inset 0 2px 4px rgba(255,255,255,0.2)`,
                                                                            background: `linear-gradient(90deg, ${pColor.grad})`
                                                                        }}
                                                                        title={`${alloc.project_name}: ${alloc.allocation_percentage}% (${alloc.start_date} to ${alloc.end_date})`}
                                                                    >
                                                                        <span className="text-white text-[10px] font-bold z-10 whitespace-nowrap drop-shadow-sm">
                                                                            {alloc.allocation_percentage}%
                                                                        </span>
                                                                        <div className="absolute inset-0 opacity-20 pointer-events-none availability-stripes"></div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .availability-stripes {
                    background-image: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 12px,
                        rgba(255, 255, 255, 0.4) 12px,
                        rgba(255, 255, 255, 0.6) 24px
                    );
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                tr:last-child {
                    border-bottom: none;
                }
                .sticky-shadow {
                    box-shadow: 4px 0 10px -2px rgba(0,0,0,0.1);
                }
            `}} />
        </div>
    );
};

export default Availability;

