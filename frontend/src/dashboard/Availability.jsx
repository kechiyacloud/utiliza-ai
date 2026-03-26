import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronDown, Download, FileSpreadsheet, FileText, Filter, RotateCcw, X } from 'lucide-react';
import { getAvailabilityData, getAvailabilityFilters } from '../api/availabilityApi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTH_WIDTH = 180;
const STICKY_COLUMNS_WIDTH = 432;
const PAST_MONTHS = 3;
const FUTURE_MONTHS = 6;

const projectColors = [
    { name: 'blue', bg: 'bg-[#3b82f6]', border: 'border-[#2563eb]', shadow: 'rgba(59, 130, 246, 0.28)', grad: '#3b82f6, #60a5fa' },
    { name: 'emerald', bg: 'bg-[#10b981]', border: 'border-[#0ea472]', shadow: 'rgba(16, 185, 129, 0.28)', grad: '#10b981, #34d399' },
    { name: 'amber', bg: 'bg-[#f59e0b]', border: 'border-[#d97706]', shadow: 'rgba(245, 158, 11, 0.28)', grad: '#f59e0b, #fbbf24' },
    { name: 'purple', bg: 'bg-[#8b5cf6]', border: 'border-[#7c3aed]', shadow: 'rgba(139, 92, 246, 0.28)', grad: '#8b5cf6, #a78bfa' },
    { name: 'rose', bg: 'bg-[#f43f5e]', border: 'border-[#e11d48]', shadow: 'rgba(244, 63, 94, 0.28)', grad: '#f43f5e, #fb7185' },
    { name: 'indigo', bg: 'bg-[#6366f1]', border: 'border-[#4f46e5]', shadow: 'rgba(99, 102, 241, 0.28)', grad: '#6366f1, #818cf8' },
    { name: 'cyan', bg: 'bg-[#06b6d4]', border: 'border-[#0891b2]', shadow: 'rgba(6, 182, 212, 0.28)', grad: '#06b6d4, #22d3ee' }
];

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB');
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const toMonthInputValue = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
};

const parseMonthInput = (value) => {
    if (!value) return null;
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) return null;
    return new Date(year, month - 1, 1);
};

const overlapsRange = (startDate, endDate, rangeStart, rangeEnd) => {
    if (!rangeStart || !rangeEnd) return true;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
    return end >= rangeStart && start <= rangeEnd;
};

const AvailabilityFilterPanel = ({
    isOpen,
    onClose,
    pendingDept,
    setPendingDept,
    pendingLocation,
    setPendingLocation,
    pendingProjects,
    setPendingProjects,
    pendingStartMonth,
    setPendingStartMonth,
    pendingEndMonth,
    setPendingEndMonth,
    filters,
    previewRows,
    onApply,
    onReset,
    filterLoading
}) => {
    const [activeSection, setActiveSection] = useState('department');

    useEffect(() => {
        if (isOpen) {
            setActiveSection('department');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const previewSummary = {
        total: previewRows.length,
        allocated: previewRows.filter((row) => (row.allocation_percentage || 0) > 0).length,
        bench: previewRows.filter((row) => (row.allocation_percentage || 0) === 0).length,
        departments: new Set(previewRows.map((row) => row.department).filter(Boolean)).size
    };

    const toggleProject = (project) => {
        setPendingProjects((current) =>
            current.includes(project)
                ? current.filter((item) => item !== project)
                : [...current, project]
        );
    };

    const Section = ({ id, title, children }) => (
        <div className="border-b border-slate-100 last:border-0">
            <button
                type="button"
                onClick={() => setActiveSection((current) => current === id ? '' : id)}
                className="flex w-full items-center justify-between py-4 text-left"
            >
                <span className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">{title}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${activeSection === id ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${activeSection === id ? 'max-h-[260px] pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    );

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed right-0 top-0 z-50 flex h-full w-[320px] max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div className="flex items-center gap-2">
                        <Filter size={17} className="text-[#3BA9FB]" />
                        <h2 className="text-xl font-bold text-slate-800">Filters</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onReset} className="text-sm font-semibold text-slate-500 hover:text-red-500">Clear All</button>
                        <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-4 pb-2">
                    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 p-3">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-500">Preview ({previewSummary.total} Matching)</p>
                        <div className="grid grid-cols-4 gap-1.5">
                            <div className="rounded-lg bg-white/70 px-2 py-2">
                                <p className="text-[10px] text-slate-500">Total</p>
                                <p className="text-base font-black text-blue-600">{previewSummary.total}</p>
                            </div>
                            <div className="rounded-lg bg-emerald-50/80 px-2 py-2">
                                <p className="text-[10px] text-slate-500">Alloc</p>
                                <p className="text-base font-black text-emerald-600">{previewSummary.allocated}</p>
                            </div>
                            <div className="rounded-lg bg-amber-50/80 px-2 py-2">
                                <p className="text-[10px] text-slate-500">Bench</p>
                                <p className="text-base font-black text-amber-600">{previewSummary.bench}</p>
                            </div>
                            <div className="rounded-lg bg-violet-50/80 px-2 py-2">
                                <p className="text-[10px] text-slate-500">Dept</p>
                                <p className="text-base font-black text-violet-600">{previewSummary.departments}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-24">
                    <Section id="department" title="Department">
                        <select
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BA9FB]"
                            value={pendingDept}
                            onChange={(event) => setPendingDept(event.target.value)}
                        >
                            <option value="">All Departments</option>
                            {(filters.departments || []).map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </Section>

                    <Section id="location" title="Location">
                        <select
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BA9FB]"
                            value={pendingLocation}
                            onChange={(event) => setPendingLocation(event.target.value)}
                        >
                            <option value="">All Locations</option>
                            {(filters.locations || []).map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </Section>

                    <Section id="project" title="Project">
                        <div className="max-h-[160px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 custom-scrollbar">
                            <label className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${pendingProjects.length === 0 ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={pendingProjects.length === 0}
                                    onChange={() => setPendingProjects([])}
                                    className="h-4 w-4 rounded border-slate-300 text-[#3BA9FB] focus:ring-[#3BA9FB]"
                                />
                                <span className="font-semibold">All Projects</span>
                            </label>
                            {(filters.projects || []).map((project) => (
                                <label key={project} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${pendingProjects.includes(project) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={pendingProjects.includes(project)}
                                        onChange={() => toggleProject(project)}
                                        className="h-4 w-4 rounded border-slate-300 text-[#3BA9FB] focus:ring-[#3BA9FB]"
                                    />
                                    <span className="truncate" title={project}>{project}</span>
                                </label>
                            ))}
                        </div>
                        {pendingProjects.length > 0 && (
                            <p className="mt-2 text-xs font-semibold text-slate-500">{pendingProjects.length} project(s) selected</p>
                        )}
                    </Section>

                </div>

                <div className="absolute bottom-0 w-full border-t border-slate-100 bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <button
                        type="button"
                        onClick={onApply}
                        disabled={filterLoading}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#3BA9FB] py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Apply Filters
                        <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-black">{previewSummary.total} rows</span>
                    </button>
                </div>
            </div>
        </>
    );
};

const Availability = () => {
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({ departments: [], projects: [], locations: [] });
    const [pendingDept, setPendingDept] = useState('');
    const [pendingLocation, setPendingLocation] = useState('');
    const [pendingProjects, setPendingProjects] = useState([]);
    const [appliedDept, setAppliedDept] = useState('');
    const [appliedLocation, setAppliedLocation] = useState('');
    const [appliedProjects, setAppliedProjects] = useState([]);
    const [pendingStartMonth, setPendingStartMonth] = useState(() => toMonthInputValue(new Date(new Date().getFullYear(), new Date().getMonth() - PAST_MONTHS, 1)));
    const [pendingEndMonth, setPendingEndMonth] = useState(() => toMonthInputValue(new Date(new Date().getFullYear(), new Date().getMonth() + FUTURE_MONTHS, 1)));
    const [appliedStartMonth, setAppliedStartMonth] = useState(() => toMonthInputValue(new Date(new Date().getFullYear(), new Date().getMonth() - PAST_MONTHS, 1)));
    const [appliedEndMonth, setAppliedEndMonth] = useState(() => toMonthInputValue(new Date(new Date().getFullYear(), new Date().getMonth() + FUTURE_MONTHS, 1)));
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const timelineRef = useRef(null);
    const exportMenuRef = useRef(null);

    const currentMonthStart = useMemo(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }, []);

    const timelineMonths = useMemo(() => {
        const startMonth = parseMonthInput(appliedStartMonth) || new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - PAST_MONTHS, 1);
        const endMonthBase = parseMonthInput(appliedEndMonth) || new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + FUTURE_MONTHS, 1);
        const safeStart = startMonth <= endMonthBase ? startMonth : endMonthBase;
        const safeEnd = endMonthBase >= startMonth ? endMonthBase : startMonth;
        const monthCount = ((safeEnd.getFullYear() - safeStart.getFullYear()) * 12) + (safeEnd.getMonth() - safeStart.getMonth()) + 1;

        return Array.from({ length: monthCount }, (_, index) => {
            const monthDate = new Date(safeStart.getFullYear(), safeStart.getMonth() + index, 1);
            const nextMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
            const monthEnd = new Date(nextMonthDate.getTime() - 1);

            return {
                key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
                label: monthDate.toLocaleString('default', { month: 'short', year: '2-digit' }),
                monthStart: monthDate,
                monthEnd,
                isCurrent: monthDate.getFullYear() === currentMonthStart.getFullYear() && monthDate.getMonth() === currentMonthStart.getMonth(),
                weekLabels: ['W1', 'W2', 'W3', 'W4']
            };
        });
    }, [appliedEndMonth, appliedStartMonth, currentMonthStart]);

    const timelineStart = timelineMonths[0]?.monthStart;
    const timelineEnd = timelineMonths[timelineMonths.length - 1]?.monthEnd;

    const flatRows = useMemo(() => {
        return data.flatMap((employee) => {
            const allocations = Array.isArray(employee.allocations) && employee.allocations.length > 0
                ? employee.allocations
                : [{
                    project_name: 'Unassigned',
                    allocation_percentage: 0,
                    start_date: null,
                    end_date: null,
                    project_tags: 'N/A'
                }];

            return allocations.map((allocation) => ({
                employee_id: employee.employee_id,
                employee_name: employee.employee_name,
                department: employee.department,
                project_name: allocation.project_name || 'Unassigned',
                allocation_percentage: allocation.allocation_percentage ?? 0,
                start_date: allocation.start_date,
                end_date: allocation.end_date,
                project_tags: allocation.project_tags || 'N/A'
            }));
        });
    }, [data]);

    const previewRows = useMemo(() => {
        const startMonth = parseMonthInput(pendingStartMonth);
        const endMonth = parseMonthInput(pendingEndMonth);
        const endMonthLimit = endMonth ? new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0, 23, 59, 59, 999) : null;

        return flatRows.filter((row) => {
            const matchesDept = !pendingDept || row.department === pendingDept;
            const matchesLocation = !pendingLocation || row.location === pendingLocation;
            const matchesProject = pendingProjects.length === 0 || pendingProjects.includes(row.project_name);
            const matchesDate = overlapsRange(row.start_date, row.end_date, startMonth, endMonthLimit);

            return matchesDept && matchesLocation && matchesProject && matchesDate;
        });
    }, [flatRows, pendingDept, pendingLocation, pendingEndMonth, pendingProjects, pendingStartMonth]);

    const loadAvailabilityData = async (department = appliedDept, location = appliedLocation) => {
        try {
            const result = await getAvailabilityData({
                department: department || undefined,
                location: location || undefined
            });
            setData(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error('Error loading availability data:', error);
        }
    };

    const displayData = useMemo(() => {
        const startMonth = parseMonthInput(appliedStartMonth);
        const endMonth = parseMonthInput(appliedEndMonth);
        const endMonthLimit = endMonth ? new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0, 23, 59, 59, 999) : null;

        return data
            .map((employee) => {
                const allocations = Array.isArray(employee.allocations) && employee.allocations.length > 0
                    ? employee.allocations.filter((allocation) => {
                        const matchesProject = appliedProjects.length === 0 || appliedProjects.includes(allocation.project_name || 'Unassigned');
                        const matchesDate = overlapsRange(allocation.start_date, allocation.end_date, startMonth, endMonthLimit);
                        return matchesProject && matchesDate;
                    })
                    : [];

                if (allocations.length === 0 && appliedProjects.length === 0) {
                    return {
                        ...employee,
                        allocations: [{
                            project_name: 'Unassigned',
                            allocation_percentage: 0,
                            start_date: null,
                            end_date: null,
                            project_tags: 'N/A'
                        }]
                    };
                }

                return {
                    ...employee,
                    allocations
                };
            })
            .filter((employee) => employee.allocations.length > 0);
    }, [appliedEndMonth, appliedProjects, appliedStartMonth, data]);

    const exportRows = useMemo(() => {
        return displayData.flatMap((employee) =>
            employee.allocations.map((allocation) => ({
                employee_id: employee.employee_id,
                employee_name: employee.employee_name,
                department: employee.department,
                location: employee.location, // Added location
                project_name: allocation.project_name || 'Unassigned',
                allocation_percentage: allocation.allocation_percentage ?? 0,
                start_date: allocation.start_date,
                end_date: allocation.end_date,
                project_tags: allocation.project_tags || 'N/A'
            }))
        );
    }, [displayData]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [filterData, availabilityData] = await Promise.all([
                    getAvailabilityFilters(),
                    getAvailabilityData()
                ]);
                setFilters(filterData);
                setData(Array.isArray(availabilityData) ? availabilityData : []);
            } catch (error) {
                console.error('Error loading availability page:', error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        if (!timelineRef.current) return;

        const currentMonthIndex = timelineMonths.findIndex((month) => month.isCurrent);
        const targetMonthIndex = currentMonthIndex >= 0 ? currentMonthIndex : 0;
        const targetScrollLeft = Math.max(0, STICKY_COLUMNS_WIDTH + (targetMonthIndex * MONTH_WIDTH) - 24);

        requestAnimationFrame(() => {
            if (timelineRef.current) {
                timelineRef.current.scrollLeft = targetScrollLeft;
            }
        });
    }, [timelineMonths, data]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setIsExportOpen(false);
            }
        };

        if (isExportOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExportOpen]);

    const getProjectColor = (index) => projectColors[index % projectColors.length];

    const getBarStyle = (startDate, endDate) => {
        if (!startDate || !timelineStart || !timelineEnd) return null;

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : timelineEnd;
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
        if (end < timelineStart || start > timelineEnd) return null;

        const effectiveStart = start < timelineStart ? timelineStart : start;
        const effectiveEnd = end > timelineEnd ? timelineEnd : end;
        const totalRange = timelineEnd.getTime() - timelineStart.getTime();
        if (totalRange <= 0 || effectiveEnd < effectiveStart) return null;

        const leftRatio = (effectiveStart.getTime() - timelineStart.getTime()) / totalRange;
        const widthRatio = (effectiveEnd.getTime() - effectiveStart.getTime()) / totalRange;

        return {
            left: `${Math.max(0, leftRatio * 100)}%`,
            width: `${Math.max(widthRatio * 100, 0.8)}%`
        };
    };

    const handleApplyFilters = async () => {
        setFilterLoading(true);
        setAppliedDept(pendingDept);
        setAppliedLocation(pendingLocation);
        setAppliedProjects(pendingProjects);
        setAppliedStartMonth(pendingStartMonth);
        setAppliedEndMonth(pendingEndMonth);
        await loadAvailabilityData(pendingDept, pendingLocation);
        setIsFilterOpen(false); // Close filter panel after applying
        setFilterLoading(false);
    };

    const handleResetFilters = async () => {
        setPendingDept('');
        setPendingLocation('');
        setPendingProjects([]);
        setAppliedDept('');
        setAppliedLocation('');
        setAppliedProjects([]);
        const defaultStart = toMonthInputValue(new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - PAST_MONTHS, 1));
        const defaultEnd = toMonthInputValue(new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + FUTURE_MONTHS, 1));
        setPendingStartMonth(defaultStart);
        setPendingEndMonth(defaultEnd);
        setAppliedStartMonth(defaultStart);
        setAppliedEndMonth(defaultEnd);
        setFilterLoading(true);
        await loadAvailabilityData('', '');
        setFilterLoading(false);
    };

    const downloadBlob = (content, filename, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportCsv = () => {
        const headers = ['Employee ID', 'Employee Name', 'Department', 'Project', 'Allocation %', 'Start Date', 'End Date', 'Billing'];
        const rows = exportRows.map((row) => [
            row.employee_id,
            row.employee_name,
            row.department,
            row.project_name,
            row.allocation_percentage,
            formatDate(row.start_date),
            formatDate(row.end_date),
            row.project_tags
        ]);
        const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
        downloadBlob(csv, 'availability-report.csv', 'text/csv;charset=utf-8;');
    };

    const handleExportExcel = () => {
        const rows = exportRows.map((row) => ({
            'Employee ID': row.employee_id || '',
            'Employee Name': row.employee_name || '',
            'Department': row.department || '',
            'Project': row.project_name || '',
            'Allocation %': row.allocation_percentage ?? 0,
            'Start Date': formatDate(row.start_date),
            'End Date': formatDate(row.end_date),
            'Billing': row.project_tags || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Availability');
        XLSX.writeFile(wb, 'availability-report.xlsx');
    };

    const handleExportPdf = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text('Availability Report', 14, 18);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(
            `Department: ${appliedDept || 'All'} | Projects: ${appliedProjects.length > 0 ? appliedProjects.join(', ') : 'All'} | Generated: ${new Date().toLocaleString('en-GB')}`,
            14, 26
        );

        const tableRows = exportRows.map((row) => [
            row.employee_name || '',
            row.department || '',
            row.project_name || '',
            `${row.allocation_percentage ?? 0}%`,
            formatDate(row.start_date),
            formatDate(row.end_date),
            row.project_tags || '',
        ]);

        autoTable(doc, {
            head: [['Employee', 'Department', 'Project', 'Allocation', 'Start Date', 'End Date', 'Billing']],
            body: tableRows,
            startY: 32,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        doc.save('availability-report.pdf');
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f8fafc]">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-CD_Blue"></div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#f8fafc] p-3 text-mainTheme">
            <div className="mb-3 flex flex-col gap-2">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <h1 className="text-[30px] font-bold leading-none text-mainTheme">Resource Availability</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            The timeline opens at the current month. Scroll left to review past months and right for forward allocations.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            <Filter size={16} />
                            Filters
                        </button>
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsExportOpen((current) => !current)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                <Download size={16} />
                                Export
                                <ChevronDown size={14} className={`transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isExportOpen && (
                                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleExportPdf();
                                            setIsExportOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                    >
                                        <FileText size={16} />
                                        Export PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleExportExcel();
                                            setIsExportOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                                    >
                                        <FileSpreadsheet size={16} />
                                        Export Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleExportCsv();
                                            setIsExportOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                                    >
                                        <Download size={16} />
                                        Export CSV
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                        <CalendarRange size={14} className="text-blue-500" />
                        {formatDate(parseMonthInput(appliedStartMonth))} to {formatDate(new Date((parseMonthInput(appliedEndMonth) || new Date()).getFullYear(), (parseMonthInput(appliedEndMonth) || new Date()).getMonth() + 1, 0))}
                    </div>
                    {appliedDept && <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{appliedDept}</div>}
                    {appliedLocation && <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{appliedLocation}</div>}
                    {appliedProjects.length > 0 && <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{appliedProjects.length} projects selected</div>}
                    <div className="ml-auto text-xs font-semibold text-slate-500">{displayData.length} employees loaded</div>
                </div>
            </div>

            <div ref={timelineRef} className="custom-scrollbar relative flex-1 overflow-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="border-collapse table-fixed" style={{ minWidth: `${STICKY_COLUMNS_WIDTH + (timelineMonths.length * MONTH_WIDTH)}px` }}>
                    <thead>
                        <tr className="sticky top-0 z-30 bg-white">
                            <th className="sticky left-0 z-40 h-14 w-44 border-b border-r border-slate-100 bg-slate-50 px-4 text-left">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee</span>
                            </th>
                            <th className="sticky left-44 z-40 h-14 w-64 border-b border-r border-slate-100 bg-slate-50 px-4 text-left">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Project / Allocation</span>
                            </th>
                            {timelineMonths.map((month, index) => (
                                <th
                                    key={month.key}
                                    className={`border-b border-r border-slate-100 p-0 ${month.isCurrent ? 'bg-blue-50' : index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
                                    style={{ width: `${MONTH_WIDTH}px` }}
                                >
                                    <div className={`flex h-8 items-center justify-center border-b border-slate-100 text-[13px] font-bold ${month.isCurrent ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {month.label}
                                    </div>
                                    <div className="flex h-6">
                                        {month.weekLabels.map((weekLabel) => (
                                            <div key={`${month.key}-${weekLabel}`} className="flex flex-1 items-center justify-center border-r border-slate-100/60 text-[10px] font-semibold text-slate-400 last:border-r-0">
                                                {weekLabel}
                                            </div>
                                        ))}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((employee, employeeIndex) => {
                            const allocations = Array.isArray(employee.allocations) && employee.allocations.length > 0
                                ? employee.allocations
                                : [{ project_name: 'Unassigned', allocation_percentage: 0, project_tags: 'N/A', start_date: null, end_date: null }];

                            return (
                                <React.Fragment key={employee.employee_id}>
                                    {allocations.map((allocation, allocationIndex) => {
                                        const color = getProjectColor(allocationIndex);
                                        const barStyle = getBarStyle(allocation.start_date, allocation.end_date);
                                        const showBar = barStyle && (allocation.allocation_percentage ?? 0) > 0;
                                        const rowBackground = employeeIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';

                                        return (
                                            <tr key={`${employee.employee_id}-${allocationIndex}`} className={`h-12 border-b border-slate-100 ${rowBackground}`}>
                                                {allocationIndex === 0 && (
                                                    <td className={`sticky left-0 z-20 border-r border-slate-100 px-4 py-2 ${rowBackground}`} rowSpan={allocations.length} style={{ width: '176px', minWidth: '176px', backgroundColor: rowBackground === 'bg-white' ? '#ffffff' : '#f8fafc' }}>
                                                        <div className="font-bold text-[13px] leading-tight text-slate-800">{employee.employee_name}</div>
                                                        <div className="text-[10px] text-slate-400">ID: {employee.employee_id}</div>
                                                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{employee.department || 'No Department'}</div>
                                                    </td>
                                                )}

                                                <td className={`sticky left-44 z-20 overflow-hidden border-r border-slate-100 px-4 py-2 ${rowBackground}`} style={{ width: '256px', minWidth: '256px', backgroundColor: rowBackground === 'bg-white' ? '#ffffff' : '#f8fafc' }}>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="max-w-[180px] truncate text-xs font-semibold text-slate-700" title={allocation.project_name}>
                                                                {allocation.project_name}
                                                            </span>
                                                            {allocation.project_tags !== 'N/A' && (
                                                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${allocation.project_tags?.toLowerCase().includes('non') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                    {allocation.project_tags?.toLowerCase().includes('non') ? 'Non-Billable' : allocation.project_tags}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 text-[10px] font-bold text-blue-600">
                                                            {allocation.allocation_percentage > 0 ? `Allocation: ${allocation.allocation_percentage}%` : 'No active allocation'}
                                                        </div>
                                                        {(allocation.start_date || allocation.end_date) && (
                                                            <div className="mt-0.5 text-[10px] text-slate-400">
                                                                {formatDate(allocation.start_date)} to {formatDate(allocation.end_date)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td colSpan={timelineMonths.length} className="relative h-12 overflow-hidden p-0">
                                                    <div className="absolute inset-0 flex">
                                                        {timelineMonths.map((month, monthIndex) => (
                                                            <div
                                                                key={`${employee.employee_id}-${allocationIndex}-${month.key}`}
                                                                className={`relative h-full border-r ${month.isCurrent ? 'bg-blue-50/70 border-blue-100' : monthIndex % 2 === 0 ? 'bg-slate-50/60 border-slate-100' : 'bg-white border-slate-100'}`}
                                                                style={{ width: `${MONTH_WIDTH}px` }}
                                                            >
                                                                <div className="flex h-full">
                                                                    {month.weekLabels.map((weekLabel) => (
                                                                        <div key={`${month.key}-${weekLabel}`} className="flex-1 border-r border-slate-100/60 last:border-r-0"></div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {showBar && (
                                                        <div className="relative flex h-full items-center">
                                                            <div
                                                                className={`absolute flex items-center justify-end overflow-hidden border px-2 transition-all duration-300 rounded-md ${color.bg} ${color.border}`}
                                                                style={{
                                                                    ...barStyle,
                                                                    height: '16px',
                                                                    boxShadow: `0 3px 5px -1px ${color.shadow}, inset 0 1px 2px rgba(255,255,255,0.15)`,
                                                                    background: `linear-gradient(90deg, ${color.grad})`
                                                                }}
                                                                title={`${allocation.project_name}: ${allocation.allocation_percentage}% (${formatDate(allocation.start_date)} to ${formatDate(allocation.end_date)})`}
                                                            >
                                                                <span className="whitespace-nowrap text-[9px] font-bold text-white drop-shadow-sm">{allocation.allocation_percentage}%</span>
                                                                <div className="availability-stripes absolute inset-0 opacity-15"></div>
                                                            </div>
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

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        .availability-stripes {
                            background-image: repeating-linear-gradient(
                                45deg,
                                transparent,
                                transparent 12px,
                                rgba(255, 255, 255, 0.35) 12px,
                                rgba(255, 255, 255, 0.55) 24px
                            );
                        }
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 8px;
                            height: 8px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 999px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                        }
                    `
                }}
            />

            <AvailabilityFilterPanel
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                pendingDept={pendingDept}
                setPendingDept={setPendingDept}
                pendingProjects={pendingProjects}
                setPendingProjects={setPendingProjects}
                pendingStartMonth={pendingStartMonth}
                setPendingStartMonth={setPendingStartMonth}
                pendingEndMonth={pendingEndMonth}
                setPendingEndMonth={setPendingEndMonth}
                filters={filters}
                previewRows={previewRows}
                onApply={async () => {
                    await handleApplyFilters();
                    setIsFilterOpen(false);
                }}
                onReset={handleResetFilters}
                filterLoading={filterLoading}
            />
        </div>
    );
};

export default Availability;
