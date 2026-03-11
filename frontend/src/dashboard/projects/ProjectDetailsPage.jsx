import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { Target, Activity, Briefcase, Clock, ArrowLeft, Loader2, Save, Users, Trash2, X, Pencil } from 'lucide-react';
import axios from '../../api/axios';
import { fetchProjectsData } from '../../api/projectsApi';

// ─── Editable Components ──────────────────────────────────────────────────────

const CommercialSection = ({ project }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        budget: '$0',
        billingType: 'Not Set',
        contractType: 'Not Set',
        revenueModel: 'Not Set',
        notes: 'No notes.'
    });
    const [editData, setEditData] = useState(data);

    useEffect(() => {
        if (!project?.id) return;
        setIsLoading(true);
        axios.get(`/projects/${project.id}/details`)
            .then(res => {
                const fetchedValues = {
                    budget: res.data.budget || '$0',
                    billingType: res.data.billing_type || 'Not Set',
                    contractType: res.data.contract_type || 'Not Set',
                    revenueModel: res.data.revenue_model || 'Not Set',
                    notes: res.data.commercial_notes || 'No notes.'
                };
                setData(fetchedValues);
                setEditData(fetchedValues);
            })
            .catch(err => console.error("Failed to fetch commercial details", err))
            .finally(() => setIsLoading(false));
    }, [project?.id]);

    const handleSave = async () => {
        if (!project?.id) return;
        try {
            await axios.put(`/projects/${project.id}/details`, {
                budget: editData.budget,
                billing_type: editData.billingType,
                contract_type: editData.contractType,
                revenue_model: editData.revenueModel,
                commercial_notes: editData.notes
            });
            setData(editData);
            setIsEditing(false);
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hidden xl:block mb-6 h-fit relative group">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Briefcase size={18} className="text-blue-500" />
                    Commercial Overview
                </h4>
                {!isEditing && !isLoading && (
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Edit Commercial Overview">
                        <Pencil size={14} />
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-6">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
            ) : isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Project Budget</label>
                        <input type="text" value={editData.budget} onChange={e => setEditData({ ...editData, budget: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Billing Type</label>
                        <input type="text" value={editData.billingType} onChange={e => setEditData({ ...editData, billingType: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Contract Type</label>
                        <input type="text" value={editData.contractType} onChange={e => setEditData({ ...editData, contractType: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Revenue Model</label>
                        <input type="text" value={editData.revenueModel} onChange={e => setEditData({ ...editData, revenueModel: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Commercial Notes</label>
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
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Project Budget</p>
                            <p className="font-bold text-slate-800 text-sm">{data.budget}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Billing Type</p>
                            <p className="font-bold text-slate-800 text-sm">{data.billingType}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Contract Type</p>
                            <p className="font-bold text-slate-800 text-sm">{data.contractType}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Revenue Model</p>
                            <p className="font-bold text-slate-800 text-sm">{data.revenueModel}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-50">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Commercial Notes</p>
                        <p className="text-sm font-medium text-slate-600">{data.notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const ScopeSection = ({ project }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        objective: 'Not defined.',
        deliverables: 'No deliverables listed.',
        startDate: 'Not Set',
        endDate: 'TBD',
        milestones: 'No milestones listed.',
        notes: 'No timeline notes.'
    });
    const [editData, setEditData] = useState(data);

    useEffect(() => {
        if (!project?.id) return;
        setIsLoading(true);
        axios.get(`/projects/${project.id}/details`)
            .then(res => {
                const fetchedValues = {
                    objective: res.data.objective || 'Not defined.',
                    deliverables: res.data.deliverables || 'No deliverables listed.',
                    startDate: res.data.start_date || 'Not Set',
                    endDate: res.data.end_date || 'TBD',
                    milestones: res.data.milestones || 'No milestones listed.',
                    notes: res.data.timeline_notes || 'No timeline notes.'
                };
                setData(fetchedValues);
                setEditData(fetchedValues);
            })
            .catch(err => console.error("Failed to fetch scope details", err))
            .finally(() => setIsLoading(false));
    }, [project?.id]);

    const handleSave = async () => {
        if (!project?.id) return;
        try {
            await axios.put(`/projects/${project.id}/details`, {
                objective: editData.objective,
                deliverables: editData.deliverables,
                start_date: editData.startDate,
                end_date: editData.endDate,
                milestones: editData.milestones,
                timeline_notes: editData.notes
            });
            setData(editData);
            setIsEditing(false);
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 relative group">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Target size={18} className="text-blue-500" />
                    Project Scope & Timeline
                </h4>
                {!isEditing && !isLoading && (
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Edit Scope & Timeline">
                        <Pencil size={14} />
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-6">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
            ) : isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Objective & Scope</label>
                        <textarea rows={2} value={editData.objective} onChange={e => setEditData({ ...editData, objective: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white resize-none" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Key Deliverables</label>
                        <input type="text" value={editData.deliverables} onChange={e => setEditData({ ...editData, deliverables: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block">Start Date</label>
                            <input type="date" value={editData.startDate === 'Not Set' ? '' : editData.startDate} onChange={e => setEditData({ ...editData, startDate: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block">End Date</label>
                            <input type="date" value={editData.endDate === 'TBD' ? '' : editData.endDate} onChange={e => setEditData({ ...editData, endDate: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Major Milestones</label>
                        <input type="text" value={editData.milestones} onChange={e => setEditData({ ...editData, milestones: e.target.value })} className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">Timeline Notes</label>
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
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Objective & Scope</p>
                        <p className="font-medium text-sm text-slate-700">{data.objective}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Key Deliverables</p>
                        <p className="font-medium text-sm text-slate-700">{data.deliverables}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-50">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Start Date</p>
                            <p className="font-mono text-sm font-semibold text-slate-700">{data.startDate}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">End Date</p>
                            <p className="font-mono text-sm font-semibold text-slate-700">{data.endDate}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Major Milestones</p>
                        <p className="font-medium text-sm text-slate-700">{data.milestones}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Timeline Notes</p>
                        <p className="font-medium text-sm text-slate-600 italic">{data.notes}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

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

    const handleSaveAllocations = async () => {
        if (!projectId) return;
        try {
            await axios.put(`/projects/${projectId}/resources`, {
                resources: rows.map(r => ({
                    name: r.name,
                    role: r.role || 'Team Member',
                    company: r.company || 'Cloud Destinations',
                    company_type: r.company === 'Cloud Destinations' ? 'Internal' : 'Client',
                    location: r.location || 'Remote',
                    w1: r.w1 || 0,
                    w2: r.w2 || 0,
                    w3: r.w3 || 0,
                    w4: r.w4 || 0
                }))
            });
            setIsEditing(false);
            // Re-fetch to guarantee sync with DB
            setLoading(true);
            const res = await axios.get(`/projects/${projectId}/resources`);
            setRows(res.data || []);
        } catch (error) {
            console.error("Failed to save allocations", error);
            alert("Failed to save allocations. Please try again.");
        } finally {
            setLoading(false);
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

    return (
        <div className="bg-white border text-sm border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="flex justify-between items-center bg-gray-50/80 px-4 py-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Users size={16} className="text-blue-500" />
                    Resource Allocation Breakdown
                </h4>
                {isEditing ? (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs font-semibold text-gray-500 border border-gray-200 rounded-md hover:bg-gray-100">Cancel</button>
                        <button onClick={handleSaveAllocations} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                            <Save size={14} /> Save
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100/50">
                        Edit Allocation
                    </button>
                )}
            </div>

            {rows.length === 0 && !isEditing ? (
                <div className="p-8 text-center text-gray-400 italic bg-gray-50/30">
                    No resources allocated yet.
                </div>
            ) : (
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-3 w-12 text-center text-slate-400">#</th>
                                <th className="px-3 py-3">Resource Name</th>
                                <th className="px-3 py-3">Role</th>
                                <th className="px-3 py-3">Location</th>
                                {['W1', 'W2', 'W3', 'W4'].map(w => (
                                    <th key={w} className="px-3 py-3 text-center border-l border-slate-200/50 bg-slate-50">
                                        Feb {w} <span className="block text-[8px] font-medium text-slate-400 mt-0.5">(Hrs)</span>
                                    </th>
                                ))}
                                <th className="px-3 py-3 text-center border-l-2 border-slate-200 bg-white text-blue-600">Total</th>
                                {isEditing && <th className="px-3 py-3 text-center w-10"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const rowTotal = (row.w1 || 0) + (row.w2 || 0) + (row.w3 || 0) + (row.w4 || 0);

                                return (
                                    <tr key={idx} className={`border-b border-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${!isEditing && 'hover:bg-blue-50/40'}`}>
                                        <td className="px-3 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                                        <td className="px-3 py-3 font-semibold text-slate-800 min-w-[120px]">
                                            {isEditing ? (
                                                <input type="text" value={row.name} onChange={(e) => handleRowChange(idx, 'name', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 bg-white" placeholder="Name" />
                                            ) : (
                                                row.employee_id ? (
                                                    <Link to={`/info/employee/${row.employee_id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                                        {row.name}
                                                    </Link>
                                                ) : <span>{row.name}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 min-w-[120px]">
                                            {isEditing ? (
                                                <input type="text" value={row.role} onChange={(e) => handleRowChange(idx, 'role', e.target.value)} className="w-full px-2 py-1 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 bg-white" placeholder="Role" />
                                            ) : row.role}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 min-w-[100px]">
                                            {isEditing ? (
                                                <select value={row.location} onChange={(e) => handleRowChange(idx, 'location', e.target.value)} className="w-full px-2 py-1 text-xs border rounded bg-white">
                                                    <option>Remote</option>
                                                    <option>Hybrid</option>
                                                    <option>On-Site</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.location === 'Remote' ? 'bg-emerald-50 text-emerald-600' : row.location === 'Hybrid' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {row.location}
                                                </span>
                                            )}
                                        </td>
                                        {['w1', 'w2', 'w3', 'w4'].map((weekId) => (
                                            <td key={weekId} className="px-1 py-1 w-16 text-center border-l border-slate-50 bg-slate-50/30">
                                                {isEditing ? (
                                                    <input type="number" min="0" value={row[weekId]} onChange={(e) => handleRowChange(idx, weekId, e.target.value)} className="w-12 px-1 text-center py-1 text-xs border rounded bg-white" />
                                                ) : (
                                                    <span className={`font-semibold ${row[weekId] > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{row[weekId] || 0}</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-3 py-3 text-center font-bold text-blue-600">{rowTotal}h</td>
                                        {isEditing && (
                                            <td className="px-3 py-3 text-center">
                                                <button onClick={() => handleRemoveRow(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Remove">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {isEditing && (
                                <tr>
                                    <td colSpan={10} className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                                        <button onClick={handleAddRow} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center w-full py-2 hover:bg-blue-50 rounded transition-colors gap-1 border border-dashed border-blue-200">
                                            + Add Resource
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {rows.length > 0 && (
                                <tr className="bg-slate-100 border-t-2 border-slate-200">
                                    <td className="px-3 py-3 font-extrabold text-slate-700 text-right" colSpan={4}>TOTAL HOURS</td>
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

// ─── Main Project Details Page ──────────────────────────────────────────────────
const ProjectDetailsPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [project, setProject] = useState(location.state?.project || null);
    const [loading, setLoading] = useState(!project);

    useEffect(() => {
        if (!project) {
            // Fetch project if not supplied in state
            const loadProject = async () => {
                try {
                    const res = await fetchProjectsData();
                    const found = res.data.projects.find(p => p.id === parseInt(id) || p.id === id);
                    if (found) setProject(found);
                } catch (err) {
                    console.error("Failed to load project details", err);
                } finally {
                    setLoading(false);
                }
            };
            loadProject();
        }
    }, [id, project]);

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
            {/* Header / Nav */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/info/projects')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4 w-fit"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="flex justify-between items-start bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-3xl flex-shrink-0 shadow-inner">
                            {project.icon || project.name?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 leading-tight mb-1">{project.name}</h1>
                            <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${project.statusPillColor}`}>
                                    {project.status}
                                </span>
                                • {project.client} • {project.type}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/info/projects')}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        title="Close Project Details"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Overview Information */}
                <div className="lg:col-span-1 space-y-0 relative">
                    <ScopeSection project={project} />
                    <CommercialSection project={project} />
                </div>

                {/* Right Col: Resource Allocation */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Resource Allocation & Planning</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">Detailed breakdown of weekly hour allocations for assigned team members</p>
                        </div>

                        <AllocationTable projectId={project.id} />

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
