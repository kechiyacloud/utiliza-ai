import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    User, Briefcase, Building2, Download, Loader2, ArrowLeft, BarChart2,
    X, Filter, Users, Clock, MapPin, Layers
} from 'lucide-react';
import api from '../api/axios';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

const EMPLOYEE_BASE_COLUMNS = [
    { header: 'Employee ID', dataKey: 'employee_id' },
    { header: 'Name', dataKey: 'employee_name' },
    { header: 'Email', dataKey: 'email_id' },
    { header: 'Department', dataKey: 'department' },
    { header: 'Designation', dataKey: 'role_designation' },
    { header: 'Location', dataKey: 'location' },
    { header: 'Status', dataKey: 'employee_status' },
    { header: 'Joining Date', dataKey: 'date_of_joining' }
];

const EMPLOYEE_UPCOMING_BENCH_COLUMNS = [
    { header: 'Employee ID', dataKey: 'employee_id' },
    { header: 'Name', dataKey: 'employee_name' },
    { header: 'Designation', dataKey: 'role_designation' },
    { header: 'Bench Date', dataKey: 'bench_date' }
];

const EMPLOYEE_PROJECT_COLUMNS = [
    { header: 'Employee ID', dataKey: 'employee_id' },
    { header: 'Name', dataKey: 'employee_name' },
    { header: 'Designation', dataKey: 'role_designation' },
    { header: 'Location', dataKey: 'location' },
    { header: 'Allocation %', dataKey: 'allocation_percentage' },
    { header: 'Allocation Start', dataKey: 'allocation_start_date' },
    { header: 'Allocation End', dataKey: 'allocation_end_date' },
    { header: 'Billable Tag', dataKey: 'project_tags' }
];

const SUBTYPES = [
    { id: 'all', label: 'All Employees', icon: Users, needsSelection: false },
    { id: 'bench', label: 'Bench Employees', icon: Users, needsSelection: false },
    { id: 'upcoming-bench', label: 'Upcoming Bench', icon: Clock, needsSelection: false },
    { id: 'project', label: 'By Project', icon: Briefcase, needsSelection: true },
    { id: 'department', label: 'By Department', icon: Layers, needsSelection: true },
    { id: 'location', label: 'By Location', icon: MapPin, needsSelection: true }
];

const sanitizeForFileName = (s) => String(s || '').trim().replace(/[\s/\\]+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');

const formatDate = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const EmployeeReportModal = ({ isOpen, onClose }) => {
    const [subtype, setSubtype] = useState('all');
    const [selectedValue, setSelectedValue] = useState('');
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [downloading, setDownloading] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoadingOptions(true);
        Promise.all([
            api.get('/employees/list'),
            api.get('/employees/filter-options'),
            api.get('/projects/list')
        ])
            .then(([empRes, optRes, projRes]) => {
                if (cancelled) return;
                setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
                setDepartments(optRes.data?.departments || []);
                setLocations(optRes.data?.locations || []);
                setProjects(Array.isArray(projRes.data) ? projRes.data : []);
            })
            .catch((err) => {
                console.error('Failed to load filter options', err);
                if (!cancelled) toast.error('Failed to load filter options.');
            })
            .finally(() => {
                if (!cancelled) setLoadingOptions(false);
            });
        return () => { cancelled = true; };
    }, [isOpen]);

    // Reset secondary selection when subtype changes
    useEffect(() => { setSelectedValue(''); }, [subtype]);

    const activeSubtype = useMemo(() => SUBTYPES.find(s => s.id === subtype) || SUBTYPES[0], [subtype]);

    const canDownload = !activeSubtype.needsSelection || Boolean(selectedValue);

    const subtypeLabelForFile = useMemo(() => {
        switch (subtype) {
            case 'all': return 'All';
            case 'bench': return 'Bench';
            case 'upcoming-bench': return 'UpcomingBench';
            case 'project': {
                const p = projects.find(p => String(p.project_id) === String(selectedValue));
                return `Project_${sanitizeForFileName(p?.project_name || selectedValue)}`;
            }
            case 'department': return `Department_${sanitizeForFileName(selectedValue)}`;
            case 'location': return `Location_${sanitizeForFileName(selectedValue)}`;
            default: return 'Report';
        }
    }, [subtype, selectedValue, projects]);

    const titleForExport = useMemo(() => {
        switch (subtype) {
            case 'all': return 'Employee Directory — All Employees';
            case 'bench': return 'Employee Directory — Bench';
            case 'upcoming-bench': return 'Employee Directory — Upcoming Bench';
            case 'project': {
                const p = projects.find(p => String(p.project_id) === String(selectedValue));
                return `Employee Directory — Project: ${p?.project_name || selectedValue}`;
            }
            case 'department': return `Employee Directory — Department: ${selectedValue}`;
            case 'location': return `Employee Directory — Location: ${selectedValue}`;
            default: return 'Employee Directory';
        }
    }, [subtype, selectedValue, projects]);

    const columnsForExport = useMemo(() => {
        if (subtype === 'upcoming-bench') return EMPLOYEE_UPCOMING_BENCH_COLUMNS;
        if (subtype === 'project') return EMPLOYEE_PROJECT_COLUMNS;
        return EMPLOYEE_BASE_COLUMNS;
    }, [subtype]);

    const buildRowsForBase = (rows) => rows.map(e => ({
        employee_id: e.employee_id ?? '',
        employee_name: e.employee_name ?? '',
        email_id: e.email_id ?? '',
        department: e.department ?? '',
        role_designation: e.role_designation ?? '',
        location: e.location ?? '',
        employee_status: e.employee_status ?? '',
        date_of_joining: formatDate(e.date_of_joining)
    }));

    const fetchDataForSubtype = async () => {
        switch (subtype) {
            case 'all':
                return buildRowsForBase(employees);
            case 'bench':
                return buildRowsForBase(employees.filter(e => (e.employee_status || '').toLowerCase() === 'bench'));
            case 'department':
                return buildRowsForBase(employees.filter(e => (e.department || '') === selectedValue));
            case 'location':
                return buildRowsForBase(employees.filter(e => (e.location || '') === selectedValue));
            case 'upcoming-bench': {
                const res = await api.get('/employees/upcoming-bench');
                const list = Array.isArray(res.data) ? res.data : [];
                return list.map(e => ({
                    employee_id: e.employee_id ?? '',
                    employee_name: e.employee_name ?? '',
                    role_designation: e.role_designation ?? '',
                    bench_date: formatDate(e.bench_date)
                }));
            }
            case 'project': {
                const res = await api.get(`/projects/${encodeURIComponent(selectedValue)}/resources`);
                const list = Array.isArray(res.data) ? res.data : (res.data?.resources || []);
                return list.map(r => ({
                    employee_id: r.employee_id ?? '',
                    employee_name: r.employee_name ?? r.name ?? '',
                    role_designation: r.role_designation ?? r.role ?? '',
                    location: r.location ?? '',
                    allocation_percentage: r.allocation_percentage ?? '',
                    allocation_start_date: formatDate(r.allocation_start_date),
                    allocation_end_date: formatDate(r.allocation_end_date),
                    project_tags: r.project_tags ?? ''
                }));
            }
            default:
                return [];
        }
    };

    const handleDownload = async (format) => {
        if (!canDownload) return;
        setDownloading(format);
        try {
            const rows = await fetchDataForSubtype();
            if (!rows || rows.length === 0) {
                toast.error('No data found for the selected report.');
                return;
            }
            const fileName = `Employee_Directory_${subtypeLabelForFile}_Report`;
            if (format === 'csv') {
                exportToCSV(rows, fileName);
            } else if (format === 'excel') {
                exportToExcel(rows, fileName);
            } else if (format === 'pdf') {
                await exportToPDF(rows, columnsForExport, titleForExport, fileName);
            }
            toast.success('Download started.');
        } catch (err) {
            console.error('Employee report download failed', err);
            toast.error('Failed to download the report. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-CD_Blue">
                            <Filter size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Employee Directory Report</h2>
                            <p className="text-xs text-gray-500 font-medium">Pick a report type and download</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
                    {/* Subtype selector */}
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Report Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {SUBTYPES.map((opt) => {
                                const Icon = opt.icon;
                                const active = subtype === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setSubtype(opt.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all
                                            ${active
                                                ? 'bg-CD_Blue text-white border-CD_Blue shadow-sm'
                                                : 'bg-white text-gray-600 border-slate-200 hover:border-blue-300 hover:text-CD_Blue'
                                            }`}
                                    >
                                        <Icon size={14} />
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Secondary dropdown */}
                    {activeSubtype.needsSelection && (
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                                {subtype === 'project' && 'Select Project'}
                                {subtype === 'department' && 'Select Department'}
                                {subtype === 'location' && 'Select Location'}
                            </label>
                            <select
                                value={selectedValue}
                                onChange={(e) => setSelectedValue(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 hover:border-slate-300 transition-all"
                                disabled={loadingOptions}
                            >
                                <option value="">{loadingOptions ? 'Loading...' : '— Choose —'}</option>
                                {subtype === 'project' && projects.map((p) => (
                                    <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                ))}
                                {subtype === 'department' && departments.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                                {subtype === 'location' && locations.map((l) => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Hint */}
                    <p className="text-xs text-slate-500">
                        All reports include the employee's <span className="font-bold text-slate-700">Employee ID</span> as the first column.
                    </p>
                </div>

                {/* Footer (format buttons) */}
                <div className="px-7 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    {['csv', 'excel', 'pdf'].map((format) => (
                        <button
                            key={format}
                            disabled={!canDownload || downloading !== null || loadingOptions}
                            onClick={() => handleDownload(format)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border
                                ${!canDownload || downloading !== null || loadingOptions
                                    ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
                                    : 'bg-white text-gray-600 border-slate-200 hover:bg-mainTheme hover:text-white hover:border-mainTheme shadow-sm'
                                }`}
                        >
                            {downloading === format ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            {format}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Reports = () => {
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState(null);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

    const reports = [
        {
            id: 'employees',
            title: 'Employee Directory',
            description: 'Full list of employees with their designations, departments, and contact info.',
            icon: User,
            endpoint: '/employees/list',
            fileName: 'Employee_Directory_Report',
            columns: EMPLOYEE_BASE_COLUMNS
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
            title: 'Client Overview',
            description: 'Complete database of clients and associated partners.',
            icon: Building2,
            endpoint: '/clients',
            fileName: 'Client_Report',
            columns: [
                { header: 'Client Name', dataKey: 'name' },
                { header: 'Industry', dataKey: 'industry' },
                { header: 'Status', dataKey: 'status' },
                { header: 'Budget', dataKey: 'budget' },
                { header: 'Project Count', dataKey: 'project_count' },
                { header: 'Onboarded Date', dataKey: 'onboarded_date' }
            ]
        }
    ];

    const handleDownload = async (report, format) => {
        const downloadId = `${report.id}-${format}`;
        setDownloading(downloadId);
        try {
            const res = await api.get(report.endpoint);
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);

            let exportData = data;
            if (report.id === 'clients') {
                exportData = data.map(c => ({
                    name: c.name,
                    industry: c.industry ?? '',
                    status: c.status ?? '',
                    budget: c.budget ?? 0,
                    project_count: Array.isArray(c.projects) ? c.projects.length : 0,
                    onboarded_date: c.onboarded_date ?? ''
                }));
            }

            if (format === 'csv') {
                exportToCSV(exportData, report.fileName);
            } else if (format === 'excel') {
                exportToExcel(exportData, report.fileName);
            } else if (format === 'pdf') {
                await exportToPDF(exportData, report.columns, report.title, report.fileName);
            }
        } catch (err) {
            console.error(`Export failed for ${report.title}`, err);
            toast.error(`Failed to download ${report.title}. Please try again.`);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                            <BarChart2 className="text-CD_Blue" />
                            Reports
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Export and download system data</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col hover:border-CD_Blue/20 transition-all group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-slate-50 text-CD_Blue group-hover:bg-CD_Blue group-hover:text-white transition-colors">
                                <report.icon size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-mainTheme text-lg group-hover:text-CD_Blue transition-colors">{report.title}</h3>
                                <p className="text-xs text-gray-500 font-medium line-clamp-1">{report.description}</p>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center gap-2">
                            {report.id === 'employees' ? (
                                <button
                                    onClick={() => setIsEmployeeModalOpen(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-mainTheme text-white hover:bg-CD_Blue transition-all shadow-sm"
                                >
                                    <Filter size={14} />
                                    Configure & Download
                                </button>
                            ) : (
                                ['csv', 'excel', 'pdf'].map((format) => (
                                    <button
                                        key={format}
                                        disabled={downloading !== null}
                                        onClick={() => handleDownload(report, format)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all
                                            ${downloading === `${report.id}-${format}`
                                                ? 'bg-slate-100 text-slate-400'
                                                : 'bg-slate-50 text-gray-600 hover:bg-mainTheme hover:text-white'
                                            }`}
                                    >
                                        {downloading === `${report.id}-${format}` ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Download size={12} />
                                        )}
                                        {format}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <EmployeeReportModal
                isOpen={isEmployeeModalOpen}
                onClose={() => setIsEmployeeModalOpen(false)}
            />
        </div>
    );
};

export default Reports;
