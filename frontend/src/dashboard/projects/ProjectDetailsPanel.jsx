import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Calendar, Users, Target, Activity, Briefcase, Clock, Zap, Loader2, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import axios from '../../api/axios';

const W_KEYS = ['w1', 'w2', 'w3', 'w4'];
const WEEK_DEFAULT_HOURS = 40;

function normalizeAllocationRow(row = {}) {
    const normalized = { ...row };
    W_KEYS.forEach((key) => {
        const rawValue = normalized[key];
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
            normalized[key] = WEEK_DEFAULT_HOURS;
            return;
        }

        const parsed = Number(rawValue);
        normalized[key] = Number.isFinite(parsed) ? parsed : WEEK_DEFAULT_HOURS;
    });
    return normalized;
}

// ─── Resource Allocation Component ───────────────────────────────────────────
const AllocationTable = ({ projectId }) => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [employees, setEmployees] = useState([]);
    const [roles, setRolesList] = useState([]);

    useEffect(() => {
        if (!projectId) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [resRows, resEmp, resRoles] = await Promise.allSettled([
                    axios.get(`/projects/${projectId}/resources`),
                    axios.get('/employees/list'),
                    axios.get('/employees/departments/roles-mapping')
                ]);
                if (!cancelled) {
                    if (resRows.status === 'fulfilled') {
                        setRows((Array.isArray(resRows.value.data) ? resRows.value.data : []).map(normalizeAllocationRow));
                    } else {
                        console.error("Resource fetch failed:", resRows.reason);
                        setRows((current) => (Array.isArray(current) ? current : []));
                    }

                    if (resEmp.status === 'fulfilled') {
                        setEmployees(Array.isArray(resEmp.value.data) ? resEmp.value.data : []);
                    } else {
                        console.error("Employee fetch failed:", resEmp.reason);
                        setEmployees((current) => (Array.isArray(current) ? current : []));
                    }

                    if (resRoles.status === 'fulfilled') {
                        // Flatten roles mapping into a unique list of roles
                        const allRoles = new Set();
                        Object.values(resRoles.value.data || {}).forEach(roleList => {
                            (roleList || []).forEach(r => allRoles.add(r));
                        });
                        setRolesList(Array.from(allRoles).sort());
                    } else {
                        console.error("Roles fetch failed:", resRoles.reason);
                        setRolesList((current) => (Array.isArray(current) ? current : []));
                    }
                }
            } catch (err) {
                console.error("Fetch error:", err);
                if (!cancelled) setRows([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [projectId]);

    const handleAddRow = () => {
        setRows([...rows, normalizeAllocationRow({ name: '', role: '', company: 'Cloud Destinations', location: 'Remote', w1: '', w2: '', w3: '', w4: '' })]);
    };

    const handleRemoveRow = (index) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        if (['w1', 'w2', 'w3', 'w4'].includes(field)) {
            if (value === '' || value === null || value === undefined) {
                newRows[index][field] = WEEK_DEFAULT_HOURS;
            } else {
                const parsed = Number(value);
                newRows[index][field] = Number.isFinite(parsed) ? parsed : WEEK_DEFAULT_HOURS;
            }
        } else {
            newRows[index][field] = value;
        }
        setRows(newRows);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError('');
        try {
            await axios.put(`/projects/${projectId}/resources`, {
                resources: rows.map((row) => ({
                    ...normalizeAllocationRow(row),
                    employee_id: row.employee_id || null,
                    name: (row.name || '').trim(),
                    role: (row.role || '').trim(),
                }))
            });
            const [resRows, resEmp, resRoles] = await Promise.all([
                axios.get(`/projects/${projectId}/resources`),
                axios.get('/employees/list'),
                axios.get('/employees/departments/roles-mapping')
            ]);
            setRows((resRows.data || []).map(normalizeAllocationRow));
            setEmployees(resEmp.data || []);
            const allRoles = new Set();
            Object.values(resRoles.data || {}).forEach(roleList => {
                (roleList || []).forEach(r => allRoles.add(r));
            });
            setRolesList(Array.from(allRoles).sort());
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save allocations:', error);
            const message = error?.response?.data?.detail || 'Failed to save allocations.';
            setSaveError(message);
            alert(message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-6 justify-center text-slate-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm font-medium">Loading resource data...</span>
            </div>
        );
    }

    const totals = rows.reduce(
        (acc, r) => ({
            w1: acc.w1 + (r.w1 || 0),
            w2: acc.w2 + (r.w2 || 0),
            w3: acc.w3 + (r.w3 || 0),
            w4: acc.w4 + (r.w4 || 0),
        }),
        { w1: 0, w2: 0, w3: 0, w4: 0 }
    );
    const totalHours = totals.w1 + totals.w2 + totals.w3 + totals.w4;
    const weeklyCapacity = Math.round(totalHours / 4);
    const getAllocationPct = (row) => {
        const rowHours = W_KEYS.reduce((sum, key) => sum + Number(row?.[key] || 0), 0);
        const maxCapacity = WEEK_DEFAULT_HOURS * W_KEYS.length;
        if (maxCapacity <= 0) return 0;
        return Math.round((rowHours / maxCapacity) * 100);
    };

    const summaryCards = [
        { label: 'Total Roles', value: new Set(rows.map(r => r.role).filter(Boolean)).size, icon: Briefcase, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
        { label: 'Total Headcount', value: rows.length, icon: Users, color: 'text-blue-500 bg-blue-50 border-blue-100' },
        { label: 'Total Hours', value: `${totalHours}h`, icon: Clock, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
        { label: 'Weekly Capacity', value: `${weeklyCapacity}h`, icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-100' },
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* Section Header */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-blue-500"></div>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Resource Allocation</h3>
                </div>
                <div>
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <button onClick={handleAddRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                <Plus size={14} /> Add Resource
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
                            <Edit2 size={14} /> Edit Allocation
                        </button>
                    )}
                </div>
            </div>
            {saveError && (
                <div className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                    {saveError}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                {summaryCards.map((card) => {
                    const [textColor, bgColor, borderColor] = card.color.split(' ');
                    return (
                        <div key={card.label} className={`flex items-center gap-3 p-3 rounded-xl border ${bgColor} ${borderColor}`}>
                            <div className={`p-2 rounded-lg ${bgColor} ${borderColor} border`}>
                                <card.icon size={16} className={textColor} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-slate-800 leading-none">{card.value}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{card.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Allocation Table */}
            {rows.length === 0 && !isEditing ? (
                <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100 mt-2">
                    No resources allocated to this project yet.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                    <table className="min-w-max text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {['S. No', 'Name', 'Role', 'Alloc. Start', 'Alloc. End', 'Allocation', 'W1', 'W2', 'W3', 'W4', 'Total', isEditing ? 'Actions' : null].filter(Boolean).map((col) => (
                                    <th key={col} className={`px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap ${['W1', 'W2', 'W3', 'W4', 'Total'].includes(col) ? 'text-center' : ''}`}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const rowTotal = (row.w1 || 0) + (row.w2 || 0) + (row.w3 || 0) + (row.w4 || 0);


                                return (
                                    <tr key={idx} className={`border-b border-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${!isEditing && 'hover:bg-blue-50/40'}`}>
                                        <td className="px-3 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>

                                        <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap min-w-[180px]">
                                            {isEditing ? (
                                                <select 
                                                    value={row.employee_id || ''} 
                                                    onChange={(e) => {
                                                        const empId = e.target.value;
                                                        const emp = employees.find(ep => ep.employee_id === empId);
                                                        handleRowChange(idx, 'employee_id', empId);
                                                        handleRowChange(idx, 'name', emp?.employee_name || '');
                                                        handleRowChange(idx, 'role', emp?.role_designation || '');
                                                    }} 
                                                    className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
                                                >
                                                    <option value="">Select Employee</option>
                                                    {employees.map(emp => (
                                                        <option key={emp.employee_id} value={emp.employee_id}>{emp.employee_name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                row.employee_id ? (
                                                    <Link to={`/info/employee/${row.employee_id}`} className="text-blue-600 hover:text-blue-800 hover:underline transition-colors decoration-blue-300 underline-offset-2">
                                                        {row.name}
                                                    </Link>
                                                ) : (
                                                    <span>{row.name}</span>
                                                )
                                            )}
                                        </td>

                                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap min-w-[150px]">
                                            {isEditing ? (
                                                <select 
                                                    value={row.role || ''} 
                                                    onChange={(e) => handleRowChange(idx, 'role', e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
                                                >
                                                    <option value="">Select Role</option>
                                                    {roles.map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                    {!roles.includes(row.role) && row.role && (
                                                        <option value={row.role}>{row.role}</option>
                                                    )}
                                                </select>
                                            ) : row.role}
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap min-w-[100px]">
                                            {isEditing ? (
                                                <input type="date" value={row.allocation_start_date || ''} onChange={(e) => handleRowChange(idx, 'allocation_start_date', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                            ) : (
                                                <span className="text-slate-500 font-mono text-[11px]">{row.allocation_start_date || '—'}</span>
                                            )}
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap min-w-[100px]">
                                            {isEditing ? (
                                                <input type="date" value={row.allocation_end_date || ''} onChange={(e) => handleRowChange(idx, 'allocation_end_date', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                            ) : (
                                                <span className="text-slate-500 font-mono text-[11px]">{row.allocation_end_date || '—'}</span>
                                            )}
                                        </td>

                                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap min-w-[90px]">
                                            {!isEditing && row.employee_id ? (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/info/allocation', { state: { showBack: true, employeeId: row.employee_id, fromProjectId: projectId } })}
                                                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium cursor-pointer hover:bg-slate-200 transition-colors"
                                                    title="View allocation dashboard"
                                                >
                                                    {getAllocationPct(row)}%
                                                </button>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                                                    {getAllocationPct(row)}%
                                                </span>
                                            )}
                                        </td>

                                        {['w1', 'w2', 'w3', 'w4'].map((wCol) => {
                                            const hours = Number(row[wCol] || 0);
                                            const pct = Math.min(100, Math.round((hours / 40) * 100));
                                            const barColor = hours === 0 ? 'bg-gray-200' :
                                                pct >= 100 ? 'bg-red-400' :
                                                pct >= 75 ? 'bg-blue-500' :
                                                pct >= 40 ? 'bg-indigo-400' :
                                                'bg-slate-300';

                                            return (
                                                <td key={wCol} className="px-2 py-3 text-center min-w-[100px]">
                                                    {isEditing ? (
                                                        <input type="number" min="0" max="168" value={row[wCol]} onChange={(e) => handleRowChange(idx, wCol, e.target.value)} className="w-12 px-1 py-1 text-xs text-center border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`text-[11px] font-bold ${pct >= 100 ? 'text-red-600' : 'text-slate-700'}`}>
                                                                {hours}h
                                                            </span>
                                                            <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${barColor}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td className="px-3 py-3 text-center font-bold text-blue-600 text-sm whitespace-nowrap min-w-[70px]">{rowTotal}h</td>

                                        {isEditing && (
                                            <td className="px-3 py-3 text-center">
                                                <button onClick={() => handleRemoveRow(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Remove Resource">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}

                            {rows.length > 0 && (
                                <tr className="bg-slate-100 border-t-2 border-slate-200">
                                    <td className="px-3 py-3 font-extrabold text-slate-700 text-right" colSpan={6}>TOTAL HOURS</td>
                                    <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w1}h</td>
                                    <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w2}h</td>
                                    <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w3}h</td>
                                    <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w4}h</td>
                                    <td className="px-3 py-3 text-center font-extrabold text-blue-700">{totalHours}h</td>
                                    {isEditing && <td></td>}
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
const ProjectDetailsPanel = ({ isOpen, onClose, project }) => {
    if (!isOpen || !project) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden pointer-events-auto transform transition-all scale-100 max-h-[90vh]">

                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
                                {project.icon || (project.name || project.project_name)?.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 leading-tight mb-1">{project.name || project.project_name}</h2>
                                <p className="text-sm font-medium text-gray-500">{project.client || project.client_name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

                        {/* Project Overview */}
                        <div className="flex flex-col gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project Overview</span>

                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span 
                                    className="px-3 py-1 rounded-full text-xs font-bold border"
                                    style={typeof project.statusPillColor === 'object' ? project.statusPillColor : {
                                        backgroundColor: project.status === 'Completed' ? '#DBEAFE' : '#DCFCE7',
                                        color: project.status === 'Completed' ? '#1E40AF' : '#166534',
                                        borderColor: 'transparent'
                                    }}
                                >
                                    {project.status || 'Unknown'}
                                </span>
                                <span 
                                    className="px-3 py-1 rounded-full text-xs font-bold border"
                                    style={{
                                        backgroundColor: project.billable === 'Billable' ? '#EDE9FE' : '#F3F4F6',
                                        color: project.billable === 'Billable' ? '#5B21B6' : '#374151',
                                        borderColor: project.billable === 'Billable' ? '#DDD6FE' : '#E5E7EB'
                                    }}
                                >
                                    {project.type || 'Standard'}
                                </span>
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>On Track</span>
                                </div>
                            </div>

                            {/* Project Dates */}
                            <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-100/50">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Project Start</span>
                                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                        <Calendar size={14} className="text-blue-500" />
                                        {project.startDate || project.start_date || 'Not Set'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Project End</span>
                                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                        <Calendar size={14} className="text-red-400" />
                                        {project.endDate || project.end_date || 'TBD'}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-600 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                This project is currently in the {project.status?.toLowerCase() || 'planning'} phase.
                                It is a {project.type?.toLowerCase() || 'standard'} engagement for {project.client || project.client_name}.
                                Currently utilizing {project.resources || project.resource_count || 0} team members to meet the projected milestone dates.
                            </p>
                        </div>

                        {/* Resource Allocation Section */}
                        <div className="border-t border-gray-100 pt-2">
                            <AllocationTable projectId={project.id} />
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all shadow-sm w-full"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectDetailsPanel;
