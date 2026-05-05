import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Archive, Trash2, Upload, Download, RefreshCcw, Database, UserX, ChevronDown
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
// Section D — Reports
// ─────────────────────────────────────────────

const ReportsSection = () => {
    const [downloading, setDownloading] = useState(null);

    const reports = [
        {
            id: 'employees',
            title: 'Employee Directory',
            description: 'Full list of employees with their designations, departments, and contact info.',
            icon: User,
            endpoint: '/employees/list',
            fileName: 'Employee_Directory_Report',
            columns: [
                { header: 'Name', dataKey: 'name' },
                { header: 'Email', dataKey: 'email' },
                { header: 'Department', dataKey: 'department' },
                { header: 'Designation', dataKey: 'designation' },
                { header: 'Status', dataKey: 'employee_status' }
            ]
        },
        {
            id: 'projects',
            title: 'Projects Overview',
            description: 'Consolidated list of all active and historical projects with status and timelines.',
            icon: Briefcase,
            endpoint: '/projects/list',
            fileName: 'Projects_Overview_Report',
            columns: [
                { header: 'Project Name', dataKey: 'project_name' },
                { header: 'Client', dataKey: 'client_name' },
                { header: 'Status', dataKey: 'status' },
                { header: 'Start Date', dataKey: 'start_date' },
                { header: 'End Date', dataKey: 'end_date' }
            ]
        },
        {
            id: 'clients',
            title: 'Client Roster',
            description: 'Complete database of clients and associated partners.',
            icon: Building2,
            endpoint: '/clients',
            fileName: 'Client_Roster_Report',
            columns: [
                { header: 'Client Name', dataKey: 'client_name' },
                { header: 'Partner', dataKey: 'partner_name' },
                { header: 'Location', dataKey: 'location' },
                { header: 'Contact', dataKey: 'primary_contact' }
            ]
        }
    ];

    const handleDownload = async (report, format) => {
        const downloadId = `${report.id}-${format}`;
        setDownloading(downloadId);
        try {
            const res = await api.get(report.endpoint);
            // Handle different API response structures
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);

            if (format === 'csv') {
                exportToCSV(data, report.fileName);
            } else if (format === 'excel') {
                exportToExcel(data, report.fileName);
            } else if (format === 'pdf') {
                await exportToPDF(data, report.columns, report.title, report.fileName);
            }
        } catch (err) {
            console.error(`Export failed for ${report.title}`, err);
            alert(`Failed to download ${report.title}. Please try again.`);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => (
                <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col hover:border-CD_Blue/20 transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-slate-50 text-CD_Blue">
                            <report.icon size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-mainTheme text-lg">{report.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1">{report.description}</p>
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center gap-2">
                        {['csv', 'excel', 'pdf'].map((format) => (
                            <button
                                key={format}
                                disabled={downloading !== null}
                                onClick={() => handleDownload(report, format)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                                    ${downloading === `${report.id}-${format}` 
                                        ? 'bg-slate-100 text-slate-400' 
                                        : 'bg-slate-50 text-gray-600 hover:bg-mainTheme hover:text-white'
                                    }`}
                            >
                                {downloading === `${report.id}-${format}` ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Download size={14} />
                                )}
                                {format}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────
// Section E — Data
// ─────────────────────────────────────────────

const DataSection = ({ employeeData, onExport, onImport, isExporting, isSyncing, onSync, isAdmin }) => {
    const { showArchived, setShowArchived, showDeleted, setShowDeleted } = useEmployees();



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

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <Trash2 size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Show Deleted Records</p>
                                <p className="text-[10px] text-slate-500 font-medium tracking-tight">Show employees marked as deleted</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDeleted(!showDeleted)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${showDeleted ? 'bg-red-600' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showDeleted ? 'left-7' : 'left-1'}`} />
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
                            onClick={onImport}
                            className="flex-1 min-w-[200px] flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors text-left"
                        >
                            <div className="p-3 bg-blue-600 text-white rounded-xl">
                                <Upload size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-blue-900">Import Employees</p>
                                <p className="text-xs text-blue-700/60 font-medium">Upload CSV or Excel files</p>
                            </div>
                        </button>
                    )}

                    <button
                        onClick={onExport}
                        disabled={isExporting}
                        className="flex-1 min-w-[200px] flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-colors text-left disabled:opacity-50"
                    >
                        <div className="p-3 bg-emerald-600 text-white rounded-xl">
                            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                        </div>
                        <div>
                            <p className="font-bold text-emerald-900">Export All Records</p>
                            <p className="text-xs text-emerald-700/60 font-medium">Download active employee list (CSV)</p>
                        </div>
                    </button>

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
// Access Control Section
// ─────────────────────────────────────────────

const ROLE_COLORS = {
    master_admin:      'bg-purple-100 text-purple-800',
    editor:            'bg-blue-100 text-blue-800',
    viewer:            'bg-green-100 text-green-800',
    restricted_viewer: 'bg-gray-100 text-gray-600',
};

const AccessControlSection = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/users'),
                api.get('/users/roles'),
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
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
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_name: roleName } : u));
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to update role');
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
            alert(err.response?.data?.detail || 'Failed to deactivate user');
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
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{users.length} registered accounts</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    <RefreshCcw size={12} />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Last Login</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map(user => (
                            <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                                <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[200px]">{user.email}</td>
                                <td className="px-4 py-3">
                                    <div className="relative inline-block">
                                        <select
                                            value={user.role_name || ''}
                                            onChange={e => handleRoleChange(user.id, e.target.value)}
                                            disabled={!user.is_active || updating[user.id] === 'role'}
                                            className={`appearance-none pl-2 pr-7 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed ${ROLE_COLORS[user.role_name] || 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {roles.map(r => (
                                                <option key={r.role_name} value={r.role_name}>{r.role_label}</option>
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
                                <td className="px-4 py-3 text-gray-400 text-xs">
                                    {user.last_login_at
                                        ? new Date(user.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        : '—'}
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
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Settings component
// ─────────────────────────────────────────────

const Settings = () => {
    const navigate = useNavigate();
    const { isAtLeast } = usePermissions();
    const isAdmin = isAtLeast('master_admin');
    const [activeTab, setActiveTab] = useState('profile');

    const TABS = useMemo(() => [
        { id: 'profile',        label: 'Profile',         icon: User },
        { id: 'reports',        label: 'Report',          icon: BarChart2 },
        { id: 'data',           label: 'Data',            icon: Database },
        { id: 'feedback',       label: 'Feedback',        icon: MessageSquare },
        { id: 'mcp',            label: 'MCP',             icon: SettingsIcon },
        ...(isAdmin ? [{ id: 'access-control', label: 'Access Control', icon: ShieldCheck }] : []),
        { id: 'appearance',     label: 'Appearance',      icon: Laptop },
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
            alert("Failed to prepare export data. Please try again.");
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
            alert("Global data synchronization completed successfully.");
            window.location.reload(); 
        } catch (err) {
            console.error("Sync all failed", err);
            alert("Failed to sync data: " + (err.response?.data?.detail || err.message));
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
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                activeTab === id
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
                    {activeTab === 'reports' && <ReportsSection />}
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
                    {activeTab === 'mcp' && <PlaceholderSection title="MCP" />}
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
