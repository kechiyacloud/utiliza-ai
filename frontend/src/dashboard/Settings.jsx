import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import api from '../api/axios';
import { submitFeedback } from '../api/feedbackApi';
import { Soon_GIF } from '../Assets';
import EmployeeStatusTag from '../components/EmployeeStatusTag';
import { useEmployees } from '../context/EmployeeContext';
import BulkImportModal from './employee/BulkImportModal';
import {
    ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Calendar, Clock,
    Building2, Laptop, Award, Send, MessageSquare,
    AlertCircle, CheckCircle2, Loader2,
    BarChart2, FileText, Settings as SettingsIcon, ShieldCheck,
    Archive, Trash2, Upload, Download, RefreshCcw, Database, UserX, ChevronDown, Cloud
} from 'lucide-react';
import { getEmployeeList } from '../api/employeeApi';
import ExportPreviewModal from './employee/ExportPreviewModal';
import { clearDashboardCache } from '../api/dashboardApi';
import ModuleLoader from '../components/ModuleLoader';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

// ─────────────────────────────────────────────
// Reusable sub-components
// ─────────────────────────────────────────────

const InfoField = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 flex-shrink-0">
            <Icon size={14} className="text-CD_Blue" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-mainTheme mt-0.5 break-words">{value || '—'}</p>
        </div>
    </div>
);

const SkeletonField = () => (
    <div className="flex items-start gap-3 animate-pulse">
        <div className="mt-0.5 w-7 h-7 rounded-lg bg-gray-200 flex-shrink-0" />
        <div className="flex-1">
            <div className="h-2.5 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
    </div>
);

const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-CD_Blue/30 focus:border-CD_Blue bg-white text-mainTheme transition-colors';

const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

// ─────────────────────────────────────────────
// Section A — User Profile
// ─────────────────────────────────────────────

const ProfileSection = ({ employeeData, loading, notLinked }) => {
    const email = localStorage.getItem('userEmail') || '';
    const username = email.split('@')[0] || 'User';

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {Array.from({ length: 10 }).map((_, i) => <SkeletonField key={i} />)}
                </div>
            </div>
        );
    }

    if (notLinked) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                {/* Basic avatar from email */}
                <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                    <div className="w-14 h-14 rounded-2xl bg-mainTheme flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xl font-bold">
                            {username.substring(0, 2).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-mainTheme">{username}</h2>
                        <p className="text-sm text-gray-500">{email}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                        Your login account is not linked to an employee record yet. Contact your admin to get your profile set up.
                    </p>
                </div>
            </div>
        );
    }

    if (!employeeData) return null;

    const formatDate = (val) => {
        if (!val) return '—';
        try {
            return new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch { return val; }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Avatar header */}
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-mainTheme flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">
                        {(employeeData.name || 'U').substring(0, 2).toUpperCase()}
                    </span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-mainTheme">{employeeData.name || '—'}</h2>
                    <p className="text-sm text-gray-500">{employeeData.designation || employeeData.role || '—'}</p>
                    <div className="mt-1">
                        <EmployeeStatusTag status={employeeData.employee_status} size="sm" />
                    </div>
                </div>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoField icon={Mail} label="Email" value={employeeData.email} />
                <InfoField icon={Phone} label="Phone" value={employeeData.phone} />
                <InfoField icon={MapPin} label="Location" value={employeeData.location} />
                <InfoField icon={Building2} label="Department" value={employeeData.department} />
                <InfoField icon={Briefcase} label="Designation" value={employeeData.designation || employeeData.role} />
                <InfoField icon={Laptop} label="Work Mode" value={employeeData.mode_of_work} />
                <InfoField icon={Calendar} label="Date of Joining" value={formatDate(employeeData.date_of_joining)} />
                <InfoField icon={Clock} label="Total Experience" value={employeeData.total_experience ? `${employeeData.total_experience} years` : '—'} />
                <InfoField icon={Award} label="Shift" value={employeeData.shift} />
                <InfoField icon={User} label="Employee Type" value={employeeData.employee_type} />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Section C — Feedback (functional)
// ─────────────────────────────────────────────

const FeedbackSection = ({ employeeData }) => {
    const [form, setForm] = useState({ subject: '', type: 'General', description: '', priority: 'Medium' });
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error' | null
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);
        setErrorMsg('');

        const email = localStorage.getItem('userEmail') || '';
        try {
            await submitFeedback({
                employee_id: employeeData?.employee_id || null,
                employee_name: employeeData?.name || null,
                employee_email: email,
                subject: form.subject,
                description: form.description,
                type: form.type,
                priority: form.priority,
            });
            setStatus('success');
            setForm({ subject: '', type: 'General', description: '', priority: 'Medium' });
        } catch (err) {
            setStatus('error');
            setErrorMsg(err?.response?.data?.detail || 'Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center gap-3 text-center max-w-2xl">
                <CheckCircle2 size={48} className="text-emerald-500" />
                <h3 className="text-lg font-bold text-mainTheme">Feedback Submitted!</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                    Your ticket has been raised. We'll review it and get back to you via email.
                </p>
                <button
                    onClick={() => setStatus(null)}
                    className="mt-2 px-5 py-2 bg-CD_Blue text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                    Submit Another
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">
            <p className="text-sm text-gray-500 mb-5">
                Found a bug or need a change? Submit a ticket and we'll handle it.
            </p>

            {status === 'error' && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelCls}>Subject</label>
                    <input
                        type="text"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        required
                        maxLength={500}
                        placeholder="Brief summary of your issue or request"
                        className={inputCls}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Type</label>
                        <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                            <option value="General">General</option>
                            <option value="Bug">Bug</option>
                            <option value="Feature Request">Feature Request</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Priority</label>
                        <select name="priority" value={form.priority} onChange={handleChange} className={inputCls}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Description</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behavior"
                        className={`${inputCls} resize-none`}
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-mainTheme text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                    {submitting
                        ? <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                        : <><Send size={15} /> Submit Ticket</>
                    }
                </button>
            </form>
        </div>
    );
};



// ─────────────────────────────────────────────
// Section E — Data
// ─────────────────────────────────────────────

const DataSection = ({ employeeData, onExport, onImport, isExporting, isSyncing, onSync, isAdmin }) => {
    const { showArchived, setShowArchived } = useEmployees();



    return (
        <div className="space-y-6 max-w-4xl">
            {/* View Settings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-mainTheme uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-500" />
                    Data Visibility Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <Archive size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Show Archived Records</p>
                                <p className="text-[10px] text-slate-500 font-medium tracking-tight">Include resigned/notice employees in lists</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${showArchived ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showArchived ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-mainTheme uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Upload size={16} className="text-emerald-500" />
                    Bulk Operations
                </h3>
                <div className="flex flex-wrap gap-4">
                    {isAdmin && (
                        <button
                            onClick={onSync}
                            disabled={isSyncing}
                            className="flex-1 min-w-[200px] flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl hover:bg-amber-100 transition-colors text-left disabled:opacity-50"
                        >
                            <div className="p-3 bg-amber-600 text-white rounded-xl">
                                {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
                            </div>
                            <div>
                                <p className="font-bold text-amber-900">Sync All Data</p>
                                <p className="text-xs text-amber-700/60 font-medium">Re-calculate allocations & statuses</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};

// ─────────────────────────────────────────────
// Placeholder Section
// ─────────────────────────────────────────────

const PlaceholderSection = ({ title }) => (
    <div className="relative">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 opacity-40 pointer-events-none select-none h-64 flex items-center justify-center">
            <p className="text-gray-400 font-medium">Settings will appear here</p>
        </div>
        <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl z-10 gap-3">
            <Soon_GIF className="w-20 h-20" />
            <p className="text-base font-bold text-mainTheme">Coming Soon</p>
            <p className="text-sm text-gray-500 text-center max-w-xs">
                {title} settings are currently in development.
            </p>
        </div>
    </div>
);

// ─────────────────────────────────────────────
// Integration Section
// ─────────────────────────────────────────────

const IntegrationSection = () => {
    const integrations = [
        {
            id: 'aws',
            name: 'AWS',
            service: 'Cost Explorer',
            description: 'Monitor and analyze your AWS spending and usage patterns.',
            color: 'bg-[#FF9900]',
            icon: Cloud,
            status: 'Not Connected'
        },
        {
            id: 'azure',
            name: 'Azure',
            service: 'Cost Management',
            description: 'Gain insights into your Azure cloud spend and optimize costs.',
            color: 'bg-[#0089D6]',
            icon: Database,
            status: 'Not Connected'
        },
        {
            id: 'zoho',
            name: 'Zoho People',
            service: 'Billing',
            description: 'Sync employee billing data and automate invoice generation.',
            color: 'bg-[#E31D23]',
            icon: FileText,
            status: 'Not Connected'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((item) => (
                <div key={item.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-CD_Blue/20 transition-all duration-300 flex flex-col overflow-hidden">
                    <div className="p-6 flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${item.color} text-white shadow-sm transition-transform group-hover:scale-110 duration-300`}>
                                <item.icon size={24} />
                            </div>
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                {item.status}
                            </span>
                        </div>
                        <h3 className="font-bold text-mainTheme text-lg group-hover:text-CD_Blue transition-colors">{item.name}</h3>
                        <p className="text-xs font-semibold text-CD_Blue/70 mb-3">{item.service}</p>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            {item.description}
                        </p>
                    </div>
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 mt-auto">
                        <button className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-mainTheme hover:text-white hover:border-mainTheme transition-all duration-300 flex items-center justify-center gap-2">
                            Connect
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────
// Access Control Section
// ─────────────────────────────────────────────

const ROLE_COLORS = {
    master_admin: 'bg-purple-100 text-purple-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-green-100 text-green-800',
    restricted_viewer: 'bg-gray-100 text-gray-600',
};

const ALL_PAGES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'projects', label: 'Projects' },
    { key: 'employees/list', label: 'Employees' },
    { key: 'allocation', label: 'Allocations' },
    { key: 'availability', label: 'Availability' },
    { key: 'client', label: 'Clients' },
    { key: 'settings', label: 'Settings' },
];

const ALL_FIELDS = {
    employees: [
        { key: 'phone', label: 'Phone' },
        { key: 'phone_number', label: 'Phone (alt)' },
        { key: 'date_of_birth', label: 'Date of Birth' },
        { key: 'address', label: 'Address' },
    ],
    project_detail: [
        { key: 'budget', label: 'Budget' },
        { key: 'billing_type', label: 'Billing Type' },
        { key: 'revenue_model', label: 'Revenue Model' },
        { key: 'contract_type', label: 'Contract Type' },
        { key: 'commercial_notes', label: 'Commercial Notes' },
    ],
};

const SubRolesPanel = ({ subRoles, roles, onRefresh }) => {
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        name: '', label: '', description: '', base_role: 'viewer',
        page_access: [],
        field_restrictions: { employees: [], project_detail: [] }
    });

    const resetForm = () => {
        setForm({
            name: '', label: '', description: '', base_role: 'viewer',
            page_access: [],
            field_restrictions: { employees: [], project_detail: [] }
        });
        setEditTarget(null);
        setShowForm(false);
    };

    const handleEdit = (sr) => {
        setForm({
            name: sr.name, label: sr.label, description: sr.description || '', base_role: sr.base_role,
            page_access: sr.page_access || [],
            field_restrictions: sr.field_restrictions || { employees: [], project_detail: [] }
        });
        setEditTarget(sr);
        setShowForm(true);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete sub-role "${name}"? This will remove it from all users.`)) return;
        try {
            await api.delete(`/sub-roles/${id}`);
            onRefresh();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete sub-role');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editTarget) {
                await api.put(`/sub-roles/${editTarget.sub_role_id}`, {
                    label: form.label,
                    description: form.description,
                    base_role: form.base_role,
                    page_access: form.page_access,
                    field_restrictions: form.field_restrictions
                });
            } else {
                await api.post('/sub-roles', form);
            }
            onRefresh();
            resetForm();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save sub-role');
        } finally {
            setSubmitting(false);
        }
    };

    const togglePage = (key) => {
        setForm(prev => {
            const has = prev.page_access.includes(key);
            return {
                ...prev,
                page_access: has ? prev.page_access.filter(p => p !== key) : [...prev.page_access, key]
            };
        });
    };

    const toggleField = (resource, key) => {
        setForm(prev => {
            const resFields = prev.field_restrictions[resource] || [];
            const has = resFields.includes(key);
            const newResFields = has ? resFields.filter(f => f !== key) : [...resFields, key];
            return {
                ...prev,
                field_restrictions: { ...prev.field_restrictions, [resource]: newResFields }
            };
        });
    };

    if (showForm) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-mainTheme">{editTarget ? 'Edit Sub-Role' : 'Create Sub-Role'}</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Name (Internal ID)</label>
                            <input
                                type="text" value={form.name} disabled={!!editTarget}
                                onChange={e => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                required className={inputCls} placeholder="e.g., finance_viewer"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Label (Display Name)</label>
                            <input
                                type="text" value={form.label}
                                onChange={e => setForm({ ...form, label: e.target.value })}
                                required className={inputCls} placeholder="e.g., Finance Viewer"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Description</label>
                            <input
                                type="text" value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className={inputCls} placeholder="What does this role do?"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Base Role</label>
                            <select
                                value={form.base_role}
                                onChange={e => setForm({ ...form, base_role: e.target.value })}
                                className={inputCls}
                            >
                                {roles.map(r => <option key={r.role_name} value={r.role_name}>{r.role_label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className={labelCls}>Page Access Restrictions</label>
                        <p className="text-xs text-gray-500 mb-3">Check pages to restrict access. Leave all unchecked to allow all base-role pages.</p>
                        <div className="flex flex-wrap gap-3">
                            {ALL_PAGES.map(p => (
                                <label key={p.key} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={form.page_access.includes(p.key)}
                                        onChange={() => togglePage(p.key)}
                                        className="rounded text-CD_Blue focus:ring-CD_Blue w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{p.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className={labelCls}>Field Hide Restrictions</label>
                        <p className="text-xs text-gray-500 mb-3">Check fields to hide them from users with this sub-role.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-bold text-gray-600 mb-2">Employees</h4>
                                <div className="flex flex-col gap-2">
                                    {ALL_FIELDS.employees.map(f => (
                                        <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(form.field_restrictions.employees || []).includes(f.key)}
                                                onChange={() => toggleField('employees', f.key)}
                                                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700">{f.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-600 mb-2">Project Details</h4>
                                <div className="flex flex-col gap-2">
                                    {ALL_FIELDS.project_detail.map(f => (
                                        <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(form.field_restrictions.project_detail || []).includes(f.key)}
                                                onChange={() => toggleField('project_detail', f.key)}
                                                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700">{f.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={submitting} className="px-5 py-2 bg-CD_Blue text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                            {submitting ? 'Saving...' : 'Save Sub-Role'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-CD_Blue text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    Create Sub-Role
                </button>
            </div>
            {subRoles.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm bg-gray-50 rounded-2xl border border-gray-100">
                    No sub-roles defined yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subRoles.map(sr => (
                        <div key={sr.sub_role_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col hover:border-CD_Blue/20 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-mainTheme text-base">{sr.label}</h4>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{sr.name}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[sr.base_role] || 'bg-gray-100 text-gray-600'}`}>
                                    {sr.base_role}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">{sr.description || 'No description provided.'}</p>

                            <div className="flex gap-4 mb-4 text-xs font-semibold text-gray-500">
                                <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                    {sr.page_access?.length || 0} Pages Restricted
                                </div>
                                <div className="bg-amber-50 px-2 py-1 rounded border border-amber-100 text-amber-700">
                                    {((sr.field_restrictions?.employees?.length || 0) + (sr.field_restrictions?.project_detail?.length || 0))} Fields Hidden
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-50 flex gap-2">
                                <button onClick={() => handleEdit(sr)} className="flex-1 py-1.5 text-xs font-bold text-mainTheme bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(sr.sub_role_id, sr.name)} className="flex-1 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const AccessControlSection = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [subRoles, setSubRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState({});
    const [acTab, setAcTab] = useState('users');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes, subRolesRes] = await Promise.all([
                api.get('/users'),
                api.get('/users/roles'),
                api.get('/sub-roles'),
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
            setSubRoles(subRolesRes.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRoleChange = async (userId, roleName) => {
        setUpdating(prev => ({ ...prev, [userId]: 'role' }));
        try {
            await api.put(`/users/${userId}/role`, { role_name: roleName });
            setUsers(prev => prev.map(u => u.id === userId ? {
                ...u,
                role_name: roleName,
                sub_role_id: null,
                sub_role_name: null,
                sub_role_label: null
            } : u));
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update role');
        } finally {
            setUpdating(prev => ({ ...prev, [userId]: null }));
        }
    };

    const handleSubRoleChange = async (userId, subRoleId) => {
        setUpdating(prev => ({ ...prev, [userId]: 'subrole' }));
        try {
            await api.put(`/users/${userId}/sub-role`, { sub_role_id: subRoleId || null });
            const sr = subRoles.find(s => s.sub_role_id === subRoleId);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, sub_role_id: subRoleId, sub_role_name: sr?.name, sub_role_label: sr?.label } : u));
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update sub-role');
        } finally {
            setUpdating(prev => ({ ...prev, [userId]: null }));
        }
    };

    const handleDeactivate = async (userId, email) => {
        if (!window.confirm(`Deactivate "${email}"? They will no longer be able to log in.`)) return;
        setUpdating(prev => ({ ...prev, [userId]: 'deactivate' }));
        try {
            await api.delete(`/users/${userId}`);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to deactivate user');
        } finally {
            setUpdating(prev => ({ ...prev, [userId]: null }));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
    );

    if (error) return (
        <div className="p-4 text-center text-red-600 font-medium text-sm">{error}</div>
    );

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                    {[{ id: 'users', label: 'Users' }, { id: 'sub-roles', label: 'Sub-Roles' }].map(t => (
                        <button key={t.id} onClick={() => setAcTab(t.id)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all
                                ${acTab === t.id ? 'bg-white shadow-sm text-mainTheme' : 'text-gray-500 hover:text-mainTheme'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    <RefreshCcw size={12} />
                    Refresh
                </button>
            </div>

            {acTab === 'sub-roles' ? (
                <SubRolesPanel subRoles={subRoles} roles={roles} onRefresh={fetchData} />
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Sub-Role</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map(user => (
                                <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[200px]">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <div className="relative inline-block w-full max-w-[140px]">
                                            <select
                                                value={user.role_name || ''}
                                                onChange={e => handleRoleChange(user.id, e.target.value)}
                                                disabled={!user.is_active || updating[user.id] === 'role'}
                                                className={`w-full appearance-none pl-2 pr-7 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed ${ROLE_COLORS[user.role_name] || 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {roles.map(r => (
                                                    <option key={r.role_name} value={r.role_name}>{r.role_label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative inline-block w-full max-w-[140px]">
                                            <select
                                                value={user.sub_role_id || ''}
                                                onChange={e => handleSubRoleChange(user.id, e.target.value ? parseInt(e.target.value) : null)}
                                                disabled={!user.is_active || updating[user.id] === 'subrole'}
                                                className="w-full appearance-none pl-2 pr-7 py-1 rounded-lg text-xs font-semibold cursor-pointer border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed bg-white text-gray-700"
                                            >
                                                <option value="">None</option>
                                                {subRoles.filter(sr => sr.base_role === user.role_name).map(sr => (
                                                    <option key={sr.sub_role_id} value={sr.sub_role_id}>{sr.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {user.is_active && (
                                            <button
                                                onClick={() => handleDeactivate(user.id, user.email)}
                                                disabled={updating[user.id] === 'deactivate'}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {updating[user.id] === 'deactivate'
                                                    ? <Loader2 size={12} className="animate-spin" />
                                                    : <UserX size={12} />}
                                                Deactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Settings component
// ─────────────────────────────────────────────

const Settings = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAtLeast } = usePermissions();
    const isAdmin = isAtLeast('master_admin');
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams, activeTab]);

    const TABS = useMemo(() => [
        { id: 'profile', label: 'Profile', icon: User },

        { id: 'data', label: 'Data', icon: Database },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare },
        ...(isAdmin ? [{ id: 'access-control', label: 'Access Control', icon: ShieldCheck }] : []),
        { id: 'appearance', label: 'Appearance', icon: Laptop },
    ], [isAdmin]);
    const [employeeData, setEmployeeData] = useState(null);
    const [empLoading, setEmpLoading] = useState(true);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [empNotLinked, setEmpNotLinked] = useState(false);

    useEffect(() => {
        const fetchEmployee = async () => {
            setEmpLoading(true);
            setEmpNotLinked(false);
            try {
                const email = localStorage.getItem('userEmail');
                if (!email) { setEmpNotLinked(true); return; }

                const idRes = await api.get(`/employee/by-email/${email}`);
                const { employee_id, linked } = idRes.data;

                if (!linked || !employee_id) { setEmpNotLinked(true); return; }

                const empRes = await api.get(`/employees/${employee_id}`);
                setEmployeeData(empRes.data);
            } catch (err) {
                setEmpNotLinked(true);
            } finally {
                setEmpLoading(false);
            }
        };
        fetchEmployee();
    }, []);

    const handleExportClick = async () => {
        setIsExporting(true);
        try {
            console.log("Settings: Fetching employees for export...");
            const data = await getEmployeeList(true, false, false);
            console.log("Settings: Received export data, count:", data?.length);
            setExportData(data);
            setShowExportModal(true);
        } catch (err) {
            console.error("Export fetch failed", err);
            toast.error("Failed to prepare export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleSyncAll = async () => {
        if (!window.confirm("This will re-calculate all employee allocations and statuses based on current project data. This may take a few seconds. Continue?")) return;

        setIsSyncing(true);
        try {
            await api.post('/employees/sync-all');
            clearDashboardCache();
            toast.success("Global data synchronization completed successfully.");
            window.location.reload();
        } catch (err) {
            console.error("Sync all failed", err);
            toast.error("Failed to sync data: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsSyncing(false);
        }
    };

    if (empLoading && !employeeData && activeTab === 'profile') {
        return <ModuleLoader label="Loading Settings" />;
    }

    return (
        <div className="flex h-full w-full bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Left Sidebar */}
            <div className="w-64 flex-shrink-0 bg-gray-50/50 border-r border-gray-100 flex flex-col">
                <div className="p-6 pb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 hover:text-mainTheme transition-colors font-medium text-sm"
                    >
                        <ArrowLeft size={16} />
                        Settings
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Preferences</p>
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === id
                                ? 'bg-white text-mainTheme shadow-sm border border-gray-100'
                                : 'text-gray-500 hover:bg-gray-200/50 hover:text-mainTheme border border-transparent'
                                }`}
                        >
                            <Icon size={16} className={activeTab === id ? 'text-CD_Blue' : 'text-gray-400'} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 h-full overflow-y-auto bg-white p-8">
                <div className="max-w-4xl mx-auto w-full">
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight mb-8">
                        {TABS.find(t => t.id === activeTab)?.label || 'Settings'}
                    </h1>

                    {/* Tab content */}
                    {activeTab === 'profile' && (
                        <ProfileSection
                            employeeData={employeeData}
                            loading={empLoading}
                            notLinked={empNotLinked}
                        />
                    )}

                    {activeTab === 'data' && (
                        <DataSection
                            employeeData={employeeData}
                            onExport={handleExportClick}
                            onImport={() => setShowBulkModal(true)}
                            onSync={handleSyncAll}
                            isExporting={isExporting}
                            isSyncing={isSyncing}
                            isAdmin={isAdmin}
                        />
                    )}
                    {activeTab === 'feedback' && <FeedbackSection employeeData={employeeData} />}
                    {activeTab === 'access-control' && <AccessControlSection />}
                    {activeTab === 'appearance' && <PlaceholderSection title="Appearance" />}
                </div>
            </div>

            {showBulkModal && <BulkImportModal onClose={() => setShowBulkModal(false)} />}
            {showExportModal && (
                <ExportPreviewModal
                    employees={exportData}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </div>
    );
}

export default Settings;
