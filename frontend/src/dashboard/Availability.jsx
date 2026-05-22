import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarRange, ChevronDown, Download, FileSpreadsheet, FileText, RotateCcw, Search, X } from 'lucide-react';
import { getAvailabilityData, getAvailabilityFilters } from '../api/availabilityApi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogoAsBase64, buildPDFHeader, addPDFFooter } from '../utils/exportUtils';
import cdBlueLogo from '../assets/CD-Blue.svg';
import ModuleLoader from '../components/ModuleLoader';

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

const Availability = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({ departments: [], projects: [], locations: [] });
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [startMonth, setStartMonth] = useState(() => toMonthInputValue(new Date(new Date().getFullYear(), new Date().getMonth() - PAST_MONTHS, 1)));
    const [endMonth, setEndMonth] = useState(() => toMonthInputValue(new Date(new Date().getFullYear(), new Date().getMonth() + FUTURE_MONTHS, 1)));
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [error, setError] = useState(null);
    const timelineRef = useRef(null);
    const exportMenuRef = useRef(null);
    const projectDropdownRef = useRef(null);
    const calendarRef = useRef(null);
    const searchRef = useRef(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    const currentMonthStart = useMemo(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }, []);

    const timelineMonths = useMemo(() => {
        const startMonthDate = parseMonthInput(startMonth) || new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - PAST_MONTHS, 1);
        const endMonthBase = parseMonthInput(endMonth) || new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + FUTURE_MONTHS, 1);
        const safeStart = startMonthDate <= endMonthBase ? startMonthDate : endMonthBase;
        const safeEnd = endMonthBase >= startMonthDate ? endMonthBase : startMonthDate;
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
    }, [endMonth, startMonth, currentMonthStart]);

    const timelineStart = timelineMonths[0]?.monthStart;
    const timelineEnd = timelineMonths[timelineMonths.length - 1]?.monthEnd;

    const displayData = useMemo(() => {
        const startMonthDate = parseMonthInput(startMonth);
        const endMonthDate = parseMonthInput(endMonth);
        const endMonthLimit = endMonthDate ? new Date(endMonthDate.getFullYear(), endMonthDate.getMonth() + 1, 0, 23, 59, 59, 999) : null;

        return data
            .map((employee) => {
                const allocations = Array.isArray(employee.allocations) && employee.allocations.length > 0
                    ? employee.allocations.filter((allocation) => {
                        const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(allocation.project_name || 'Unassigned');
                        const matchesDate = overlapsRange(allocation.start_date, allocation.end_date, startMonthDate, endMonthLimit);
                        return matchesProject && matchesDate;
                    })
                    : [];

                if (allocations.length === 0 && selectedProjects.length === 0) {
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
    }, [endMonth, selectedProjects, startMonth, data]);

    // Employee search: suggestions shown while typing (starts-with, case-insensitive)
    const searchSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.trim().toLowerCase();
        return displayData
            .filter((emp) => emp.employee_name?.toLowerCase().startsWith(q))
            .map((emp) => ({ id: emp.employee_id, name: emp.employee_name }))
            .slice(0, 8); // cap at 8 suggestions
    }, [searchQuery, displayData]);

    // Apply selected employee filter on top of all other filters
    const filteredDisplayData = useMemo(() => {
        if (!selectedEmployee) return displayData;
        return displayData.filter((emp) =>
            emp.employee_name?.toLowerCase() === selectedEmployee.toLowerCase()
        );
    }, [displayData, selectedEmployee]);

    const exportRows = useMemo(() => {
        return filteredDisplayData.flatMap((employee) =>
            employee.allocations.map((allocation) => ({
                employee_id: employee.employee_id,
                employee_name: employee.employee_name,
                department: employee.department,
                location: employee.location,
                project_name: allocation.project_name || 'Unassigned',
                allocation_percentage: allocation.allocation_percentage ?? 0,
                start_date: allocation.start_date,
                end_date: allocation.end_date,
                project_tags: allocation.project_tags || 'N/A'
            }))
        );
    }, [filteredDisplayData]);

    // Derived stats for the preview badge (from filteredDisplayData — no separate preview state needed)
    const previewStats = useMemo(() => {
        const total = filteredDisplayData.length;
        const allocated = filteredDisplayData.filter((emp) =>
            emp.allocations.some((a) => (a.allocation_percentage || 0) > 0)
        ).length;
        const bench = filteredDisplayData.filter((emp) =>
            emp.allocations.every((a) => (a.allocation_percentage || 0) === 0)
        ).length;
        const departments = new Set(filteredDisplayData.map((emp) => emp.department).filter(Boolean)).size;
        return { total, allocated, bench, departments };
    }, [filteredDisplayData]);

    const loadAvailabilityData = async (department = selectedDept, location = selectedLocation) => {
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

    useEffect(() => {
        const controller = new AbortController();
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [filterData, availabilityData] = await Promise.all([
                    getAvailabilityFilters(),
                    getAvailabilityData()
                ]);
                if (controller.signal.aborted) return;
                setFilters(filterData);
                setData(Array.isArray(availabilityData) ? availabilityData : []);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Error loading availability page:', error);
                    setError(error?.message || 'Failed to connection to availability service');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadInitialData();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!timelineRef.current || loading) return;

        const currentMonthIndex = timelineMonths.findIndex((month) => month.isCurrent);
        const targetMonthIndex = currentMonthIndex >= 0 ? currentMonthIndex : 0;
        const targetScrollLeft = Math.max(0, (targetMonthIndex * MONTH_WIDTH) - 24);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (timelineRef.current) {
                    timelineRef.current.scrollLeft = targetScrollLeft;
                }
            });
        });
    }, [timelineMonths, loading]);

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };

        if (isProjectDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProjectDropdownOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };

        if (isSearchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setIsCalendarOpen(false);
            }
        };

        if (isCalendarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCalendarOpen]);

    const handleDeptChange = async (value) => {
        setSelectedDept(value);
        setFilterLoading(true);
        await loadAvailabilityData(value, selectedLocation);
        setFilterLoading(false);
    };

    const handleLocationChange = async (value) => {
        setSelectedLocation(value);
        setFilterLoading(true);
        await loadAvailabilityData(selectedDept, value);
        setFilterLoading(false);
    };

    const toggleProject = (project) => {
        setSelectedProjects((current) =>
            current.includes(project)
                ? current.filter((item) => item !== project)
                : [...current, project]
        );
    };

    const handleResetFilters = async () => {
        setSelectedDept('');
        setSelectedLocation('');
        setSelectedProjects([]);
        setSelectedEmployee('');
        setSearchQuery('');
        const defaultStart = toMonthInputValue(new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - PAST_MONTHS, 1));
        const defaultEnd = toMonthInputValue(new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + FUTURE_MONTHS, 1));
        setStartMonth(defaultStart);
        setEndMonth(defaultEnd);
        setFilterLoading(true);
        await loadAvailabilityData('', '');
        setFilterLoading(false);
    };

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

    const handleExportPdf = async () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const logoBase64 = await loadLogoAsBase64(cdBlueLogo);

        const endOfMonth = parseMonthInput(endMonth)
            ? new Date(parseMonthInput(endMonth).getFullYear(), parseMonthInput(endMonth).getMonth() + 1, 0)
            : null;

        const subtitleParts = [
            `Dates: ${formatDate(parseMonthInput(startMonth))} \u2013 ${formatDate(endOfMonth)}`,
            selectedDept ? `Dept: ${selectedDept}` : null,
            selectedLocation ? `Location: ${selectedLocation}` : null,
            selectedProjects.length > 0 ? `Projects: ${selectedProjects.join(', ')}` : null,
            `Generated: ${new Date().toLocaleString('en-GB')}`
        ].filter(Boolean);
        const subtitle = subtitleParts.join('  |  ');

        const startY = buildPDFHeader(doc, logoBase64, 'Resource Availability Report', subtitle);

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
            head: [['Employee', 'Department', 'Project', 'Allocation %', 'Start Date', 'End Date', 'Billing']],
            body: tableRows,
            startY,
            theme: 'striped',
            headStyles: { fillColor: [59, 169, 251], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica', textColor: [30, 41, 59] },
            alternateRowStyles: { fillColor: [240, 249, 255] },
            margin: { left: 14, right: 14, bottom: 18 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 35 },
                2: { cellWidth: 50 },
                3: { cellWidth: 22, halign: 'center' },
                4: { cellWidth: 28 },
                5: { cellWidth: 28 },
                6: { cellWidth: 25 },
            },
        });

        addPDFFooter(doc);
        doc.save('availability-report.pdf');
    };

    if (loading) {
        return <ModuleLoader label="Loading Availability" />;
    }

    if (error && !data.length) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-[#f8fafc] p-8 gap-8">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                        <CalendarRange size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Timeline Connection Error</h2>
                        <p className="text-slate-500 max-w-md text-sm leading-relaxed">
                            We were unable to synchronize the resource availability timeline. Please verify that the backend server is active and accessible.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                    <div className="text-rose-600 text-[11px] font-bold uppercase tracking-widest bg-rose-50/50 px-4 py-2 rounded-lg border border-rose-100/50 w-full text-center">
                        {error}
                    </div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="w-full py-3.5 bg-CD_Blue text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} />
                        Reconnect Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const hasActiveFilters = selectedDept || selectedLocation || selectedProjects.length > 0 || selectedEmployee;

    return (
        <div className="flex min-h-full flex-col bg-[#f8fafc] p-3 text-mainTheme">
            <div className="mb-3 flex flex-col gap-2">
                {/* Header row: title + preview badge + reset + export */}
                <div className="flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Resource Availability</h1>
                            <p className="text-sm font-medium text-gray-500">Monitor organization-wide resource releases and upcoming availability.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end flex-shrink-0">
                        {/* Preview stats badge */}
                        <div className="inline-flex items-center divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white py-2 shadow-sm">
                            <div className="flex items-center gap-1.5 px-3">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total</span>
                                <span className="text-sm font-bold text-[#3BA9FB]">{previewStats.total}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Alloc</span>
                                <span className="text-sm font-bold text-emerald-500">{previewStats.allocated}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bench</span>
                                <span className="text-sm font-bold text-amber-500">{previewStats.bench}</span>
                            </div>
                        </div>

                        {/* Reset button — visible only when a filter is active */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                disabled={filterLoading}
                                title="Reset all filters"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RotateCcw size={14} />
                                Reset
                            </button>
                        )}

                        {/* Export button */}
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

                {/* Info bar: date range + inline filters + employee count */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_2px_12px_rgba(148,163,184,0.18)]">
                    {/* Date range pill — clickable calendar picker */}
                    <div className="relative shrink-0" ref={calendarRef}>
                        <button
                            type="button"
                            onClick={() => setIsCalendarOpen((v) => !v)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${isCalendarOpen
                                ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                        >
                            <CalendarRange size={16} className="text-blue-500" />
                            {formatDate(parseMonthInput(startMonth))} — {formatDate(new Date((parseMonthInput(endMonth) || new Date()).getFullYear(), (parseMonthInput(endMonth) || new Date()).getMonth() + 1, 0))}
                            <ChevronDown size={11} className={`text-blue-400 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCalendarOpen && (
                            <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-blue-100 bg-white p-4 shadow-xl">
                                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Date Range</p>

                                <div className="flex flex-col gap-3">
                                    {/* Start month */}
                                    <div>
                                        <label className="mb-1 block text-[11px] font-bold text-slate-500">From</label>
                                        <input
                                            type="month"
                                            value={startMonth}
                                            max={endMonth}
                                            onChange={(e) => setStartMonth(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    {/* End month */}
                                    <div>
                                        <label className="mb-1 block text-[11px] font-bold text-slate-500">To</label>
                                        <input
                                            type="month"
                                            value={endMonth}
                                            min={startMonth}
                                            onChange={(e) => setEndMonth(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                {/* Quick presets */}
                                <div className="mt-4 border-t border-slate-100 pt-3">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Select</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { label: 'This Month', months: 0 },
                                            { label: '3 Months', months: 3 },
                                            { label: '6 Months', months: 6 },
                                            { label: '12 Months', months: 12 },
                                        ].map(({ label, months }) => {
                                            const now = new Date();
                                            const s = toMonthInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
                                            const e = toMonthInputValue(new Date(now.getFullYear(), now.getMonth() + months, 1));
                                            const isActive = startMonth === s && endMonth === e;
                                            return (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => { setStartMonth(s); setEndMonth(e); }}
                                                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${isActive
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                                                        }`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(false)}
                                    className="mt-3 w-full rounded-xl bg-blue-500 py-2 text-sm font-bold text-white hover:bg-blue-600"
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Department dropdown */}
                    <div className="relative">
                        <select
                            value={selectedDept}
                            onChange={(e) => handleDeptChange(e.target.value)}
                            disabled={filterLoading}
                            className={`appearance-none cursor-pointer rounded-full border py-2 pl-4 pr-8 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3BA9FB] disabled:cursor-not-allowed disabled:opacity-60 ${selectedDept
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            style={{ maxWidth: '180px' }}
                        >
                            <option value="">All Departments</option>
                            {(filters.departments || []).map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>

                    {/* Location dropdown */}
                    <div className="relative">
                        <select
                            value={selectedLocation}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            disabled={filterLoading}
                            className={`appearance-none cursor-pointer rounded-full border py-2 pl-4 pr-8 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3BA9FB] disabled:cursor-not-allowed disabled:opacity-60 ${selectedLocation
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            style={{ maxWidth: '160px' }}
                        >
                            <option value="">All Locations</option>
                            {(filters.locations || []).map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>

                    {/* Project multi-select dropdown */}
                    <div className="relative" ref={projectDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsProjectDropdownOpen((current) => !current)}
                            className={`inline-flex items-center gap-1.5 rounded-full border py-2 pl-4 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3BA9FB] ${selectedProjects.length > 0
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {selectedProjects.length > 0 ? `${selectedProjects.length} Project${selectedProjects.length > 1 ? 's' : ''}` : 'All Projects'}
                            {selectedProjects.length > 0 && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); setSelectedProjects([]); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSelectedProjects([]); } }}
                                    className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-200"
                                >
                                    <X size={10} />
                                </span>
                            )}
                            {selectedProjects.length === 0 && (
                                <ChevronDown size={13} className={`text-slate-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                            )}
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white shadow-xl">
                                <div className="p-1.5">
                                    <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs ${selectedProjects.length === 0 ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedProjects.length === 0}
                                            onChange={() => setSelectedProjects([])}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#3BA9FB] focus:ring-[#3BA9FB]"
                                        />
                                        <span className="font-semibold">All Projects</span>
                                    </label>
                                </div>
                                <div className="custom-scrollbar max-h-[220px] overflow-y-auto border-t border-slate-100 p-1.5">
                                    {(filters.projects || []).map((project) => (
                                        <label
                                            key={project}
                                            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs ${selectedProjects.includes(project) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedProjects.includes(project)}
                                                onChange={() => toggleProject(project)}
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#3BA9FB] focus:ring-[#3BA9FB]"
                                            />
                                            <span className="truncate" title={project}>{project}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Employee search autocomplete */}
                    <div className="relative" ref={searchRef}>
                        <div className={`inline-flex items-center gap-2 rounded-full border py-2 pl-3.5 pr-3 text-sm ${selectedEmployee
                            ? 'border-violet-200 bg-violet-50'
                            : 'border-slate-200 bg-slate-50'
                            }`}>
                            <Search size={14} className={selectedEmployee ? 'text-violet-500' : 'text-slate-400'} />
                            <input
                                type="text"
                                value={selectedEmployee ? selectedEmployee : searchQuery}
                                placeholder="Search employee"
                                className="w-40 bg-transparent text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                onFocus={() => {
                                    if (selectedEmployee) {
                                        setSelectedEmployee('');
                                        setSearchQuery('');
                                    }
                                    setIsSearchOpen(true);
                                }}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setSelectedEmployee('');
                                    setIsSearchOpen(true);
                                }}
                            />
                            {(selectedEmployee || searchQuery) && (
                                <button
                                    type="button"
                                    onClick={() => { setSelectedEmployee(''); setSearchQuery(''); setIsSearchOpen(false); }}
                                    className="rounded-full p-0.5 hover:bg-slate-200"
                                >
                                    <X size={10} className="text-slate-400" />
                                </button>
                            )}
                        </div>

                        {isSearchOpen && searchSuggestions.length > 0 && (
                            <div className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                {searchSuggestions.map((emp) => (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                                        onClick={() => {
                                            setSelectedEmployee(emp.name);
                                            setSearchQuery('');
                                            setIsSearchOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-violet-50"
                                    >
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-600">
                                            {(emp.name || 'U').charAt(0).toUpperCase()}
                                        </span>
                                        <span className="truncate font-semibold text-slate-700">{emp.name || 'Unknown'}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {isSearchOpen && searchQuery.trim() && searchSuggestions.length === 0 && (
                            <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
                                <p className="text-xs text-slate-400">No employees match <span className="font-semibold text-slate-600">"{searchQuery}"</span></p>
                            </div>
                        )}
                    </div>

                    {/* Employee count */}
                    <div className="ml-auto text-sm font-semibold text-slate-500">
                        {filterLoading ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-500">
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-b border-t border-blue-500" />
                                Loading…
                            </span>
                        ) : (
                            `${filteredDisplayData.length} employees loaded`
                        )}
                    </div>
                </div>
            </div>

            <div
                ref={timelineRef}
                className="custom-scrollbar relative overflow-auto rounded-2xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(148,163,184,0.20)] max-h-[calc(100vh-220px)]"
                style={{ cursor: 'grab' }}
                onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    isDragging.current = true;
                    dragStart.current = {
                        x: e.clientX,
                        y: e.clientY,
                        scrollLeft: timelineRef.current.scrollLeft,
                        scrollTop: timelineRef.current.scrollTop,
                    };
                    timelineRef.current.style.cursor = 'grabbing';
                    timelineRef.current.style.userSelect = 'none';
                }}
                onMouseMove={(e) => {
                    if (!isDragging.current) return;
                    const dx = e.clientX - dragStart.current.x;
                    const dy = e.clientY - dragStart.current.y;
                    timelineRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
                    timelineRef.current.scrollTop = dragStart.current.scrollTop - dy;
                }}
                onMouseUp={() => {
                    isDragging.current = false;
                    timelineRef.current.style.cursor = 'grab';
                    timelineRef.current.style.userSelect = '';
                }}
                onMouseLeave={() => {
                    if (isDragging.current) {
                        isDragging.current = false;
                        timelineRef.current.style.cursor = 'grab';
                        timelineRef.current.style.userSelect = '';
                    }
                }}
            >
                <table className="border-separate border-spacing-0 table-fixed" style={{ minWidth: `${STICKY_COLUMNS_WIDTH + (timelineMonths.length * MONTH_WIDTH)}px` }}>
                    <thead>
                        <tr className="shadow-[0_2px_6px_rgba(148,163,184,0.12)]">
                            <th className="sticky top-0 left-0 z-40 h-14 w-44 border-b-2 border-r border-slate-200 bg-slate-50 px-4 text-left">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee</span>
                            </th>
                            <th className="sticky top-0 left-44 z-40 h-14 w-64 border-b-2 border-r border-slate-200 bg-slate-50 px-4 text-left">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Project / Allocation</span>
                            </th>
                            {timelineMonths.map((month, index) => (
                                <th
                                    key={month.key}
                                    className={`sticky top-0 z-30 border-b-2 border-r border-slate-200 p-0 ${month.isCurrent ? 'bg-blue-50' : index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
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
                        {filteredDisplayData.map((employee, employeeIndex) => {
                            const allocations = Array.isArray(employee.allocations) && employee.allocations.length > 0
                                ? employee.allocations
                                : [{ project_name: 'Unassigned', allocation_percentage: 0, project_tags: 'N/A', start_date: null, end_date: null }];

                            return (
                                <React.Fragment key={employee.employee_id}>
                                    {allocations.map((allocation, allocationIndex) => {
                                        const color = getProjectColor(allocationIndex);
                                        const barStyle = getBarStyle(allocation.start_date, allocation.end_date);
                                        const showBar = barStyle && (allocation.allocation_percentage ?? 0) > 0;
                                        const rowBackground = employeeIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                                        const isLastAllocation = allocationIndex === allocations.length - 1;
                                        const accentColor = employeeIndex % 2 === 0 ? '#60a5fa' : '#818cf8';

                                        return (
                                            <tr key={`${employee.employee_id}-${allocationIndex}`} className={`h-12 ${rowBackground} hover:bg-blue-50/30 transition-colors`}>
                                                {allocationIndex === 0 && (
                                                    <td className={`sticky left-0 z-20 border-b-2 border-r border-slate-200 px-4 py-2 ${rowBackground}`} rowSpan={allocations.length} style={{ width: '176px', minWidth: '176px', backgroundColor: rowBackground === 'bg-white' ? '#ffffff' : '#f8fafc', borderLeft: `3px solid ${accentColor}`, boxShadow: '2px 0 6px rgba(0,0,0,0.05)' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/info/employee/${employee.employee_id}`, {
                                                                state: {
                                                                    from: {
                                                                        pathname: location.pathname,
                                                                        search: location.search,
                                                                        hash: location.hash,
                                                                        state: location.state || null
                                                                    }
                                                                }
                                                            })}
                                                            className="font-bold text-[13px] leading-tight text-blue-600 hover:text-blue-800 hover:underline text-left transition-colors cursor-pointer"
                                                        >
                                                            {employee.employee_name}
                                                        </button>
                                                        <div className="text-[10px] text-slate-400">ID: {employee.employee_id}</div>
                                                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{employee.department || 'No Department'}</div>
                                                    </td>
                                                )}

                                                <td className={`sticky left-44 z-20 overflow-hidden border-r border-slate-100 px-4 py-2 ${rowBackground} ${isLastAllocation ? 'border-b-2 border-slate-200' : 'border-b border-slate-100'}`} style={{ width: '256px', minWidth: '256px', backgroundColor: rowBackground === 'bg-white' ? '#ffffff' : '#f8fafc' }}>
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

                                                <td colSpan={timelineMonths.length} className={`relative h-12 overflow-hidden p-0 ${isLastAllocation ? 'border-b-2 border-slate-200' : 'border-b border-slate-100'}`}>
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
        </div>
    );
};

export default Availability;
