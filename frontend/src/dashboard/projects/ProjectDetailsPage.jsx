import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Target, Briefcase, ArrowLeft, Loader2, Save, Users, X, Pencil, CalendarDays, Plus, Trash2, Clock, Zap, Activity, TrendingUp, CheckCircle, Download, FileText, FileSpreadsheet, Table as TableIcon, ChevronDown, Search } from 'lucide-react';
import axios from '../../api/axios';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';

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

/**
 * Computes the last 4 week descriptors relative to today.
 * Returns array of { label, weekNum, year, weekStart, weekEnd }
 * Index 0 = oldest (3 weeks ago), Index 3 = current week.
 */
function getLast4Weeks() {
    const today = new Date();
    const thisMonday = getMonday(today);
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
        const monday = new Date(thisMonday);
        monday.setDate(thisMonday.getDate() - i * 7);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const wk = getISOWeekNumber(monday);
        weeks.push({
            label: i === 0 ? `This Week` : `Week -${i}`,
            dateRange: `${fmtDate(monday)} – ${fmtDate(sunday)}`,
            weekNum: wk,
            year: monday.getFullYear(),
            monday,
            sunday,
        });
    }
    return weeks;
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
    const [hours, setHours] = useState({ w1: 0, w2: 0, w3: 0, w4: 0 });
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
        setHours({ w1: 0, w2: 0, w3: 0, w4: 0 });
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
                                            onChange={e => setHours({...hours, [wk]: parseInt(e.target.value) || 0})}
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
                                <Users size={14} /> Confirm Bulk Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AllocationTable = ({ projectId, rows, employees, rolesList, onUpdate }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [localRows, setLocalRows] = useState(rows);

    const HOURS_MAX = 40;

    useEffect(() => {
        setLocalRows(rows);
    }, [rows]);

    const handleAddRow = () => {
        setLocalRows([...localRows, { name: '', role: '', w1: 0, w2: 0, w3: 0, w4: 0 }]);
    };

    const handleRemoveRow = (index) => {
        setLocalRows(localRows.filter((_, i) => i !== index));
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...localRows];
        if (W_KEYS.includes(field)) {
            newRows[index][field] = parseInt(value) || 0;
        } else {
            newRows[index][field] = value;
        }
        setLocalRows(newRows);
    };

    const handleBulkConfirm = (selectedEmployees, bulkHours) => {
        const newResources = selectedEmployees.map(emp => ({
            employee_id: emp.employee_id,
            name: emp.employee_name,
            role: emp.role_designation,
            ...bulkHours
        }));
        setLocalRows([...localRows, ...newResources]);
    };

    const handleExport = async (format) => {
        const weeks = getLast4Weeks();
        const exportData = localRows.map(r => ({
            'Resource': r.name,
            'Role': r.role,
            'Start Date': r.allocation_start_date || '—',
            'End Date': r.allocation_end_date || '—',
            [weeks[0].label]: `${r.w1}h`,
            [weeks[1].label]: `${r.w2}h`,
            [weeks[2].label]: `${r.w3}h`,
            [weeks[3].label]: `${r.w4}h`,
            'Total': `${W_KEYS.reduce((s, k) => s + Number(r[k] || 0), 0)}h`
        }));

        const fileName = `Allocation_${projectId}_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') {
            exportToCSV(exportData, fileName);
        } else if (format === 'excel') {
            exportToExcel(exportData, fileName);
        } else if (format === 'pdf') {
            try {
                const response = await axios.post(
                    `/projects/${projectId}/resources/export/pdf`,
                    {
                        title: `Resource Allocation - ${projectId}`,
                        resources: localRows,
                    },
                    {
                        responseType: 'blob',
                        headers: { Accept: 'application/pdf' },
                    }
                );

                const contentType = (response?.headers?.['content-type'] || '').toLowerCase();
                const blob = response?.data;
                if (!(blob instanceof Blob) || blob.size === 0) {
                    throw new Error('Empty PDF response.');
                }
                if (!contentType.includes('application/pdf')) {
                    throw new Error('Invalid PDF response type.');
                }

                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `${fileName}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);
            } catch (error) {
                console.error('PDF export failed:', error);
                alert('PDF export failed. Please try again.');
            }
        }
    };

    const handleSave = async () => {
        try {
            await axios.put(`/projects/${projectId}/resources`, { resources: localRows });
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save resource allocations.");
        }
    };

    // The backend stores w1, w2, w3, w4.
    // We map these in order to the last 4 calendar weeks (w1 = 3 weeks ago, w4 = current).
    const weekSlots = useMemo(() => getLast4Weeks(), []);

    const columnTotals = useMemo(() =>
        W_KEYS.map(key =>
            localRows.reduce((sum, r) => sum + Number(r[key] || 0), 0)
        ), [localRows]);

    const getProjectCount = (row) => {
        const parsed = Number(row?.project_count ?? row?.projectCount ?? 0);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getAllocationPct = (row) => {
        const projectCount = getProjectCount(row);
        if (projectCount <= 0) return 0;
        return Math.round(100 / projectCount);
    };

    if (localRows.length === 0 && !isEditing) {
        return (
            <div className="p-8 text-center text-gray-400 italic bg-gray-50/30 rounded-lg border border-dashed border-gray-200">
                No resources allocated to this project.
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
                            <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                <Users size={14} /> Bulk Add
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 shadow-sm transition-colors">
                                <Save size={14} /> Save Changes
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

            <div className="overflow-x-auto w-full rounded-xl border border-gray-100 shadow-sm bg-white">
                <table className="min-w-max text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider min-w-[180px]">
                                <div className="flex items-center gap-1.5"><Users size={13} /> Resource</div>
                            </th>
                            <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider min-w-[140px]">Role</th>
                            <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider min-w-[120px]">Alloc. Start</th>
                            <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider min-w-[120px]">Alloc. End</th>
                            <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider min-w-[100px]">Allocation</th>
                            {weekSlots.map((wk, idx) => (
                                <th key={idx} className="px-3 py-3 text-center text-[11px] font-extrabold text-slate-500 uppercase tracking-wider min-w-[110px] border-l border-slate-100">
                                    <span className={`block ${idx === 3 ? 'text-blue-600' : ''}`}>{wk.label}</span>
                                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5 normal-case">{wk.dateRange}</span>
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center text-[11px] font-extrabold text-blue-600 uppercase tracking-wider min-w-[80px] border-l-2 border-slate-200">Total</th>
                            {isEditing && <th className="px-3 py-3 text-center text-[11px] font-extrabold text-slate-500 uppercase tracking-wider min-w-[80px]">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {localRows.map((row, ridx) => {
                            const rowTotal = W_KEYS.reduce((s, k) => s + Number(row[k] || 0), 0);
                            const rowBg = ridx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                            return (
                                <tr key={ridx} className={`border-b border-gray-50 transition-colors ${rowBg} ${!isEditing && 'hover:bg-blue-50/40'}`}>
                                    <td className="px-4 py-3 font-semibold text-slate-800 min-w-[180px]">
                                        {isEditing ? (
                                            <SearchableDropdown 
                                                items={employees}
                                                selectedId={row.employee_id || row.name}
                                                onSelect={(emp) => {
                                                    handleRowChange(ridx, 'employee_id', emp.employee_id);
                                                    handleRowChange(ridx, 'name', emp.employee_name || '');
                                                    handleRowChange(ridx, 'role', emp.role_designation || '');
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
                                                onSelect={(roleObj) => handleRowChange(ridx, 'role', roleObj.name)}
                                                placeholder="Select Role"
                                                label="Role"
                                            />
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium whitespace-nowrap">
                                                {row.role || 'Team Member'}
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
                                        {!isEditing && row.employee_id ? (
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
                                    {W_KEYS.map((key, idx) => {
                                        const hours = Number(row[key] || 0);
                                        const pct = Math.min(100, Math.round((hours / HOURS_MAX) * 100));
                                        const isCurrentWeek = idx === 3;
                                        const barColor = hours === 0 ? 'bg-gray-200' :
                                            pct >= 100 ? 'bg-green-500' :
                                            pct >= 75 ? 'bg-blue-500' :
                                            pct >= 40 ? 'bg-indigo-400' :
                                            'bg-slate-300';
                                        return (
                                            <td key={idx} className={`px-3 py-2.5 text-center border-l border-slate-100 ${isCurrentWeek && !isEditing ? 'bg-blue-50/30' : ''}`}>
                                                {isEditing ? (
                                                    <input type="number" min="0" max="168" value={row[key]} onChange={(e) => handleRowChange(ridx, key, e.target.value)} className="w-12 px-1 py-1 text-xs text-center border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                                ) : (
                                                    hours === 0 ? (
                                                        <span className="text-slate-300 text-xs font-medium">—</span>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`text-xs font-bold ${pct >= 100 ? 'text-green-600' : isCurrentWeek ? 'text-blue-700' : 'text-slate-700'}`}>
                                                                {hours}h
                                                            </span>
                                                            <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${barColor}`}
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
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-200">
                            <td className="px-4 py-3 font-extrabold text-slate-700 text-xs uppercase tracking-wider" colSpan={5}>
                                Total
                            </td>
                            {columnTotals.map((total, idx) => (
                                <td key={idx} className={`px-3 py-3 text-center font-bold text-slate-700 border-l border-slate-200 text-sm ${idx === 3 ? 'bg-blue-50 text-blue-700' : ''}`}>
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
        </div>
    );
};

const OngoingProjectInfoCard = ({ project, resources }) => {
    const headcount = resources.length;
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-3xl flex-shrink-0 shadow-inner">
                    {project.icon || project.name?.substring(0, 1).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-1">{project.name}</h1>
                    <div className="flex items-center gap-3">
                        <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                            style={typeof project.statusPillColor === 'object' ? project.statusPillColor : {
                                backgroundColor: project.status === 'Completed' ? '#DBEAFE' : '#DCFCE7',
                                color: project.status === 'Completed' ? '#1E40AF' : '#166534',
                                borderColor: 'transparent'
                            }}
                        >
                            {project.status}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Briefcase size={14} className="text-slate-400" />
                            {project.client || 'Internal'}
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
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <TrendingUp size={10} />
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
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [rolesList, setRolesList] = useState([]);

    const loadProjectData = async () => {
        try {
            const [res, resRes, resEmp, resRoles] = await Promise.all([
                axios.get(`/projects/${id}/details`),
                axios.get(`/projects/${id}/resources`),
                axios.get('/employees/list'),
                axios.get('/departments/roles-mapping')
            ]);
            
            setProject(res.data);
            setResources(resRes.data || []);
            setEmployees(resEmp.data || []);
            
            const allRoles = new Set();
            Object.values(resRoles.data || {}).forEach(roleList => {
                roleList.forEach(r => allRoles.add(r));
            });
            setRolesList(Array.from(allRoles).sort());
            
        } catch (err) {
            console.error("Failed to load project details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadProjectData();
    }, [id]);

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
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Users size={18} className="text-blue-500" />
                                    Resource Allocation &amp; Planning
                                </h3>
                            </div>
                            {/* Legend */}
                            <div className="hidden sm:flex flex-col items-start gap-1 text-[10px] text-slate-500 font-medium self-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Allocation % Utilization</span>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span> &gt;75% → High utilization</span>
                                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400"></span> ~40% → Medium utilization</span>
                                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300"></span> &lt;40% → Low utilization</span>
                                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400"></span> 100%+ → Over allocated</span>
                                </div>
                            </div>
                        </div>

                        <AllocationTable 
                            projectId={id} 
                            rows={resources} 
                            employees={employees} 
                            rolesList={rolesList} 
                            onUpdate={loadProjectData} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
