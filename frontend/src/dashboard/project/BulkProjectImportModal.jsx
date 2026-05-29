import React, { useState, useRef } from 'react';
import {
    X, Upload, Download, CheckCircle2, AlertCircle, Loader2,
    FolderKanban, Users, Building2, Handshake, Network, User,
    Info, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios';
import { exportToCSV } from '../../utils/exportUtils';

const TEMPLATE_COLUMNS = [
    'project_name', 'project_type', 'project_status', 'billable',
    'start_date', 'end_date', 'client_id', 'client_name',
    'partner_id', 'partner_name', 'department_id', 'department_name',
    'employee_id', 'role_in_project', 'allocation_percentage',
    'allocation_start_date', 'allocation_end_date', 'location', 'project_tags',
];

const EXAMPLE_ROWS = [
    {
        project_name: 'AI Search Assistant', project_type: 'Client', project_status: 'Active',
        billable: 'Billable', start_date: '2026-06-01', end_date: '2026-12-31',
        client_id: 'CLT-0001', client_name: '', partner_id: '', partner_name: '',
        department_id: 'DEPT-001', department_name: '',
        employee_id: 'yourname@company.com',
        role_in_project: 'Frontend Engineer', allocation_percentage: 50,
        allocation_start_date: '2026-06-01', allocation_end_date: '2026-12-31',
        location: 'Remote', project_tags: 'Billable',
    },
    {
        project_name: 'New Client Project', project_type: 'Client', project_status: 'Active',
        billable: 'Billable', start_date: '2026-07-01', end_date: '2026-12-31',
        client_id: '', client_name: 'Acme Corp', partner_id: '', partner_name: '',
        department_id: '', department_name: 'Product Design',
        employee_id: 'anotheruser@company.com',
        role_in_project: 'Developer', allocation_percentage: 100,
        allocation_start_date: '2026-07-01', allocation_end_date: '2026-12-31',
        location: 'Remote', project_tags: 'Billable',
    },
];

const STEP_LABELS = ['Upload', 'Preview', 'Done'];

const BulkProjectImportModal = ({ onClose }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [validating, setValidating] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [dryRunResult, setDryRunResult] = useState(null);
    const [finalResult, setFinalResult] = useState(null);
    const [apiError, setApiError] = useState('');
    const fileInputRef = useRef();

    const handleDownloadTemplate = () => {
        exportToCSV(EXAMPLE_ROWS, 'bulk_upload_template');
    };

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.endsWith('.csv')) {
            setApiError('Only .csv files are accepted.');
            return;
        }
        setApiError('');
        setFile(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleValidate = async () => {
        if (!file) return;
        setValidating(true);
        setApiError('');
        setDryRunResult(null);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await api.post('/projects/import/bulk?dry_run=true', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setDryRunResult(res.data);
            setStep(2);
        } catch (err) {
            setApiError(err?.response?.data?.detail || 'Validation failed. Please try again.');
        } finally {
            setValidating(false);
        }
    };

    const handleConfirm = async () => {
        if (!file) return;
        setConfirming(true);
        setApiError('');
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await api.post('/projects/import/bulk?dry_run=false', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setFinalResult(res.data);
            setStep(3);
        } catch (err) {
            setApiError(err?.response?.data?.detail || 'Import failed. Please try again.');
        } finally {
            setConfirming(false);
        }
    };

    const reset = () => {
        setStep(1);
        setFile(null);
        setDryRunResult(null);
        setFinalResult(null);
        setApiError('');
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FolderKanban size={18} className="text-blue-600" />
                        <h2 className="font-bold text-gray-900 text-base">Bulk Import Projects</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-0 px-6 pt-4">
                    {STEP_LABELS.map((label, i) => {
                        const num = i + 1;
                        const active = step === num;
                        const done = step > num;
                        return (
                            <React.Fragment key={label}>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        {done ? <CheckCircle2 size={13} /> : num}
                                    </div>
                                    <span className={`text-xs font-medium ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
                                </div>
                                {i < STEP_LABELS.length - 1 && (
                                    <div className={`flex-1 h-px mx-2 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* ── Step 1: Upload ── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Upload a CSV with project and allocation data.
                                    Use <strong>client_name</strong> / <strong>partner_name</strong> / <strong>department_name</strong> instead of IDs — new ones are auto-created.
                                </p>
                            </div>

                            <button
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                <Download size={15} />
                                Download template CSV
                            </button>

                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => handleFile(e.target.files[0])}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <CheckCircle2 size={28} className="text-emerald-500" />
                                        <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                                        <p className="text-xs text-emerald-600">Click to replace</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-500">
                                        <Upload size={28} />
                                        <p className="text-sm font-medium">Drag &amp; drop CSV or click to browse</p>
                                        <p className="text-xs">.csv only</p>
                                    </div>
                                )}
                            </div>

                            {apiError && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    {apiError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 2: Preview (dry-run result) ── */}
                    {step === 2 && dryRunResult && (
                        <div className="space-y-4">
                            {dryRunResult.success ? (
                                <>
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <p className="text-sm font-semibold text-blue-900 mb-3">Ready to import</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <SummaryTile icon={FolderKanban} label="Projects" count={dryRunResult.summary.projects} color="blue" />
                                            <SummaryTile icon={Users} label="Allocations" count={dryRunResult.summary.allocations} color="indigo" />
                                            {dryRunResult.summary.new_clients > 0 && (
                                                <SummaryTile icon={Building2} label="New Clients" count={dryRunResult.summary.new_clients} color="violet" />
                                            )}
                                            {dryRunResult.summary.new_partners > 0 && (
                                                <SummaryTile icon={Handshake} label="New Partners" count={dryRunResult.summary.new_partners} color="purple" />
                                            )}
                                            {dryRunResult.summary.new_departments > 0 && (
                                                <SummaryTile icon={Network} label="New Departments" count={dryRunResult.summary.new_departments} color="cyan" />
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        All rows validated successfully. Click <strong>Confirm Import</strong> to write to database.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                        <AlertCircle size={16} className="flex-shrink-0" />
                                        <p className="text-sm font-semibold">{dryRunResult.errors?.length} row(s) have errors. Fix and re-upload.</p>
                                    </div>
                                    {(() => {
                                        const invalidEmpRows = dryRunResult.errors?.filter(
                                            e => e.errors?.some(m => m.toLowerCase().includes('employee'))
                                        ).length || 0;
                                        return invalidEmpRows > 0 && (
                                            <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                                                <User size={14} className="flex-shrink-0" />
                                                <p className="text-xs">
                                                    <strong>{invalidEmpRows}</strong> row(s) reference an employee that does not exist in the system.
                                                    Verify the email / employee ID matches an active employee record.
                                                </p>
                                            </div>
                                        );
                                    })()}
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {dryRunResult.errors?.map((err, i) => (
                                            <div key={i} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                                <div className="flex items-center justify-between mb-1 gap-2">
                                                    <p className="text-xs font-bold text-red-700">
                                                        Row {err.row} — {err.project || 'Unknown project'}
                                                    </p>
                                                    {err.employee && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-md flex-shrink-0">
                                                            <User size={11} />
                                                            {err.employee}
                                                        </span>
                                                    )}
                                                </div>
                                                {err.errors?.map((msg, j) => (
                                                    <p key={j} className="text-xs text-red-600">• {msg}</p>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {apiError && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    {apiError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 3: Result ── */}
                    {step === 3 && finalResult && (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                            <div>
                                <p className="font-bold text-gray-900 text-base">Import Successful!</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {finalResult.summary.projects} project(s), {finalResult.summary.allocations} allocation(s) created or updated.
                                    {finalResult.summary.new_clients > 0 && ` ${finalResult.summary.new_clients} new client(s) created.`}
                                    {finalResult.summary.new_partners > 0 && ` ${finalResult.summary.new_partners} new partner(s) created.`}
                                    {finalResult.summary.new_departments > 0 && ` ${finalResult.summary.new_departments} new department(s) created.`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                    {step === 1 && (
                        <>
                            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                                Cancel
                            </button>
                            <button
                                onClick={handleValidate}
                                disabled={!file || validating}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {validating ? <><Loader2 size={14} className="animate-spin" /> Validating...</> : 'Validate'}
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                                Re-upload
                            </button>
                            {dryRunResult?.success ? (
                                <button
                                    onClick={handleConfirm}
                                    disabled={confirming}
                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {confirming ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : 'Confirm Import'}
                                </button>
                            ) : (
                                <button onClick={reset} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:opacity-90">
                                    Fix &amp; Re-upload
                                </button>
                            )}
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                                Import Another
                            </button>
                            <button onClick={onClose} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:opacity-90">
                                Done
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const SummaryTile = ({ icon: Icon, label, count, color }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        violet: 'bg-violet-100 text-violet-700',
        purple: 'bg-purple-100 text-purple-700',
        cyan: 'bg-cyan-100 text-cyan-700',
    };
    return (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${colors[color] || colors.blue}`}>
            <Icon size={16} />
            <div>
                <p className="text-xs font-medium opacity-75">{label}</p>
                <p className="text-base font-bold leading-tight">{count}</p>
            </div>
        </div>
    );
};

export default BulkProjectImportModal;
