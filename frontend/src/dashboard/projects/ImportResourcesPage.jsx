import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Save, Search, Users, Briefcase, CalendarDays, AlertTriangle, RefreshCw, Plus, Trash2, X } from 'lucide-react';
import axios from '../../api/axios';

const WEEK_KEYS = ['w1', 'w2', 'w3', 'w4'];
const WEEK_DEFAULT_HOURS = 40;

function normalizeAllocationRow(row = {}) {
    const normalized = { ...row };
    WEEK_KEYS.forEach((key) => {
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

const SearchableDropdown = ({ items, value, onSelect, placeholder, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    const selectedItem = items.find((item) => String(item.id) === String(value) || String(item.employee_id) === String(value) || String(item.name) === String(value));
    const filteredItems = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return items;
        return items.filter((item) => {
            const text = [item.name, item.employee_name, item.role_designation].filter(Boolean).join(' ').toLowerCase();
            return text.includes(term);
        });
    }, [items, search]);

    useEffect(() => {
        const handleOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="w-full px-3 py-2 text-left bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 hover:border-blue-300 hover:shadow-sm transition-all"
            >
                <span className="truncate">
                    {selectedItem ? (selectedItem.name || selectedItem.employee_name) : (placeholder || `Select ${label}`)}
                </span>
                <Search size={12} className="text-slate-400 shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${label.toLowerCase()}...`}
                                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto overflow-x-hidden py-1">
                        {filteredItems.length === 0 ? (
                            <div className="px-4 py-6 text-center text-slate-400 text-xs font-medium">
                                No {label.toLowerCase()} found
                            </div>
                        ) : (
                            filteredItems.map((item) => {
                                const isSelected = String(item.id) === String(value) || String(item.employee_id) === String(value) || String(item.name) === String(value);
                                return (
                                    <button
                                        key={item.id || item.employee_id || item.name}
                                        type="button"
                                        onClick={() => {
                                            onSelect(item);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                                            isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <span className="truncate">{item.name || item.employee_name}</span>
                                        {isSelected && <CheckCircle size={10} className="text-blue-500 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ResourceCreateModal = ({ isOpen, onClose, onCreate, employees, roles }) => {
    const [form, setForm] = useState({
        employee_id: '',
        name: '',
        role: '',
        allocation_start_date: '',
        allocation_end_date: '',
        w1: WEEK_DEFAULT_HOURS,
        w2: WEEK_DEFAULT_HOURS,
        w3: WEEK_DEFAULT_HOURS,
        w4: WEEK_DEFAULT_HOURS,
    });

    useEffect(() => {
        if (!isOpen) {
            setForm({
                employee_id: '',
                name: '',
                role: '',
                allocation_start_date: '',
                allocation_end_date: '',
                w1: WEEK_DEFAULT_HOURS,
                w2: WEEK_DEFAULT_HOURS,
                w3: WEEK_DEFAULT_HOURS,
                w4: WEEK_DEFAULT_HOURS,
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const employeeOptions = (employees || []).map((emp) => ({
        id: emp.employee_id,
        name: emp.employee_name,
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        role_designation: emp.role_designation,
        role: emp.role || emp.role_designation || 'No role assigned',
    }));
    const roleOptions = (roles || []).map((role) => ({ id: role, name: role }));

    const isValid = Boolean(form.employee_id && form.name && form.role);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-[121] w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Import Resource</h3>
                        <p className="text-xs text-slate-500">Select an employee and role, then save directly to the database.</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-slate-700 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Employee</label>
                        <SearchableDropdown
                            items={employeeOptions}
                            value={form.employee_id}
                            placeholder="Select Employee"
                            label="Employee"
                            onSelect={(emp) => setForm((current) => ({
                                ...current,
                                employee_id: emp.employee_id,
                                name: emp.employee_name || emp.name || '',
                                role: emp.role || emp.role_designation || current.role || 'No role assigned',
                            }))}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role</label>
                        <SearchableDropdown
                            items={roleOptions}
                            value={form.role}
                            placeholder="Select Role"
                            label="Role"
                            onSelect={(roleObj) => setForm((current) => ({ ...current, role: roleObj.name || 'No role assigned' }))}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                        <input
                            type="date"
                            value={form.allocation_start_date}
                            onChange={(e) => setForm((current) => ({ ...current, allocation_start_date: e.target.value }))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                        <input
                            type="date"
                            value={form.allocation_end_date}
                            onChange={(e) => setForm((current) => ({ ...current, allocation_end_date: e.target.value }))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                    </div>

                    {WEEK_KEYS.map((wk, idx) => (
                        <div key={wk}>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">W{idx + 1} Hours</label>
                            <input
                                type="number"
                                min="0"
                                max="168"
                                value={form[wk]}
                                onChange={(e) => setForm((current) => ({
                                    ...current,
                                    [wk]: e.target.value === ''
                                        ? WEEK_DEFAULT_HOURS
                                        : (Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : WEEK_DEFAULT_HOURS),
                                }))}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 text-center font-bold"
                            />
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
                    <div className="text-xs text-slate-500 font-medium">
                        New records are saved to the database immediately on create.
                    </div>
                    <button
                        type="button"
                        onClick={() => onCreate(form)}
                        disabled={!isValid}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <CheckCircle size={14} /> Create Resource
                    </button>
                </div>
            </div>
        </div>
    );
};

function ImportResourcesPage() {
    const navigate = useNavigate();
    const params = useParams();
    const projectId = params.projectId || params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [project, setProject] = useState(null);
    const [resources, setResources] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const saveTimersRef = useRef({});

    const employeeOptions = useMemo(() => (employees || []).map((emp) => ({
        id: emp.employee_id,
        name: emp.employee_name,
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        role_designation: emp.role_designation,
    })), [employees]);

    const roleOptions = useMemo(() => (roles || []).map((role) => ({ id: role, name: role })), [roles]);

    const loadData = async () => {
        if (!projectId) {
            setError('Missing project id in route.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        console.log('Project ID:', projectId);

        try {
            console.log('[ImportResourcesPage] route params:', params);
            const [projectRes, resourcesRes, employeesRes, rolesRes] = await Promise.allSettled([
                axios.get(`/projects/${projectId}/details`),
                axios.get(`/projects/${projectId}/resources`),
                axios.get('/employees/list'),
                axios.get('/employees/departments/roles-mapping'),
            ]);

            if (projectRes.status === 'fulfilled') {
                console.log('[ImportResourcesPage] project response:', projectRes.value.data);
                setProject(projectRes.value.data || null);
            } else {
                console.warn('[ImportResourcesPage] project API failed:', projectRes.reason);
                setProject(null);
            }

            if (resourcesRes.status === 'fulfilled') {
                console.log('[ImportResourcesPage] resources response:', resourcesRes.value.data);
                const apiResources = Array.isArray(resourcesRes.value.data) ? resourcesRes.value.data : [];
                console.log('API Response:', apiResources);
                setResources(apiResources.map(normalizeAllocationRow));
            } else {
                console.warn('[ImportResourcesPage] resources API failed:', resourcesRes.reason);
                setResources([]);
            }

            if (employeesRes.status === 'fulfilled') {
                const apiEmployees = Array.isArray(employeesRes.value.data) ? employeesRes.value.data : [];
                console.log('[ImportResourcesPage] employees response count:', apiEmployees.length);
                setEmployees(apiEmployees);
            } else {
                console.warn('[ImportResourcesPage] employees API failed:', employeesRes.reason);
                setEmployees([]);
            }

            if (rolesRes.status === 'fulfilled') {
                const roleSet = new Set();
                Object.values(rolesRes.value.data || {}).forEach((roleList) => {
                    (roleList || []).forEach((role) => roleSet.add(role));
                });
                const normalizedRoles = Array.from(roleSet).sort();
                console.log('[ImportResourcesPage] roles response count:', normalizedRoles.length);
                setRoles(normalizedRoles);
            } else {
                console.warn('[ImportResourcesPage] roles API failed:', rolesRes.reason);
                setRoles([]);
            }
        } catch (err) {
            console.error('[ImportResourcesPage] Failed to load page data:', err);
            setError(err?.response?.data?.detail || err?.message || 'Failed to load resources.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    useEffect(() => () => {
        Object.values(saveTimersRef.current || {}).forEach((timerId) => clearTimeout(timerId));
    }, []);

    const applyLocalRowUpdate = (allocationId, nextRow) => {
        setResources((current) => current.map((row) => (
            String(row.allocation_id) === String(allocationId) ? normalizeAllocationRow({ ...row, ...nextRow }) : row
        )));
    };

    const persistRow = async (row) => {
        if (!row?.allocation_id) return;
        try {
            setError('');
            setStatusMessage('');
            const payload = {
                ...row,
                w1: Number(row.w1 || 0),
                w2: Number(row.w2 || 0),
                w3: Number(row.w3 || 0),
                w4: Number(row.w4 || 0),
            };
            const response = await axios.patch(`/projects/${projectId}/resources/${row.allocation_id}`, payload);
            const saved = normalizeAllocationRow(response?.data?.resource || payload);
            applyLocalRowUpdate(row.allocation_id, saved);
            setStatusMessage(`Saved ${saved.name || 'resource'} to database.`);
        } catch (err) {
            console.error('[ImportResourcesPage] Row save failed:', err);
            setError(err?.response?.data?.detail || err?.message || 'Failed to save resource row.');
        }
    };

    const scheduleRowSave = (row) => {
        if (!row?.allocation_id) return;
        if (saveTimersRef.current[row.allocation_id]) {
            clearTimeout(saveTimersRef.current[row.allocation_id]);
        }
        saveTimersRef.current[row.allocation_id] = setTimeout(() => {
            persistRow(row);
        }, 400);
    };

    const updateRowFields = (index, patch, persist = true) => {
        let updatedRow = null;
        setResources((current) => {
            const next = [...current];
            const baseRow = normalizeAllocationRow({ ...(next[index] || {}) });
            Object.entries(patch || {}).forEach(([field, value]) => {
                if (WEEK_KEYS.includes(field)) {
                    baseRow[field] = value === '' || value === null || value === undefined
                        ? WEEK_DEFAULT_HOURS
                        : (Number.isFinite(Number(value)) ? Number(value) : WEEK_DEFAULT_HOURS);
                } else {
                    baseRow[field] = value;
                }
            });
            next[index] = baseRow;
            updatedRow = baseRow;
            return next;
        });

        if (persist && updatedRow?.allocation_id) {
            const fields = Object.keys(patch || {});
            if (fields.some((field) => ['employee_id', 'name', 'role', 'allocation_start_date', 'allocation_end_date'].includes(field))) {
                persistRow(updatedRow);
            } else {
                scheduleRowSave(updatedRow);
            }
        }
    };

    const handleRowChange = (index, field, value, persist = true) => {
        updateRowFields(index, { [field]: value }, persist);
    };

    const handleCreateResource = async (form) => {
        if (!projectId) return;
        setCreating(true);
        setError('');
        try {
            const payload = normalizeAllocationRow({
                employee_id: form.employee_id,
                name: form.name,
                role: form.role,
                allocation_start_date: form.allocation_start_date || null,
                allocation_end_date: form.allocation_end_date || null,
                w1: form.w1,
                w2: form.w2,
                w3: form.w3,
                w4: form.w4,
            });
            const response = await axios.post(`/projects/${projectId}/resources`, payload);
            const created = normalizeAllocationRow(response?.data?.resource || payload);
            setResources((current) => [...current, created]);
            setStatusMessage(`Created ${created.name || 'resource'} in the database.`);
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error('[ImportResourcesPage] Create resource failed:', err);
            setError(err?.response?.data?.detail || err?.message || 'Failed to create resource.');
        } finally {
            setCreating(false);
        }
    };

    const handleAddRow = () => {
        setIsCreateModalOpen(true);
    };

    const handleRemoveRow = (index) => {
        const target = resources[index];
        if (!target?.allocation_id) {
            setResources((current) => current.filter((_, i) => i !== index));
            return;
        }

        const confirmDelete = window.confirm(`Delete ${target.name || 'this resource'}?`);
        if (!confirmDelete) return;

        axios.delete(`/projects/${projectId}/resources/${target.allocation_id}`)
            .then(() => {
                setResources((current) => current.filter((_, i) => i !== index));
                setStatusMessage(`Deleted ${target.name || 'resource'} from the database.`);
            })
            .catch((err) => {
                console.error('[ImportResourcesPage] Delete resource failed:', err);
                setError(err?.response?.data?.detail || err?.message || 'Failed to delete resource.');
            });
    };

    const handleSave = async () => {
        if (!projectId) return;
        setSaving(true);
        try {
            await axios.put(`/projects/${projectId}/resources`, { resources });
            await loadData();
            setStatusMessage('All resource changes saved to the database.');
        } catch (err) {
            console.error('[ImportResourcesPage] Save failed:', err);
            setError(err?.response?.data?.detail || err?.message || 'Failed to save resources.');
        } finally {
            setSaving(false);
        }
    };

    const totals = useMemo(() => resources.reduce((acc, row) => ({
        w1: acc.w1 + Number(row.w1 || 0),
        w2: acc.w2 + Number(row.w2 || 0),
        w3: acc.w3 + Number(row.w3 || 0),
        w4: acc.w4 + Number(row.w4 || 0),
    }), { w1: 0, w2: 0, w3: 0, w4: 0 }), [resources]);

    const totalHours = totals.w1 + totals.w2 + totals.w3 + totals.w4;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center gap-3 text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                <span className="font-medium">Loading...</span>
            </div>
        );
    }

    if (error && !project) {
        return (
            <div className="p-8">
                <div className="max-w-xl mx-auto bg-red-50 border border-red-100 rounded-2xl p-6 text-center shadow-sm">
                    <AlertTriangle className="mx-auto text-red-500 mb-3" size={28} />
                    <h2 className="text-lg font-bold text-red-700 mb-2">Unable to load import resources</h2>
                    <p className="text-sm text-red-600 mb-5">{error}</p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={loadData}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                        >
                            <RefreshCw size={14} /> Retry
                        </button>
                        <button
                            onClick={() => navigate('/info/projects')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-bold hover:bg-red-50 transition-colors"
                        >
                            Back to Projects
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const projectName = project?.name || project?.project_name || 'Project';

    return (
        <div className="p-6 h-full w-full overflow-y-auto bg-slate-50/30">
            <div className="mb-5">
                <button
                    onClick={() => navigate('/info/projects')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4 w-fit"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                                {(project?.icon || projectName?.substring(0, 1)).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 leading-tight">{projectName}</h1>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100">
                                        <Briefcase size={12} /> {project?.type || 'Project'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100">
                                        <CalendarDays size={12} /> {project?.startDate || project?.start_date || 'Not set'} - {project?.endDate || project?.end_date || 'TBD'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100">
                                        <Users size={12} /> {(resources || []).length} resources
                                    </span>
                                </div>
                            </div>
                        </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Resources
                        </button>
                    </div>

                    <p className="text-sm text-slate-600">
                        Select employee names and roles, then save the imported resources back to the project.
                    </p>

                    {(error || statusMessage) && (
                        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            {error || statusMessage}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Resource List</h3>
                        <p className="text-xs text-slate-500">Click the name field to search and select an employee.</p>
                    </div>
                    <button
                        onClick={handleAddRow}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                        <Plus size={14} /> Import Resources
                    </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-max w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider">Role</th>
                                {WEEK_KEYS.map((wk, idx) => (
                                    <th key={wk} className="px-3 py-3 text-center font-extrabold text-slate-500 uppercase tracking-wider">
                                        W{idx + 1}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center font-extrabold text-blue-600 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-center font-extrabold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(resources || []).map((row, index) => {
                                const rowTotal = WEEK_KEYS.reduce((sum, key) => sum + Number(row[key] || 0), 0);
                                return (
                                    <tr key={row.allocation_id || row.employee_id || index} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                                        <td className="px-4 py-3 min-w-[240px]">
                                            <SearchableDropdown
                                                items={employeeOptions}
                                                value={row.employee_id || row.name}
                                                placeholder="Select Employee"
                                                label="Employee"
                            onSelect={(emp) => {
                                updateRowFields(index, {
                                    employee_id: emp.employee_id,
                                    name: emp.employee_name || emp.name || '',
                                    role: emp.role || emp.role_designation || row.role || 'No role assigned',
                                });
                            }}
                        />
                                        </td>
                                        <td className="px-4 py-3 min-w-[200px]">
                                            <SearchableDropdown
                                                items={roleOptions}
                            value={row.role || ''}
                            placeholder="Select Role"
                            label="Role"
                            onSelect={(roleObj) => handleRowChange(index, 'role', roleObj.name || 'No role assigned')}
                        />
                                        </td>
                                        {WEEK_KEYS.map((wk) => (
                                            <td key={wk} className="px-3 py-3 text-center min-w-[110px]">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="168"
                                                    value={row[wk]}
                                                    onChange={(e) => handleRowChange(index, wk, e.target.value)}
                                                    className="w-16 px-2 py-1 text-center text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-center font-bold text-blue-700 min-w-[90px]">
                                            {rowTotal}h
                                        </td>
                                        <td className="px-4 py-3 text-center min-w-[90px]">
                                            <button
                                                onClick={() => handleRemoveRow(index)}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 border-t border-slate-200">
                                <td className="px-4 py-3 font-bold text-slate-700" colSpan={2}>Totals</td>
                                <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w1}h</td>
                                <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w2}h</td>
                                <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w3}h</td>
                                <td className="px-3 py-3 text-center font-bold text-slate-700">{totals.w4}h</td>
                                <td className="px-4 py-3 text-center font-extrabold text-blue-700">{totalHours}h</td>
                                <td className="px-4 py-3" />
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <ResourceCreateModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateResource}
                    employees={employees}
                    roles={roles}
                />

                {!resources?.length && (
                    <div className="mt-4 text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                        No resources available. Click Import Resources to start.
                    </div>
                )}
            </div>
        </div>
    );
}

export default ImportResourcesPage;
