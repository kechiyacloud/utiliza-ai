import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, Users, Target, Activity, Briefcase, Clock, Zap, Loader2, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import axios from '../../api/axios';

// ─── Resource Allocation Component ───────────────────────────────────────────
const AllocationTable = ({ projectId }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        axios.get(`/projects/${projectId}/resources`)
            .then(res => setRows(res.data || []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [projectId]);

    const handleAddRow = () => {
        setRows([...rows, { name: '', role: '', company: 'Cloud Destinations', location: 'Remote', w1: 0, w2: 0, w3: 0, w4: 0 }]);
    };

    const handleRemoveRow = (index) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        if (['w1', 'w2', 'w3', 'w4'].includes(field)) {
            newRows[index][field] = parseInt(value) || 0;
        } else {
            newRows[index][field] = value;
        }
        setRows(newRows);
    };

    const handleSave = () => {
        setIsEditing(false);
        // Note: The UI is completely editable locally as requested. DB persistence for hours/etc. will be tied in later.
        console.log("Saving allocations:", rows);
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
                            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 shadow-sm transition-colors">
                                <Save size={14} /> Save Changes
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
                            <Edit2 size={14} /> Edit Allocation
                        </button>
                    )}
                </div>
            </div>

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
                    <table className="w-full text-xs min-w-[650px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {['S. No', 'Name', 'Role', 'Company', 'Location', 'W1', 'W2', 'W3', 'W4', 'Total', isEditing ? 'Actions' : null].filter(Boolean).map((col) => (
                                    <th key={col} className={`px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap ${['W1', 'W2', 'W3', 'W4', 'Total'].includes(col) ? 'text-center' : ''}`}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const rowTotal = (row.w1 || 0) + (row.w2 || 0) + (row.w3 || 0) + (row.w4 || 0);
                                const locationColor = isEditing ? '' : (row.location === 'Remote' ? 'bg-emerald-50 text-emerald-600' : row.location === 'Hybrid' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600');

                                return (
                                    <tr key={idx} className={`border-b border-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${!isEditing && 'hover:bg-blue-50/40'}`}>
                                        <td className="px-3 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>

                                        <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap min-w-[120px]">
                                            {isEditing ? (
                                                <input type="text" value={row.name} onChange={(e) => handleRowChange(idx, 'name', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" placeholder="Name" />
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

                                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap min-w-[120px]">
                                            {isEditing ? (
                                                <input type="text" value={row.role} onChange={(e) => handleRowChange(idx, 'role', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" placeholder="Role" />
                                            ) : row.role}
                                        </td>

                                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap min-w-[100px]">
                                            {isEditing ? (
                                                <input type="text" value={row.company} onChange={(e) => handleRowChange(idx, 'company', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                            ) : row.company}
                                        </td>

                                        <td className="px-3 py-3 whitespace-nowrap min-w-[90px]">
                                            {isEditing ? (
                                                <select value={row.location} onChange={(e) => handleRowChange(idx, 'location', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white cursor-pointer">
                                                    <option value="Remote">Remote</option>
                                                    <option value="On-Site">On-Site</option>
                                                    <option value="Hybrid">Hybrid</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${locationColor}`}>
                                                    {row.location}
                                                </span>
                                            )}
                                        </td>

                                        {['w1', 'w2', 'w3', 'w4'].map((wCol) => (
                                            <td key={wCol} className="px-2 py-3 text-center text-slate-500">
                                                {isEditing ? (
                                                    <input type="number" min="0" max="168" value={row[wCol]} onChange={(e) => handleRowChange(idx, wCol, e.target.value)} className="w-12 px-1 py-1 text-xs text-center border rounded border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                                ) : (
                                                    `${row[wCol]}h`
                                                )}
                                            </td>
                                        ))}

                                        <td className="px-3 py-3 text-center font-bold text-blue-600">{rowTotal}h</td>

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
                                    <td className="px-3 py-3 font-extrabold text-slate-700 text-right" colSpan={5}>TOTAL HOURS</td>
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
                                {project.icon || project.name?.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 leading-tight mb-1">{project.name}</h2>
                                <p className="text-sm font-medium text-gray-500">{project.client}</p>
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

                            {/* Description */}
                            <p className="text-sm text-gray-600 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                This project is currently in the {project.status?.toLowerCase() || 'planning'} phase.
                                It is a {project.type?.toLowerCase() || 'standard'} engagement for {project.client}.
                                Currently utilizing {project.resources || 0} team members to meet the projected milestone dates.
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
