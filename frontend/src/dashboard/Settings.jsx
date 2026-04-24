import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Archive, Trash2, Upload, Download, RefreshCcw, Database
} from 'lucide-react';
import { getEmployeeList } from '../api/employeeApi';
import ExportPreviewModal from './employee/ExportPreviewModal';
import { clearDashboardCache } from '../api/dashboardApi';
import ModuleLoader from '../components/ModuleLoader';

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
                        placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behavior..."
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
// Section D — Auto Reports (placeholder)
// ─────────────────────────────────────────────

const AutoReportsSection = () => (
    <div className="relative">
        {/* Non-functional preview UI (blurred) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 opacity-40 pointer-events-none select-none">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Report Configuration</p>
            <div className="space-y-5 max-w-2xl">
                <div>
                    <p className={labelCls}>Frequency</p>
                    <div className="flex gap-2">
                        {['Daily', 'Weekly', 'Monthly'].map(f => (
                            <span key={f} className="px-4 py-1.5 text-sm rounded-xl border border-gray-200 font-medium text-gray-600 bg-gray-50">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
                <div>
                    <p className={labelCls}>Report Type</p>
                    <div className="flex flex-wrap gap-2">
                        {['Resource Utilization', 'Project Summary', 'Allocation Overview'].map(r => (
                            <span key={r} className="px-4 py-1.5 text-sm rounded-xl border border-gray-200 font-medium text-gray-600 bg-gray-50">
                                {r}
                            </span>
                        ))}
                    </div>
                </div>
                <div>
                    <p className={labelCls}>Date Range</p>
                    <div className="flex gap-3 items-center">
                        <input type="date" className={`${inputCls} max-w-[160px]`} readOnly />
                        <span className="text-gray-400 text-sm">to</span>
                        <input type="date" className={`${inputCls} max-w-[160px]`} readOnly />
                    </div>
                </div>
                <div>
                    <p className={labelCls}>Delivery Email</p>
                    <input type="email" className={`${inputCls} max-w-xs`} placeholder="you@organization.com" readOnly />
                </div>
                <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-mainTheme text-white text-sm font-semibold rounded-xl opacity-50 cursor-not-allowed">
                    <FileText size={15} /> Schedule Report
                </button>
            </div>
        </div>

        {/* Coming Soon overlay */}
        <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl z-10 gap-3">
            <Soon_GIF className="w-20 h-20" />
            <p className="text-base font-bold text-mainTheme">Coming Soon</p>
            <p className="text-sm text-gray-500 text-center max-w-xs">
                Automated email report scheduling is currently in development.
            </p>
        </div>
    </div>
);

// ─────────────────────────────────────────────
// Section E — Admin (Admin/HR only)
// ─────────────────────────────────────────────

const AdminSection = ({ employeeData }) => {
    const { showArchived, setShowArchived, showDeleted, setShowDeleted } = useEmployees();
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportData, setExportData] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncAll = async () => {
        if (!window.confirm("This will re-calculate all employee allocations and statuses based on current project data. This may take a few seconds. Continue?")) return;
        
        setIsSyncing(true);
        try {
            await api.post('/employees/sync-all');
            clearDashboardCache();
            alert("Global data synchronization completed successfully.");
            window.location.reload(); // Refresh to show fresh data
        } catch (err) {
            console.error("Sync all failed", err);
            alert("Failed to sync data: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExportClick = async () => {
        setIsExporting(true);
        try {
            // Specifically fetch active employees only (no resigned/deleted) as requested
            const data = await getEmployeeList(true, false, false); 
            setExportData(data);
            setShowExportModal(true);
        } catch (err) {
            console.error("Export fetch failed", err);
            alert("Failed to prepare export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

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
                    <button
                        onClick={() => setShowBulkModal(true)}
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

                    <button
                        onClick={handleExportClick}
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

                    <button
                        onClick={handleSyncAll}
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
};

// ─────────────────────────────────────────────
// Main Settings component
// ─────────────────────────────────────────────

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'reports', label: 'Auto Reports', icon: BarChart2 },
];

const Settings = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [employeeData, setEmployeeData] = useState(null);
    const [empLoading, setEmpLoading] = useState(true);
    const [empNotLinked, setEmpNotLinked] = useState(false);

    const isAdminPrivileged = true; // Enabled for all users as requested

    const tabs = useMemo(() => {
        const baseTabs = [...TABS];
        if (isAdminPrivileged) {
            baseTabs.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
        }
        return baseTabs;
    }, [isAdminPrivileged]);

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

    if (empLoading && !employeeData && activeTab === 'profile') {
        return <ModuleLoader label="Loading Settings" />;
    }

    return (
        <div className="p-6 min-h-full">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
                    title="Go Back"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Settings</h1>
                    <p className="text-sm font-medium text-gray-500">Manage your profile, integrations, and preferences</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 mb-6 border-b border-gray-200">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                            ${activeTab === id
                                ? 'border-CD_Blue text-CD_Blue'
                                : 'border-transparent text-gray-500 hover:text-mainTheme'
                            }`}
                    >
                        <Icon size={14} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'profile' && (
                <ProfileSection
                    employeeData={employeeData}
                    loading={empLoading}
                    notLinked={empNotLinked}
                />
            )}
            {activeTab === 'feedback' && <FeedbackSection employeeData={employeeData} />}
            {activeTab === 'reports' && <AutoReportsSection />}
            {activeTab === 'admin' && isAdminPrivileged && <AdminSection employeeData={employeeData} />}
        </div>
    );
}

export default Settings;
