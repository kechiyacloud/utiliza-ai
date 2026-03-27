import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Target, Briefcase, ArrowLeft, Loader2, Save, Users, X, Check, Pencil, CalendarDays, Plus, Trash2, Clock, Zap, Activity, CheckCircle, Download, FileText, FileSpreadsheet, Table as TableIcon, ChevronDown, Search } from 'lucide-react';
import axios from '../../api/axios';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the Monday of the ISO week containing the given date. */
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Returns ISO week number (1–53) for a given date. */
function getISOWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/** Formats a Date as "Mar 17" */
function fmtDate(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildWeekDescriptor(mondayDate) {
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() + 6);
    const today = new Date();
    today.setHours(0,0,0,0);
    const currMonday = getMonday(today);
    
    const isPast = mondayDate < currMonday;
    const isCurrent = mondayDate.getTime() === currMonday.getTime();
    const isFuture = mondayDate > currMonday;

    const wkNum = getISOWeekNumber(mondayDate);
    const yr = mondayDate.getFullYear();
    const yearWeek = `${yr}-${wkNum}`;

    let label = isCurrent ? "This Week" : (isPast ? `Week ${wkNum}` : `Week ${wkNum}`);
    
    return { label, dateRange: `${fmtDate(mondayDate)} – ${fmtDate(sunday)}`, yearWeek, isPast, isCurrent, isFuture, year: yr, weekNum: wkNum, monday: new Date(mondayDate), sunday: new Date(sunday) };
}

function getViewWeeks(mode, startStr, endStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currMonday = getMonday(today);

    let startMonday, endMonday;

    if (mode === 'previous') {
        if (!startStr) return [];
        const pStart = new Date(startStr);
        pStart.setHours(0,0,0,0);
        startMonday = getMonday(pStart);
        endMonday = new Date(currMonday);
        endMonday.setDate(currMonday.getDate() - 7);
        if (startMonday > endMonday) return [];
    } else if (mode === 'next') {
        if (!endStr) return [];
        const pEnd = new Date(endStr);
        pEnd.setHours(0,0,0,0);
        startMonday = new Date(currMonday);
        startMonday.setDate(currMonday.getDate() + 7);
        endMonday = getMonday(pEnd);
        if (startMonday > endMonday) return [];
    } else {
        startMonday = new Date(currMonday);
        endMonday = new Date(currMonday);
        endMonday.setDate(currMonday.getDate() + 21); // +3 weeks
    }

    const weeks = [];
    let cur = new Date(startMonday);
    while (cur <= endMonday && weeks.length < 300) {
        weeks.push(buildWeekDescriptor(cur));
        cur.setDate(cur.getDate() + 7);
    }

    if (weeks.length === 0) {
        for (let i = 0; i < 4; i++) {
            const mockDate = new Date(currMonday);
            mockDate.setDate(currMonday.getDate() + i * 7);
            const desc = buildWeekDescriptor(mockDate);
            desc.label = i === 0 ? "This Week" : `Week ${i + 1}`;
            desc.dateRange = 'Dates not set';
            weeks.push(desc);
        }
    }
    return weeks;
}

const WEEK_DEFAULT_HOURS = 40;
// Removed UTILIZATION_FILTERS as they were replaced by View Mode Tabs

/** Strips leading zeros from a numeric string while preserving empty string */
function stripLeadingZeros(val) {
    if (val === '' || val === null || val === undefined) return '';
    const str = String(val);
    if (str === '') return '';
    // Keep empty, keep a single '0', strip leading zeros from multi-digit strings
    const stripped = str.replace(/^0+(\d)/, '$1');
    return stripped;
}

/** Converts an allocation percentage to per-week hours (max 40) */
function allocPctToHours(pct) {
    const hours = Math.round((Number(pct) * WEEK_DEFAULT_HOURS) / 100);
    return Math.min(WEEK_DEFAULT_HOURS, Math.max(0, hours));
}

function normalizeAllocationRow(row = {}) {
    const normalized = { 
        ...row,
        weekly_hours: row.weekly_hours || {},
        allocation_pct: row.allocation_percentage ?? row.allocation_pct ?? 0
    };
    return normalized;
}

function getAllocationCategory(percentage) {
    const pct = Number(percentage) || 0;
    if (pct > 100) return 'over';
    if (pct >= 75) return 'fully';
    if (pct >= 40) return 'optimal';
    return 'under';
}

function getResourceAllocationPct(row, visibleWeeks = []) {
    // Use stored allocation_pct if available
    if (row?.allocation_pct !== undefined && row?.allocation_pct !== null && row?.allocation_pct !== '') {
        return Number(row.allocation_pct) || 0;
    }
    if (!visibleWeeks || visibleWeeks.length === 0) return 0;
    const totalHours = visibleWeeks.reduce((sum, wk) => sum + Number((row.weekly_hours || {})[wk.yearWeek] || 0), 0);
    const maxCapacity = WEEK_DEFAULT_HOURS * visibleWeeks.length;
    if (maxCapacity <= 0) return 0;
    return Math.round((totalHours / maxCapacity) * 100);
}

// ─── AllocationTable Component ────────────────────────────────────────────────


const SearchableDropdown = ({ items, selectedId, onSelect, placeholder, label, disabled = false }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedItem = items.find(i => String(i.id) === String(selectedId) || i.employee_id === selectedId || (i.name && i.name === selectedId));
    const filtered = items.filter(i => (i.name || i.employee_name || '').toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full p-2.5 bg-gray-50/80 border rounded-lg text-xs outline-none text-left font-semibold transition-all flex items-center justify-between gap-2 shadow-sm
                    ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : ''}
                    ${!disabled && isOpen ? 'ring-2 ring-blue-100 bg-white border-blue-400 shadow-blue-50/50' : 'border-gray-200 hover:border-blue-300 hover:bg-white'}`}
            >
                <div className="truncate pr-2">
                    <span className={selectedItem ? 'text-slate-700' : 'text-slate-400'}>
                        {selectedItem ? (selectedItem.name || selectedItem.employee_name) : placeholder || `Select ${label}`}
                    </span>
                </div>
                <Search size={12} className={`shrink-0 transition-colors ${isOpen ? 'text-blue-500' : 'text-slate-300'}`} />
            </button>

            {!disabled && isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2.5 border-b border-slate-50 bg-slate-50/30">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Filter ${label.toLowerCase()}...`}
                                className="w-full pl-8 pr-3 py-2 text-[11px] bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-medium"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Search size={20} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-[11px] text-slate-400 font-medium">No {label.toLowerCase()} found</p>
                            </div>
                        ) : (
                            filtered.map((item) => (
                                <button
                                    type="button"
                                    key={item.id || item.employee_id}
                                    onClick={() => {
                                        onSelect(item);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-xs transition-all flex items-center justify-between group
                                        ${(String(item.id) === String(selectedId) || item.employee_id === selectedId || (item.name && item.name === selectedId))
                                            ? 'bg-blue-50 text-blue-700 font-bold'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-medium'
                                        }`}
                                >
                                    <span className="truncate">{item.name || item.employee_name}</span>
                                    {(String(item.id) === String(selectedId) || item.employee_id === selectedId || (item.name && item.name === selectedId)) && (
                                        <CheckCircle size={10} className="text-blue-500" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const W_KEYS = ['w1', 'w2', 'w3', 'w4'];

const BulkAllocationModal = ({ isOpen, onClose, onConfirm, employees }) => {
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [hours, setHours] = useState({ w1: WEEK_DEFAULT_HOURS, w2: WEEK_DEFAULT_HOURS, w3: WEEK_DEFAULT_HOURS, w4: WEEK_DEFAULT_HOURS });
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filteredEmployees = employees.filter(emp => 
        emp.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.role_designation.toLowerCase().includes(search.toLowerCase())
    );

    const toggleEmployee = (emp) => {
        if (selectedEmployees.some(e => e.employee_id === emp.employee_id)) {
            setSelectedEmployees(selectedEmployees.filter(e => e.employee_id !== emp.employee_id));
        } else {
            setSelectedEmployees([...selectedEmployees, emp]);
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedEmployees, hours);
        setSelectedEmployees([]);
        setHours({ w1: WEEK_DEFAULT_HOURS, w2: WEEK_DEFAULT_HOURS, w3: WEEK_DEFAULT_HOURS, w4: WEEK_DEFAULT_HOURS });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Bulk Resource Allocation</h3>
                        <p className="text-[11px] text-gray-500 font-medium">Select multiple employees and set their weekly hours</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 border border-transparent hover:border-gray-200 transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left: Employee Selection */}
                    <div className="flex-1 border-r border-gray-100 flex flex-col p-4 gap-3 bg-white">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search employees or roles..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                            {filteredEmployees.map(emp => {
                                const isSelected = selectedEmployees.some(e => e.employee_id === emp.employee_id);
                                return (
                                    <button 
                                        type="button"
                                        key={emp.employee_id}
                                        onClick={() => toggleEmployee(emp)}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border
                                            ${isSelected 
                                                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                                : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                            ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                                            {isSelected && <Check size={10} className="text-white" />}
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold leading-none ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{emp.employee_name}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">{emp.role_designation}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Hours Configuration */}
                    <div className="w-full md:w-64 p-4 flex flex-col gap-6 bg-slate-50/50">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Set Weekly Hours</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['w1', 'w2', 'w3', 'w4'].map((wk, i) => (
                                    <div key={wk} className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500">W{i+1} Hours</label>
                                        <input
                                                type="number"
                                                min="0" max="168"
                                                value={hours[wk]}
                                                onChange={e => setHours({
                                                    ...hours,
                                                    [wk]: e.target.value === '' ? WEEK_DEFAULT_HOURS : (Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : WEEK_DEFAULT_HOURS)
                                                })}
                                                className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm transition-all"
                                            />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-400 uppercase">Selected</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedEmployees.length}</span>
                            </div>
                            <button 
                                onClick={handleConfirm}
                                disabled={selectedEmployees.length === 0}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                            >
                                <Users size={14} /> Import Resources
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── ImportResourceModal ─────────────────────────────────────────────────────
const ImportResourceModal = ({ isOpen, onClose, onAdd, employees, existingEmployeeIds = [] }) => {
    const [search, setSearch] = useState('');
    const [selectedEmps, setSelectedEmps] = useState([]); // [{ emp, role, allocationPct }]
    const [globalPct, setGlobalPct] = useState(100);
    const [confirmed, setConfirmed] = useState(false);
    const confirmTimerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setSelectedEmps([]);
            setGlobalPct(100);
            setConfirmed(false);
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        }
    }, [isOpen]);

    useEffect(() => () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); }, []);

    if (!isOpen) return null;

    const filteredEmps = (employees || []).filter(emp => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return (emp.employee_name || '').toLowerCase().includes(term) ||
               (emp.role_designation || '').toLowerCase().includes(term) ||
               (emp.department || '').toLowerCase().includes(term);
    });

    const isInProject = (emp) => existingEmployeeIds.includes(String(emp.employee_id));
    const isSelected = (emp) => selectedEmps.some(s => s.emp.employee_id === emp.employee_id);

    const toggleEmp = (emp) => {
        if (isInProject(emp)) return;
        setSelectedEmps(prev =>
            prev.some(s => s.emp.employee_id === emp.employee_id)
                ? prev.filter(s => s.emp.employee_id !== emp.employee_id)
                : [...prev, { emp, role: emp.role_designation || emp.role || '', allocationPct: globalPct }]
        );
    };

    const selectAll = () => {
        const addable = filteredEmps.filter(e => !isInProject(e) && !isSelected(e));
        setSelectedEmps(prev => [...prev, ...addable.map(emp => ({ emp, role: emp.role_designation || emp.role || '', allocationPct: globalPct }))]);
    };

    const clearAll = () => setSelectedEmps([]);

    const applyGlobalPct = () => setSelectedEmps(prev => prev.map(s => ({ ...s, allocationPct: globalPct })));

    const updateRow = (empId, field, value) =>
        setSelectedEmps(prev => prev.map(s => s.emp.employee_id === empId ? { ...s, [field]: value } : s));

    const removeRow = (empId) => setSelectedEmps(prev => prev.filter(s => s.emp.employee_id !== empId));

    const handleAdd = () => {
        if (!selectedEmps.length) return;
        selectedEmps.forEach(({ emp, role, allocationPct: pct }) => {
            const safePct = Math.min(100, Math.max(0, Number(pct) || 0));
            const hrs = Math.round((safePct * 40) / 100);
            onAdd({ employee_id: emp.employee_id, name: emp.employee_name || emp.name || '', role: role || 'No role assigned', allocation_pct: safePct, w1: hrs, w2: hrs, w3: hrs, w4: hrs });
        });
        setConfirmed(true);
        confirmTimerRef.current = setTimeout(onClose, 2200);
    };

    const countSelectable = filteredEmps.filter(e => !isInProject(e)).length;
    const count = selectedEmps.length;
    const globalHrs = Math.round((Math.min(100, Math.max(0, Number(globalPct) || 0)) * 40) / 100);

    return (
        <div className="fixed inset-0 z-[150] flex flex-col bg-white">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                        <Users size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Import Resources</h2>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{employees.length} employees available · select one or more to add</p>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200">
                    <X size={18} />
                </button>
            </div>

            {/* Success Banner */}
            {confirmed && (
                <div className="shrink-0 mx-6 mt-4 flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
                    <CheckCircle size={22} className="text-emerald-500 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-800">{count} resource{count !== 1 ? 's' : ''} added successfully!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Closing automatically…</p>
                    </div>
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                        Close
                    </button>
                </div>
            )}

            {!confirmed && (
                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* LEFT – Employee list */}
                    <div className="flex flex-col w-[55%] border-r border-slate-100 overflow-hidden">
                        {/* Search + bulk */}
                        <div className="shrink-0 px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, role or department…" autoFocus
                                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white shadow-sm transition-all" />
                            </div>
                            <button type="button" onClick={selectAll} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors whitespace-nowrap">
                                Select All ({countSelectable})
                            </button>
                            {count > 0 && (
                                <button type="button" onClick={clearAll} className="px-3 py-2 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-100 border border-rose-100 transition-colors whitespace-nowrap">
                                    Clear ({count})
                                </button>
                            )}
                        </div>
                        {/* Rows */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredEmps.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                                    <Search size={28} className="opacity-30" />
                                    <p className="text-sm font-medium">No employees found</p>
                                </div>
                            ) : filteredEmps.map(emp => {
                                const sel = isSelected(emp);
                                const dup = isInProject(emp);
                                return (
                                    <button key={emp.employee_id} type="button" onClick={() => toggleEmp(emp)} disabled={dup}
                                        className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all border-b border-slate-50 last:border-0 ${dup ? 'opacity-40 cursor-not-allowed bg-slate-50/50' : sel ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'}`}>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-blue-600 border-blue-600 shadow-sm' : 'border-slate-300 bg-white'}`}>
                                            {sel && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${sel ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {(emp.employee_name || 'E')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${sel ? 'text-blue-800' : 'text-slate-800'}`}>
                                                {emp.employee_name}
                                                {dup && <span className="ml-2 text-[10px] text-slate-400 font-normal bg-slate-100 px-1.5 py-0.5 rounded-full">already added</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{emp.role_designation}{emp.department ? ` · ${emp.department}` : ''}</p>
                                        </div>
                                        {sel && <CheckCircle size={16} className="text-blue-500 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT – Config panel */}
                    <div className="flex flex-col w-[45%] overflow-hidden bg-slate-50/30">
                        {/* Global pct */}
                        <div className="shrink-0 px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-extrabold text-slate-700">
                                    Selected <span className="ml-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{count}</span>
                                </h3>
                            </div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Allocation %</label>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex-1">
                                    <input type="number" min="0" max="100" value={globalPct}
                                        onChange={e => setGlobalPct(e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                        onBlur={e => { if (e.target.value === '') setGlobalPct(0); }}
                                        className="flex-1 min-w-0 text-sm font-bold text-center outline-none bg-transparent" />
                                    <span className="text-slate-400 text-sm font-bold">%</span>
                                </div>
                                {count > 0 && (
                                    <button type="button" onClick={applyGlobalPct} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 border border-indigo-100 transition-colors whitespace-nowrap">
                                        Apply All
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">→ {globalHrs}h / week per resource</p>
                        </div>
                        {/* Per-employee list */}
                        <div className="flex-1 overflow-y-auto py-2 px-4">
                            {count === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                                    <Users size={28} className="opacity-20" />
                                    <p className="text-sm font-medium">No employees selected</p>
                                    <p className="text-xs text-slate-300">Select from the list on the left</p>
                                </div>
                            ) : selectedEmps.map(({ emp, role, allocationPct: empPct }) => {
                                const empHrs = Math.round((Math.min(100, Math.max(0, Number(empPct) || 0)) * 40) / 100);
                                return (
                                    <div key={emp.employee_id} className="mb-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 bg-blue-50/40">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                                                {(emp.employee_name || 'E')[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{emp.employee_name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{emp.role_designation}</p>
                                            </div>
                                            <button type="button" onClick={() => removeRow(emp.employee_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <div className="px-4 pt-3 pb-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                Role <span className="text-blue-400 font-normal normal-case">(auto-assigned)</span>
                                            </label>
                                            <input type="text" value={role} onChange={e => updateRow(emp.employee_id, 'role', e.target.value)}
                                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-slate-50 font-medium" />
                                        </div>
                                        <div className="px-4 pt-2 pb-3">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Allocation %</label>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex-1">
                                                    <input type="number" min="0" max="100" value={empPct}
                                                        onChange={e => updateRow(emp.employee_id, 'allocationPct', e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                                        onBlur={e => { if (e.target.value === '') updateRow(emp.employee_id, 'allocationPct', 0); }}
                                                        className="flex-1 min-w-0 text-xs font-bold text-center outline-none bg-transparent" />
                                                    <span className="text-slate-400 text-xs font-bold">%</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">{empHrs}h/wk</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Footer */}
                        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={handleAdd} disabled={count === 0}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200">
                                <Plus size={16} /> Add {count > 0 ? `${count} ` : ''}Resource{count !== 1 ? 's' : ''} to Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AllocationTable = ({ projectId, projectStart, projectEnd, rows, employees, rolesList, globalAllocations, onUpdate, onClearAll, viewMode, setViewMode, visibleWeeks }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [localRows, setLocalRows] = useState(rows);

    useEffect(() => {
        setLocalRows((rows || []).map(normalizeAllocationRow));
    }, [rows]);

    const displayRows = useMemo(() => {
        return (localRows || []).map((row, index) => ({ ...row, _sourceIndex: index }));
    }, [localRows]);

    const handleAddRow = () => {
        setLocalRows([...localRows, normalizeAllocationRow({ name: '', role: '', w1: '', w2: '', w3: '', w4: '' })]);
    };

    const getRowTotal = (row) => {
        return visibleWeeks.reduce((sum, wk) => {
            const rawVal = (row.weekly_hours || {})[wk.yearWeek];
            const hours = (rawVal === '' || rawVal === undefined) 
                ? allocPctToHours(row.allocation_pct) 
                : Number(rawVal || 0);
            return sum + hours;
        }, 0);
    };

    const handleRemoveRow = (index) => {
        setLocalRows(localRows.filter((_, i) => i !== index));
    };

    const getOtherProjectHours = (empId, yearWeek) => {
        if (!empId || !globalAllocations) return 0;
        const totalAllProjects = (globalAllocations[empId] || {})[yearWeek] || 0;
        const thisProjectRow = rows.find(r => r.employee_id === empId);
        const thisProjectDBHours = thisProjectRow ? Number((thisProjectRow.weekly_hours || {})[yearWeek] || 0) : 0;
        return totalAllProjects - thisProjectDBHours;
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...localRows];
        const currentRow = { ...(newRows[index] || {}) };
        if (!currentRow.weekly_hours) currentRow.weekly_hours = {};

        if (field === 'allocation_pct') {
            if (value === '') {
                currentRow.allocation_pct = '';
            } else {
                const cleaned = stripLeadingZeros(value);
                const rawPct = Number(cleaned);
                
                // Edge case handling: prevent negative or > 100
                if (rawPct < 0 || rawPct > 100) return;
                
                // Ensure consistent rounding, e.g. 33.33%
                const pct = Math.round(rawPct * 100) / 100;
                currentRow.allocation_pct = pct;
                const hrs = (pct / 100) * WEEK_DEFAULT_HOURS;
                
                let exceeded = false;
                let minRemaining = WEEK_DEFAULT_HOURS;
                
                if (currentRow.employee_id) {
                    visibleWeeks.forEach(wk => { 
                        const otherProjHours = getOtherProjectHours(currentRow.employee_id, wk.yearWeek);
                        const maxAllowed = Math.max(0, WEEK_DEFAULT_HOURS - otherProjHours);
                        minRemaining = Math.min(minRemaining, maxAllowed);
                        
                        const finalHrs = Math.min(hrs, maxAllowed);
                        if (hrs > maxAllowed) exceeded = true;
                        currentRow.weekly_hours[wk.yearWeek] = finalHrs; 
                    });
                    if (exceeded) {
                        alert(`You can only allocate up to ${minRemaining} hours. Allocation exceeded! Max allowed is ${WEEK_DEFAULT_HOURS} hours/week`);
                    }
                } else {
                    visibleWeeks.forEach(wk => { currentRow.weekly_hours[wk.yearWeek] = hrs; });
                }
            }
        } else if (field.startsWith('week_')) {
            const yearWeek = field.replace('week_', '');
            if (value === '') {
                currentRow.weekly_hours[yearWeek] = '';
            } else {
                const cleaned = stripLeadingZeros(String(value));
                const parsed = Number(cleaned);
                if (parsed < 0) return; // Prevent negative values
                
                let clamped = Number.isFinite(parsed) ? parsed : 0;
                
                // Enforce Cross-Project Hours Limit
                if (currentRow.employee_id) {
                    const otherProjHours = getOtherProjectHours(currentRow.employee_id, yearWeek);
                    const remainingHours = Math.max(0, WEEK_DEFAULT_HOURS - otherProjHours);
                    if (clamped > remainingHours) {
                        alert(`You can only allocate up to ${remainingHours} hours. Allocation exceeded! Max allowed is ${WEEK_DEFAULT_HOURS} hours/week`);
                        clamped = remainingHours;
                    }
                } else {
                    if (clamped > WEEK_DEFAULT_HOURS) {
                        alert(`Allocation exceeded! Max allowed is ${WEEK_DEFAULT_HOURS} hours/week`);
                        clamped = WEEK_DEFAULT_HOURS;
                    }
                }
                
                currentRow.weekly_hours[yearWeek] = clamped;
            }
            const totalHours = visibleWeeks.reduce((sum, wk) => sum + Number(currentRow.weekly_hours[wk.yearWeek] || 0), 0);
            const maxCapacity = WEEK_DEFAULT_HOURS * visibleWeeks.length;
            currentRow.allocation_pct = maxCapacity > 0 ? Math.round((totalHours / maxCapacity) * 10000) / 100 : 0;
        } else {
            currentRow[field] = value;
        }

        newRows[index] = currentRow;
        setLocalRows(newRows);
    };

    const handleBulkConfirm = (selectedEmployees, bulkHours) => {
        const newResources = selectedEmployees.map(emp => ({
            employee_id: emp.employee_id,
            name: emp.employee_name,
            role: emp.role_designation,
            ...normalizeAllocationRow(bulkHours)
        }));
        setLocalRows([...localRows, ...newResources]);
    };

    const handleExport = async (format) => {
        const exportData = localRows.map(r => {
            const rowTotal = getRowTotal(r);
            const obj = {
                'Resource': r.name,
                'Role': r.role,
                'Start Date': r.allocation_start_date || '—',
                'End Date': r.allocation_end_date || '—',
            };
            visibleWeeks.forEach(wk => {
                const rawVal = (r.weekly_hours || {})[wk.yearWeek];
                const hours = (rawVal === '' || rawVal === undefined) 
                    ? allocPctToHours(r.allocation_pct) 
                    : Number(rawVal || 0);
                obj[wk.label] = `${hours}h`;
            });
            obj['Total'] = `${rowTotal}h`;
            return obj;
        });

        const fileName = `Allocation_${projectId}_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') {
            exportToCSV(exportData, fileName);
        } else if (format === 'excel') {
            exportToExcel(exportData, fileName);
        } else if (format === 'pdf') {
            try {
                const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                // ── Title block ──
                doc.setFillColor(30, 64, 175);
                doc.rect(0, 0, pageWidth, 52, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.setTextColor(255, 255, 255);
                doc.text('Resource Allocation', 36, 28);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(200, 216, 255);
                doc.text(`Project: ${projectId}`, 36, 43);
                doc.text(`Generated: ${today}`, pageWidth - 36, 43, { align: 'right' });

                // ── Summary strip ──
                doc.setFillColor(241, 245, 249);
                doc.rect(0, 52, pageWidth, 22, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(100, 116, 139);
                doc.text(`Total Resources: ${localRows.length}`, 36, 66);
                const grandTotal = visibleWeeks.reduce((s, wk) => s + localRows.reduce((a, r) => a + Number((r.weekly_hours || {})[wk.yearWeek] || 0), 0), 0);
                doc.text(`Total Hours Allocated: ${grandTotal}h`, 200, 66);

                // ── Table ──
                const head = [[
                    'Resource', 'Role', 'Start', 'End', 'Alloc %',
                    ...visibleWeeks.map(w => w.label), 'Total'
                ]];

                const body = localRows.map(r => {
                    const total = getRowTotal(r);
                    const pctDisp = r.allocation_pct !== undefined && r.allocation_pct !== null && r.allocation_pct !== ''
                        ? `${r.allocation_pct}%`
                        : `${getResourceAllocationPct(r, visibleWeeks)}%`;
                    const rowWeeks = visibleWeeks.map(wk => {
                        const rawVal = (r.weekly_hours || {})[wk.yearWeek];
                        const hours = (rawVal === '' || rawVal === undefined) 
                            ? allocPctToHours(r.allocation_pct) 
                            : Number(rawVal || 0);
                        return `${hours}h`;
                    });
                    return [
                        r.name || '—',
                        r.role || '—',
                        r.allocation_start_date || '—',
                        r.allocation_end_date || '—',
                        pctDisp,
                        ...rowWeeks,
                        `${total}h`,
                    ];
                });

                const colStyles = {
                    0: { cellWidth: 110, halign: 'left', fontStyle: 'bold' },
                    1: { cellWidth: 90, halign: 'left' },
                    2: { cellWidth: 62, halign: 'center' },
                    3: { cellWidth: 62, halign: 'center' },
                    4: { cellWidth: 48, halign: 'center', fontStyle: 'bold' },
                };
                
                // Dynamic columns logic
                visibleWeeks.forEach((wk, i) => {
                    colStyles[5 + i] = { cellWidth: 48, halign: 'center' };
                });
                const totalColIdx = 5 + visibleWeeks.length;
                colStyles[totalColIdx] = { cellWidth: 54, halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] };

                autoTable(doc, {
                    head,
                    body,
                    startY: 80,
                    margin: { left: 36, right: 36 },
                    styles: {
                        fontSize: 8.5,
                        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
                        lineColor: [226, 232, 240],
                        lineWidth: 0.5,
                        font: 'helvetica',
                        textColor: [30, 41, 59],
                        overflow: 'linebreak',
                    },
                    headStyles: {
                        fillColor: [30, 64, 175],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 8.5,
                        halign: 'center',
                        cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
                    },
                    columnStyles: colStyles,
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    rowStyles: { fillColor: [255, 255, 255] },
                    foot: [[
                        'TOTAL', '', '', '', '',
                        ...visibleWeeks.map(wk => {
                            const wTotal = localRows.reduce((a, r) => a + Number((r.weekly_hours || {})[wk.yearWeek] || 0), 0);
                            return `${wTotal}h`;
                        }),
                        `${grandTotal}h`,
                    ]],
                    footStyles: {
                        fillColor: [241, 245, 249],
                        textColor: [30, 41, 59],
                        fontStyle: 'bold',
                        fontSize: 8.5,
                        halign: 'center',
                        cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
                    },
                    didParseCell(data) {
                        if (data.section === 'foot' && data.column.index === 0) {
                            data.cell.styles.halign = 'left';
                        }
                    },
                    showFoot: 'lastPage',
                });

                // ── Page numbers ──
                const totalPages = doc.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Page ${i} of ${totalPages}`,
                        pageWidth / 2,
                        doc.internal.pageSize.getHeight() - 14,
                        { align: 'center' }
                    );
                }

                doc.save(`${fileName}.pdf`);
            } catch (error) {
                console.error('PDF export failed:', error);
                alert('PDF export failed. Please try again.');
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError('');
        try {
            const payload = {
                resources: localRows.map((row) => ({
                    ...normalizeAllocationRow(row),
                    employee_id: row.employee_id || null,
                    name: (row.name || '').trim(),
                    role: (row.role || '').trim(),
                }))
            };

            await axios.put(`/projects/${projectId}/resources`, payload);
            if (onUpdate) await onUpdate();
            setIsEditing(false);
        } catch (error) {
            console.error('Saving allocations failed:', error);
            const detail = error?.response?.data?.detail;
            let msg = 'Failed to save resource allocations.';
            if (typeof detail === 'string') {
                msg = detail;
            } else if (Array.isArray(detail)) {
                msg = detail.map(d => d.msg || JSON.stringify(d)).join(', ');
            } else if (detail && typeof detail === 'object') {
                msg = detail.msg || JSON.stringify(detail);
            }
            setSaveError(msg);
            alert(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAllResources = async () => {
        const previousRows = [...localRows];
        setIsDeletingAll(true);
        setSaveError('');
        setStatusMessage('');
        try {
            if (onClearAll) onClearAll();
            await axios.put(`/projects/${projectId}/resources`, { resources: [] });
            setLocalRows([]);
            if (onUpdate) await onUpdate();
            setIsDeleteAllModalOpen(false);
            setIsEditing(true);
            setStatusMessage('All resources deleted successfully');
        } catch (error) {
            console.error('Deleting all resources failed:', error);
            setLocalRows(previousRows);
            if (onClearAll) onClearAll(previousRows);
            const detail = error?.response?.data?.detail;
            let msg = 'Failed to delete all resources.';
            if (typeof detail === 'string') {
                msg = detail;
            } else if (Array.isArray(detail)) {
                msg = detail.map(d => d.msg || JSON.stringify(d)).join(', ');
            } else if (detail && typeof detail === 'object') {
                msg = detail.msg || JSON.stringify(detail);
            }
            setSaveError(msg);
            alert(msg);
        } finally {
            setIsDeletingAll(false);
        }
    };

    useEffect(() => {
        if (!statusMessage) return undefined;
        const timer = setTimeout(() => setStatusMessage(''), 2500);
        return () => clearTimeout(timer);
    }, [statusMessage]);

    const columnTotals = useMemo(() =>
        visibleWeeks.map(wk =>
            localRows.reduce((sum, r) => {
                const rawVal = (r.weekly_hours || {})[wk.yearWeek];
                const hours = (rawVal === '' || rawVal === undefined) 
                    ? allocPctToHours(r.allocation_pct) 
                    : Number(rawVal || 0);
                return sum + hours;
            }, 0)
        ), [localRows, visibleWeeks]);

    const getAllocationPct = (row) => {
        return getResourceAllocationPct(row);
    };

    if (localRows.length === 0 && !isEditing) {
        return (
            <div className="p-8 text-center text-gray-400 italic bg-gray-50/30 rounded-lg border border-dashed border-gray-200">
                No resources added yet.
                <div className="mt-4">
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-shadow shadow-md">
                        Start Allocating
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
                <div></div>
                <div className="flex items-center gap-2.5">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <button onClick={handleAddRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                <Plus size={14} /> Add Resource
                            </button>
                            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                <Users size={14} /> Import Resources
                            </button>
                            <button onClick={() => setIsDeleteAllModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors">
                                <Trash2 size={14} /> Clear All Resources
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
                            <Pencil size={14} /> Edit Allocation
                        </button>
                    )}
                    <div className="relative group inline-block">
                        <button 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Download size={14} /> 
                            Export
                            <ChevronDown size={12} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isExportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <button onClick={() => { handleExport('excel'); setIsExportMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                                        <FileSpreadsheet size={14} className="text-emerald-500" /> Excel (.xlsx)
                                    </button>
                                    <button onClick={() => { handleExport('csv'); setIsExportMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                                        <TableIcon size={14} className="text-blue-500" /> CSV (.csv)
                                    </button>
                                    <button onClick={() => { handleExport('pdf'); setIsExportMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors border-t border-slate-50">
                                        <FileText size={14} className="text-red-500" /> PDF Document
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {saveError && (
                <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
                    {saveError}
                </div>
            )}

            {statusMessage && (
                <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium">
                    {statusMessage}
                </div>
            )}

            {/* The previous ViewMode toggle was here, now moved up */}

            <div className="overflow-x-auto w-full rounded-xl border border-gray-100 shadow-sm bg-white">
                <table className="min-w-[1200px] text-sm">
                    <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[180px]">
                                        <div className="flex items-center gap-1.5"><Users size={13} /> Resource</div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[140px]">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Alloc. Start</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Alloc. End</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[100px]">
                                        Allocation
                                        <span className="ml-1 font-normal text-slate-400 normal-case">(100%=40h)</span>
                                    </th>
                                    {visibleWeeks.map((wk) => (
                                        <th key={wk.yearWeek} className={`px-3 py-3 text-center text-xs font-bold uppercase tracking-wider min-w-[110px] border-l border-slate-100 ${
                                            viewMode === 'previous' ? 'text-rose-600/80 bg-rose-50/30' : 
                                            viewMode === 'next' ? 'text-emerald-600/80 bg-emerald-50/30' : 
                                            'text-gray-600'
                                        }`}>
                                            <span className={`block ${wk.isCurrent ? 'text-blue-700' : viewMode === 'previous' ? 'text-rose-700' : viewMode === 'next' ? 'text-emerald-700' : ''}`}>{wk.label}</span>
                                            <span className={`block text-[10px] font-normal mt-0.5 normal-case ${viewMode === 'previous' ? 'text-rose-400' : viewMode === 'next' ? 'text-emerald-400' : 'text-slate-400'}`}>{wk.dateRange}</span>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[80px]">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Resource Type</th>
                                    {isEditing && <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[80px]">Actions</th>}
                                </tr>
                    </thead>
                    <tbody>
                        {localRows.length === 0 && isEditing && (
                            <tr>
                                <td colSpan={isEditing ? 12 : 11} className="px-4 py-8 text-center text-slate-400 text-sm">
                                    No resources added yet. Click Add Resource or Import Resources to start.
                                </td>
                            </tr>
                        )}
                        {displayRows.map((row) => {
                            const ridx = row._sourceIndex;
                            const rowTotal = getRowTotal(row);
                            const rowBg = ridx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                            return (
                                <tr key={ridx} className={`border-b border-gray-50 transition-colors ${rowBg} ${!isEditing && 'hover:bg-blue-50/40'}`}>
                                    <td className="px-4 py-3 font-semibold text-slate-800 min-w-[180px]">
                                        {isEditing ? (
                                            <SearchableDropdown 
                                                items={employees}
                                                selectedId={row.employee_id || row.name}
                                                onSelect={(emp) => {
                                                    // Prevent duplicates
                                                    const isDuplicate = localRows.some((m, i) => i !== ridx && m.employee_id === emp.employee_id);
                                                    if (isDuplicate) {
                                                        alert(`${emp.employee_name} is already added to this project.`);
                                                        return;
                                                    }

                                                    const nextRole = emp?.role || emp?.role_designation || 'No role assigned';
                                                    setLocalRows((current) => current.map((item, index) => (
                                                        index === ridx
                                                            ? normalizeAllocationRow({
                                                                ...item,
                                                                employee_id: emp?.employee_id || '',
                                                                name: emp?.employee_name || emp?.name || '',
                                                                role: nextRole,
                                                                billable_shadow: item.billable_shadow || 'Billable'
                                                            })
                                                            : item
                                                    )));
                                                }}
                                                placeholder="Select Employee"
                                                label="Employee"
                                            />
                                        ) : (
                                            row.employee_id ? (
                                                <Link
                                                    to={`/info/employee/${row.employee_id}`}
                                                    className="text-slate-800 no-underline cursor-pointer hover:underline underline-offset-2 decoration-slate-300 transition-colors"
                                                >
                                                    {row.name || '—'}
                                                </Link>
                                            ) : (
                                                row.name || '—'
                                            )
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs min-w-[140px]">
                                        {isEditing ? (
                                            <SearchableDropdown 
                                                items={rolesList.map(r => ({ id: r, name: r }))}
                                                selectedId={row.role || ''} 
                                                onSelect={(roleObj) => handleRowChange(ridx, 'role', roleObj.name || 'No role assigned')}
                                                placeholder="Select Role"
                                                label="Role"
                                            />
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium whitespace-nowrap">
                                                {row.role || 'No role assigned'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px] min-w-[120px]">
                                        {isEditing ? (
                                            <input type="date" value={row.allocation_start_date || ''} onChange={(e) => handleRowChange(ridx, 'allocation_start_date', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                        ) : (
                                            row.allocation_start_date || '—'
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px] min-w-[120px]">
                                        {isEditing ? (
                                            <input type="date" value={row.allocation_end_date || ''} onChange={(e) => handleRowChange(ridx, 'allocation_end_date', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                        ) : (
                                            row.allocation_end_date || '—'
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs min-w-[100px]">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1 justify-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    placeholder="0"
                                                    value={row.allocation_pct === '' ? '' : (row.allocation_pct ?? getAllocationPct(row))}
                                                    onChange={(e) => handleRowChange(ridx, 'allocation_pct', e.target.value)}
                                                    onBlur={(e) => {
                                                        if (e.target.value === '') handleRowChange(ridx, 'allocation_pct', 0);
                                                    }}
                                                    className="w-14 px-1 py-1 text-xs text-center border border-gray-200 rounded outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                        ) : !isEditing && row.employee_id ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate('/info/allocation', { state: { showBack: true, employeeId: row.employee_id, fromProjectId: projectId } })}
                                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors"
                                                title="View allocation dashboard"
                                            >
                                                {getAllocationPct(row)}%
                                            </button>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium whitespace-nowrap">
                                                {getAllocationPct(row)}%
                                            </span>
                                        )}
                                    </td>
                                    {visibleWeeks.map((wk) => {
                                        const rawVal = (row.weekly_hours || {})[wk.yearWeek];
                                        const hours = (rawVal === '' || rawVal === undefined) 
                                            ? allocPctToHours(row.allocation_pct) 
                                            : Number(rawVal || 0);
                                        const pct = Math.min(100, Math.round((hours / WEEK_DEFAULT_HOURS) * 100));
                                        const isCurrentWeek = wk.isCurrent;
                                        const barColor = hours === 0 ? 'bg-gray-200' :
                                            pct >= 100 ? 'bg-green-500' :
                                            pct >= 75 ? 'bg-blue-500' :
                                            pct >= 40 ? 'bg-indigo-400' :
                                            'bg-slate-300';
                                        
                                        const otherProjectHours = row.employee_id ? getOtherProjectHours(row.employee_id, wk.yearWeek) : 0;
                                        const remainingAllowed = Math.max(0, WEEK_DEFAULT_HOURS - otherProjectHours);
                                        // Past weeks or fully allocated (40h+) in other projects are read-only
                                        const isCellEditable = isEditing && !wk.isPast && remainingAllowed > 0;

                                        return (
                                            <td key={wk.yearWeek} className={`px-3 py-2.5 text-center border-l ${
                                                viewMode === 'previous' ? 'border-rose-50/50 bg-rose-50/20' : 
                                                viewMode === 'next' ? 'border-emerald-50/50 bg-emerald-50/20' : 
                                                'border-slate-100'
                                            } ${isCurrentWeek && !isEditing ? 'bg-blue-50/30' : ''}`}>
                                                {isCellEditable ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remainingAllowed}
                                                            step="0.1"
                                                            value={rawVal === '' ? '' : hours}
                                                            onChange={(e) => handleRowChange(ridx, `week_${wk.yearWeek}`, e.target.value)}
                                                            onBlur={(e) => {
                                                                if (e.target.value === '') handleRowChange(ridx, `week_${wk.yearWeek}`, 0);
                                                            }}
                                                            className={`w-14 px-1 py-1 text-xs text-center border rounded outline-none focus:ring-1 focus:ring-blue-100 bg-white transition-colors ${
                                                                hours > WEEK_DEFAULT_HOURS
                                                                    ? 'border-rose-400 text-rose-600'
                                                                    : 'border-gray-200 focus:border-blue-400'
                                                            }`}
                                                        />
                                                        {/* 'Rem: XXh' text removed per user request */}
                                                    </div>
                                                ) : (
                                                    hours === 0 ? (
                                                        <span className={`text-xs font-medium ${
                                                            viewMode === 'previous' ? 'text-rose-300' : 
                                                            viewMode === 'next' ? 'text-emerald-300' : 
                                                            'text-slate-300'
                                                        }`}>—</span>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`text-xs font-bold ${
                                                                pct >= 100 ? (viewMode === 'previous' ? 'text-rose-700' : viewMode === 'next' ? 'text-emerald-700' : 'text-green-600') : 
                                                                isCurrentWeek ? 'text-blue-700' : 
                                                                (viewMode === 'previous' ? 'text-rose-600' : viewMode === 'next' ? 'text-emerald-600' : 'text-slate-700')
                                                            }`}>
                                                                {hours}h
                                                            </span>
                                                            <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${
                                                                        viewMode === 'previous' ? (pct > 0 ? 'bg-rose-400' : 'bg-gray-200') :
                                                                        viewMode === 'next' ? (pct > 0 ? 'bg-emerald-400' : 'bg-gray-200') :
                                                                        barColor
                                                                    }`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3 text-center font-bold text-blue-700 border-l-2 border-slate-200 text-sm">
                                        {rowTotal > 0 ? `${rowTotal}h` : '—'}
                                    </td>
                                    <td className="px-4 py-3 min-w-[120px]">
                                        {isEditing ? (
                                            <select
                                                value={row.billable_shadow || 'Billable'}
                                                onChange={(e) => handleRowChange(ridx, 'billable_shadow', e.target.value)}
                                                className={`w-full px-2 py-1.5 text-xs border rounded-md outline-none focus:ring-1 bg-white cursor-pointer font-semibold
                                                    ${row.billable_shadow === 'Billable'
                                                        ? 'border-emerald-200 text-emerald-700 focus:border-emerald-400 focus:ring-emerald-100'
                                                        : row.billable_shadow === 'Non-billable'
                                                        ? 'border-amber-200 text-amber-700 focus:border-amber-400 focus:ring-amber-100'
                                                        : 'border-slate-200 text-slate-500 focus:border-slate-400 focus:ring-slate-100'
                                                    }`}
                                            >
                                                <option value="Billable">Billable</option>
                                                <option value="Non-billable">Non-billable</option>
                                                <option value="Shadow">Shadow</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap
                                                ${row.billable_shadow === 'Billable'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : row.billable_shadow === 'Non-billable'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                {row.billable_shadow || 'Billable'}
                                            </span>
                                        )}
                                    </td>
                                    {isEditing && (
                                        <td className="px-3 py-3 text-center">
                                            <button onClick={() => handleRemoveRow(ridx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Remove Resource">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {localRows.length > 0 && displayRows.length === 0 && (
                            <tr>
                                <td colSpan={isEditing ? 12 : 11} className="px-4 py-8 text-center text-slate-400 text-sm">
                                    No resources match the selected utilization filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-200">
                            <td className="px-4 py-3 font-extrabold text-slate-700 text-xs uppercase tracking-wider" colSpan={5}>
                                Total
                            </td>
                            {columnTotals.map((total, idx) => (
                                <td key={visibleWeeks[idx]?.yearWeek || idx} className={`px-3 py-3 text-center font-bold text-sm ${
                                    viewMode === 'previous' ? 'text-rose-700 border-l border-rose-100 bg-rose-50/10' : 
                                    viewMode === 'next' ? 'text-emerald-700 border-l border-emerald-100 bg-emerald-50/10' : 
                                    'text-slate-700 border-l border-slate-200'
                                } ${visibleWeeks[idx]?.isCurrent ? 'bg-blue-50 text-blue-700' : ''}`}>
                                    {total > 0 ? `${total}h` : '—'}
                                </td>
                            ))}
                            <td className="px-3 py-3 text-center font-extrabold text-blue-700 border-l-2 border-slate-200 text-sm">
                                {columnTotals.reduce((s, v) => s + v, 0)}h
                            </td>
                            {isEditing && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <BulkAllocationModal 
                isOpen={isBulkModalOpen} 
                onClose={() => setIsBulkModalOpen(false)} 
                onConfirm={handleBulkConfirm}
                employees={employees}
            />
            <ImportResourceModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onAdd={(newRow) => {
                    setLocalRows(prev => [...prev, normalizeAllocationRow(newRow)]);
                    setIsEditing(true);
                }}
                employees={employees}
                existingEmployeeIds={(localRows || []).map(r => String(r.employee_id)).filter(Boolean)}
            />
            <ConfirmDeleteAllModal
                isOpen={isDeleteAllModalOpen}
                onCancel={() => setIsDeleteAllModalOpen(false)}
                onConfirm={handleDeleteAllResources}
                isDeleting={isDeletingAll}
            />
        </div>
    );
};

const OngoingProjectInfoCard = ({ project, resources }) => {
    const headcount = resources.length;
    const projectName = project?.name || project?.project_name || 'Untitled Project';
    const projectTypeLabel = (project?.type || '').toLowerCase() === 'internal' ? 'Internal' : 'Client';
    const projectStatus = project?.status || project?.project_status || 'Not Set';
    const projectStatusKey = projectStatus.toLowerCase();
    const avatarLetter = (projectName.trim()[0] || projectTypeLabel[0] || 'P').toUpperCase();
    const statusClasses = projectStatusKey === 'completed'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : projectStatusKey === 'in progress'
            ? 'bg-blue-50 text-blue-700 border-blue-100'
            : projectStatusKey === 'on hold'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-slate-50 text-slate-700 border-slate-200';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 flex flex-col md:flex-row items-start justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4 w-full md:w-auto min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-lg shadow-blue-100">
                    {avatarLetter}
                </div>
                <div className="min-w-0">
                    <h1 className="text-2xl font-black text-slate-800 leading-tight truncate">{projectName}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-[11px] font-bold border bg-slate-50 text-slate-700 border-slate-200">
                            {projectTypeLabel}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${statusClasses}`}>
                            {projectStatus}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <Briefcase size={14} className="text-slate-400" />
                            {project.client || 'No client selected'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-8 w-full md:w-auto pb-4 md:pb-0 border-b md:border-b-0 border-slate-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <CalendarDays size={12} /> Timeline
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                        {project.startDate || project.start_date || 'N/A'} — {project.endDate || project.end_date || 'TBD'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Users size={12} /> Team Size
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-800">{headcount}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Resources</span>
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Activity size={12} /> Billing
                    </span>
                    <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold border w-fit"
                        style={{
                            backgroundColor: project.billable === 'Billable' ? '#EDE9FE' : '#F3F4F6',
                            color: project.billable === 'Billable' ? '#5B21B6' : '#374151',
                            borderColor: project.billable === 'Billable' ? '#DDD6FE' : '#E5E7EB'
                        }}
                    >
                        {project.type} ({project.billable || 'Non-Billable'})
                    </span>
                </div>
            </div>
        </div>
    );
};

const ConfirmDeleteAllModal = ({ isOpen, onCancel, onConfirm, isDeleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative z-[131] w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/70">
                    <h3 className="text-lg font-bold text-slate-800">Clear All Resources</h3>
                    <p className="text-xs text-slate-500 mt-1">This action will remove every allocated resource from the project.</p>
                </div>
                <div className="px-6 py-5">
                    <p className="text-sm text-slate-600 leading-6">
                        Are you sure you want to delete all resources? This action cannot be undone.
                    </p>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/60">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete All
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProjectHealthCard = ({ project, resources }) => {
    const totalWeeklyHours = resources.reduce((sum, r) => sum + Number(r.w4 || 0), 0);
    const headcount = resources.length;
    
    // Theoretical 100% capacity for currently allocated team (assuming 40h/week each)
    const totalCapacity = headcount * 40;
    const utilizationPct = totalCapacity > 0 ? Math.round((totalWeeklyHours / totalCapacity) * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-100 flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Project Health</span>
                    <Activity size={16} className="opacity-80" />
                </div>
                <div className="mt-2">
                    <div className="text-2xl font-black flex items-baseline gap-1">
                        On Track
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[10px] opacity-70 font-medium">Last updated today</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</span>
                    <Users size={16} className="text-blue-500" />
                </div>
                <div className="mt-2">
                    <div className="text-2xl font-black text-slate-800">{headcount}</div>
                    <div className="flex items-center text-[10px] text-emerald-600 font-bold">
                        <span>Active Team Members</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Effort</span>
                    <Clock size={16} className="text-indigo-500" />
                </div>
                <div className="mt-2">
                    <div className="text-2xl font-black text-slate-800">{totalWeeklyHours}h</div>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${utilizationPct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{utilizationPct}% Overall Utilization</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Milestone</span>
                    <Zap size={16} className="text-amber-500" />
                </div>
                <div className="mt-2">
                    <div className="text-sm font-bold text-slate-800 truncate">Final Review Sync</div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-100">
                            {project.endDate || project.end_date || 'TBD'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Editable Components ──────────────────────────────────────────────────────

const CommercialSection = ({ project, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    const [data, setData] = useState({
        budget: project.budget || '$0',
        billingType: project.billing_type || 'Not Set',
        contractType: project.contract_type || 'Not Set',
        revenueModel: project.revenue_model || 'Not Set',
        notes: project.commercial_notes || 'No notes.'
    });
    const [editData, setEditData] = useState(data);

    useEffect(() => {
        const newData = {
            budget: project.budget || '$0',
            billingType: project.billing_type || 'Not Set',
            contractType: project.contract_type || 'Not Set',
            revenueModel: project.revenue_model || 'Not Set',
            notes: project.commercial_notes || 'No notes.'
        };
        setData(newData);
        setEditData(newData);
    }, [project]);

    const handleSave = async () => {
        const pId = project.project_id || project.id;
        if (!pId) return;
        try {
            await axios.put(`/projects/${pId}/details`, {
                budget: editData.budget,
                billing_type: editData.billingType,
                contract_type: editData.contractType,
                revenue_model: editData.revenueModel,
                commercial_notes: editData.notes
            });
            setData(editData);
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to save commercial details", error);
            alert("Failed to save changes. Please try again.");
        }
    };

    const handleCancel = () => {
        setEditData(data);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit relative group w-full">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Briefcase size={18} className="text-blue-500" />
                    Commercial Overview
                </h4>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Edit Commercial Overview">
                        <Pencil size={14} />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Project Budget</label>
                        <input type="text" value={editData.budget} onChange={e => setEditData({ ...editData, budget: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Billing Type</label>
                        <input type="text" value={editData.billingType} onChange={e => setEditData({ ...editData, billingType: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Contract Type</label>
                        <input type="text" value={editData.contractType} onChange={e => setEditData({ ...editData, contractType: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Revenue Model</label>
                        <input type="text" value={editData.revenueModel} onChange={e => setEditData({ ...editData, revenueModel: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Commercial Notes</label>
                        <textarea rows={2} value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white resize-none" />
                    </div>
                    <div className="flex gap-2 justify-end mt-4 pt-2">
                        <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Save size={14} /> Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Project Budget</p>
                            <p className="font-bold text-slate-800 text-sm">{data.budget}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Billing Type</p>
                            <p className="font-bold text-slate-800 text-sm">{data.billingType}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Contract Type</p>
                            <p className="font-bold text-slate-800 text-sm">{data.contractType}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Revenue Model</p>
                            <p className="font-bold text-slate-800 text-sm">{data.revenueModel}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-50">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Commercial Notes</p>
                        <p className="text-sm font-medium text-slate-600">{data.notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const ScopeSection = ({ project, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    const [data, setData] = useState({
        objective: project.objective || 'Not defined.',
        deliverables: project.deliverables || 'No deliverables listed.',
        startDate: project.start_date || 'Not Set',
        endDate: project.end_date || 'TBD',
        milestones: project.milestones || 'No milestones listed.',
        notes: project.timeline_notes || 'No timeline notes.'
    });
    const [editData, setEditData] = useState(data);

    useEffect(() => {
        const newData = {
            objective: project.objective || 'Not defined.',
            deliverables: project.deliverables || 'No deliverables listed.',
            startDate: project.start_date || 'Not Set',
            endDate: project.end_date || 'TBD',
            milestones: project.milestones || 'No milestones listed.',
            notes: project.timeline_notes || 'No timeline notes.'
        };
        setData(newData);
        setEditData(newData);
    }, [project]);

    const handleSave = async () => {
        const pId = project.project_id || project.id;
        if (!pId) return;
        try {
            await axios.put(`/projects/${pId}/details`, {
                objective: editData.objective,
                deliverables: editData.deliverables,
                start_date: editData.startDate,
                end_date: editData.endDate,
                milestones: editData.milestones,
                timeline_notes: editData.notes
            });
            setData(editData);
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to save scope details", error);
            alert("Failed to save changes. Please try again.");
        }
    };

    const handleCancel = () => {
        setEditData(data);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative group w-full">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Target size={18} className="text-blue-500" />
                    Project Scope &amp; Timeline
                </h4>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Edit Scope &amp; Timeline">
                        <Pencil size={14} />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Objective &amp; Scope</label>
                        <textarea rows={2} value={editData.objective} onChange={e => setEditData({ ...editData, objective: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white resize-none" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Key Deliverables</label>
                        <input type="text" value={editData.deliverables} onChange={e => setEditData({ ...editData, deliverables: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-0.5 block">Start Date</label>
                            <input type="date" value={editData.startDate === 'Not Set' ? '' : editData.startDate} onChange={e => setEditData({ ...editData, startDate: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-0.5 block">End Date</label>
                            <input type="date" value={editData.endDate === 'TBD' ? '' : editData.endDate} onChange={e => setEditData({ ...editData, endDate: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Major Milestones</label>
                        <input type="text" value={editData.milestones} onChange={e => setEditData({ ...editData, milestones: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-0.5 block">Timeline Notes</label>
                        <textarea rows={2} value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white resize-none" />
                    </div>
                    <div className="flex gap-2 justify-end mt-4 pt-2">
                        <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Save size={14} /> Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Objective &amp; Scope</p>
                        <p className="font-medium text-sm text-slate-700">{data.objective}</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Key Deliverables</p>
                        <p className="font-medium text-sm text-slate-700">{data.deliverables}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 py-1.5 border-y border-gray-50">
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Start Date</p>
                            <p className="font-mono text-sm font-semibold text-slate-700">{data.startDate}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">End Date</p>
                            <p className="font-mono text-sm font-semibold text-slate-700">{data.endDate}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Major Milestones</p>
                        <p className="font-medium text-sm text-slate-700">{data.milestones}</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Timeline Notes</p>
                        <p className="font-medium text-sm text-slate-600 italic">{data.notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Project Details Page ──────────────────────────────────────────────────
const ProjectDetailsPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [project, setProject] = useState(() => location.state?.project || null);
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [rolesList, setRolesList] = useState([]);
    const [globalAllocations, setGlobalAllocations] = useState({});
    const [viewMode, setViewMode] = useState('current');
    const visibleWeeks = useMemo(() => {
        return getViewWeeks(viewMode, project?.start_date, project?.end_date);
    }, [viewMode, project?.start_date, project?.end_date]);

    const loadProjectData = async () => {
        try {
            const [detailsResult, resourcesResult, employeesResult, rolesResult, globalAllocResult] = await Promise.allSettled([
                axios.get(`/projects/${id}/details`),
                axios.get(`/projects/${id}/resources`),
                axios.get('/employees/list'),
                axios.get('/employees/departments/roles-mapping'),
                axios.get('/employees/allocations/weekly')
            ]);

            if (detailsResult.status === 'fulfilled') {
                setProject(detailsResult.value.data);
            } else {
                console.error("Failed to load project details:", detailsResult.reason);
                setProject((current) => current || location.state?.project || null);
            }

            if (resourcesResult.status === 'fulfilled') {
                const apiResources = Array.isArray(resourcesResult.value.data) ? resourcesResult.value.data : [];
                setResources(apiResources.map(normalizeAllocationRow));
            } else {
                console.error("Failed to load project resources:", resourcesResult.reason);
                setResources((current) => (Array.isArray(current) ? current : []));
            }

            if (employeesResult.status === 'fulfilled') {
                const normalizedEmployees = (Array.isArray(employeesResult.value.data) ? employeesResult.value.data : []).map((emp) => ({
                    ...emp,
                    role: emp?.role || emp?.role_designation || 'No role assigned',
                }));
                setEmployees(normalizedEmployees);
            } else {
                console.error("Failed to load employees list:", employeesResult.reason);
                setEmployees((current) => (Array.isArray(current) ? current : []));
            }

            if (rolesResult.status === 'fulfilled') {
                const allRoles = new Set();
                Object.values(rolesResult.value.data || {}).forEach(roleList => {
                    (roleList || []).forEach(r => allRoles.add(r));
                });
                setRolesList(Array.from(allRoles).sort());
            } else {
                console.error("Failed to load roles mapping:", rolesResult.reason);
                setRolesList((current) => (Array.isArray(current) ? current : []));
            }
            
            if (globalAllocResult.status === 'fulfilled') {
                setGlobalAllocations(globalAllocResult.value.data || {});
            } else {
                console.error("Failed to load global allocations:", globalAllocResult.reason);
                setGlobalAllocations({});
            }
        } catch (err) {
            console.error("Failed to load project details:", err);
            setResources((current) => (Array.isArray(current) ? current : []));
            setProject((current) => current || location.state?.project || null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadProjectData();
    }, [id]);

    // Utilization counts and filters were removed per user request to replace them with View Tabs

    // removed toggleUtilizationFilter toggle logic

    if (loading) {
        return <div className="p-8 flex items-center justify-center text-gray-400 font-medium h-full">Loading Project Details...</div>;
    }

    if (!project) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full gap-4">
                <div className="text-gray-500 font-medium text-lg">Project not found</div>
                <button onClick={() => navigate('/info/projects')} className="text-blue-600 hover:underline">Back to Projects</button>
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col w-full overflow-y-auto bg-slate-50/30">
            <div className="mb-5">
                <button
                    onClick={() => navigate('/info/projects')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4 w-fit"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <OngoingProjectInfoCard project={project} resources={resources} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Col: Overview Information */}
                <div className="lg:col-span-1 flex flex-col gap-5 relative">
                    <ScopeSection project={project} onUpdate={loadProjectData} />
                    <CommercialSection project={project} onUpdate={loadProjectData} />
                </div>

                {/* Right Col: Resource Allocation */}
                <div className="lg:col-span-2 space-y-6">
                    <ProjectHealthCard project={project} resources={resources} />

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        {/* Section header */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Users size={18} className="text-blue-500" />
                                    Resource Allocation &amp; Planning
                                </h3>
                            </div>
                            <div className="flex items-center">
                                <div className="bg-slate-100/80 p-1 rounded-xl flex items-center shadow-inner w-fit border border-slate-200/60">
                                    <button 
                                        onClick={() => setViewMode('previous')}
                                        className={`px-5 py-1.5 text-xs font-black rounded-lg transition-all duration-200 ${
                                            viewMode === 'previous' 
                                            ? 'bg-rose-600 text-white shadow-md scale-105' 
                                            : 'bg-rose-50/50 text-rose-700/60 hover:bg-rose-100 hover:text-rose-700'
                                        }`}
                                    >
                                        ← Previous
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('current')}
                                        className={`px-5 py-1.5 text-xs font-black rounded-lg transition-all duration-200 mx-1 ${
                                            viewMode === 'current' 
                                            ? 'bg-blue-600 text-white shadow-md scale-105' 
                                            : 'bg-blue-50/50 text-blue-700/60 hover:bg-blue-100 hover:text-blue-700'
                                        }`}
                                    >
                                        ● Current
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('next')}
                                        className={`px-5 py-1.5 text-xs font-black rounded-lg transition-all duration-200 ${
                                            viewMode === 'next' 
                                            ? 'bg-emerald-600 text-white shadow-md scale-105' 
                                            : 'bg-emerald-50/50 text-emerald-700/60 hover:bg-emerald-100 hover:text-emerald-700'
                                        }`}
                                    >
                                        Upcoming →
                                    </button>
                                </div>
                            </div>
                        </div>

                        <AllocationTable 
                            projectId={id} 
                            projectStart={project.start_date}
                            projectEnd={project.end_date}
                            rows={resources} 
                            employees={employees} 
                            rolesList={rolesList} 
                            globalAllocations={globalAllocations}
                            onUpdate={loadProjectData} 
                            onClearAll={(nextRows = []) => setResources(nextRows)}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            visibleWeeks={visibleWeeks}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
export default ProjectDetailsPage;
