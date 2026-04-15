import React, { useState, useEffect, useRef } from 'react';
import { useDataRefresh } from '../../context';
import * as XLSX from 'xlsx';
import {
    X, Upload, Download, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
    FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, Loader2,
    Building2, FolderKanban, Calendar, Layers
} from 'lucide-react';
import { importAllocations, fetchFilterOptions, fetchAllocationProjects } from '../../api/allocationApi';
import { exportToCSV } from '../../utils/exportUtils';

// ── Column definitions ───────────────────────────────────────────────────────
const MONTHLY_COLS = [
    { name: 'employee_id',           required: true,  desc: 'Employee ID (e.g. EMP-00001)' },
    { name: 'project_id',            required: 'dept', desc: 'Project ID — omit for Project-wise (auto-filled)' },
    { name: 'allocation_percentage', required: true,  desc: 'Integer 0–100' },
    { name: 'role_in_project',       required: false, desc: 'Role on the project (e.g. Developer)' },
    { name: 'project_tags',          required: false, desc: '"billable" or "non-billable". Defaults to billable.' },
];
const BULK_EXTRA_COLS = [
    { name: 'allocation_start_date', required: true,  desc: 'Start date in YYYY-MM-DD format' },
    { name: 'allocation_end_date',   required: true,  desc: 'End date in YYYY-MM-DD format' },
];
const SAMPLE_VALUES = {
    employee_id: 'EMP-00001',
    project_id: 'PRJ-00001',
    allocation_percentage: 80,
    role_in_project: 'Developer',
    project_tags: 'billable',
    allocation_start_date: '2025-01-01',
    allocation_end_date: '2025-03-31',
};

const STEP_LABELS = ['Scope', 'Period', 'Template', 'Upload', 'Review'];

// ── Main Component ────────────────────────────────────────────────────────────
const ImportAllocationModal = ({ onClose, onImportSuccess }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { triggerRefresh } = useDataRefresh();

    // Step 1
    const [importScope, setImportScope] = useState(null);   // "department" | "project"
    const [scopeValue, setScopeValue] = useState('');
    const [departments, setDepartments] = useState([]);
    const [projects, setProjects] = useState([]);

    // Step 2
    const [importMode, setImportMode] = useState(null);     // "monthly" | "bulk"
    const [selectedMonth, setSelectedMonth] = useState('');

    // Step 4
    const [parsedRows, setParsedRows] = useState([]);
    const [parseError, setParseError] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef();

    // Step 5
    const [reviewResult, setReviewResult] = useState(null);
    const [reviewError, setReviewError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [openSections, setOpenSections] = useState({ new: true, updated: true, over: true, invalid: true });

    // ── Fetch dropdowns on mount ─────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const [filterOpts, projectList] = await Promise.all([
                fetchFilterOptions(),
                fetchAllocationProjects(),
            ]);
            setDepartments(filterOpts.departments || []);
            setProjects(projectList || []);
        };
        init();
    }, []);

    // ── Trigger dry-run when reaching Step 5 ────────────────────────────────
    useEffect(() => {
        if (step !== 5) return;
        const runDryRun = async () => {
            setLoading(true);
            setReviewError(null);
            setReviewResult(null);
            try {
                const result = await importAllocations({
                    records: parsedRows,
                    dry_run: true,
                    import_mode: importMode,
                    import_scope: importScope,
                    selected_month: importMode === 'monthly' ? selectedMonth : null,
                    scope_value: scopeValue,
                });
                setReviewResult(result);
            } catch (err) {
                setReviewError(err.response?.data?.detail || err.message || 'Unexpected error during review.');
            } finally {
                setLoading(false);
            }
        };
        runDryRun();
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Template download ────────────────────────────────────────────────────
    const handleDownloadTemplate = () => {
        const cols = importMode === 'bulk'
            ? [...MONTHLY_COLS, ...BULK_EXTRA_COLS]
            : MONTHLY_COLS;
        const headers = cols
            .filter(c => !(importScope === 'project' && c.name === 'project_id'))
            .map(c => c.name);
        const sampleRow = {};
        headers.forEach(h => { sampleRow[h] = SAMPLE_VALUES[h] ?? ''; });
        exportToCSV([sampleRow], 'allocation_import_template');
    };

    // ── File parsing ─────────────────────────────────────────────────────────
    const parseFile = (file) => {
        setParseError(null);
        setParsedRows([]);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (rawRows.length === 0) {
                    setParseError('File is empty or has no data rows.');
                    return;
                }

                // Normalise keys to lowercase
                const rows = rawRows.map(row => {
                    const n = {};
                    Object.keys(row).forEach(k => { n[k.trim().toLowerCase()] = row[k]; });
                    return n;
                });

                // Validate required columns
                const required = ['employee_id', 'allocation_percentage'];
                if (importMode === 'bulk') required.push('allocation_start_date', 'allocation_end_date');
                const firstKeys = Object.keys(rows[0]);
                const missing = required.filter(r => !firstKeys.includes(r));
                if (missing.length > 0) {
                    setParseError(`Missing required column(s): ${missing.join(', ')}`);
                    return;
                }

                // Enrich rows
                const finalRows = rows.map(r => ({
                    ...r,
                    project_id: importScope === 'project' ? scopeValue : String(r.project_id || ''),
                    allocation_percentage: parseInt(r.allocation_percentage, 10) || 0,
                }));

                setParsedRows(finalRows);
            } catch {
                setParseError('Failed to parse file. Ensure it is a valid CSV or Excel file.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) parseFile(file);
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleApproveAndSave = async () => {
        setSaving(true);
        setReviewError(null);
        try {
            await importAllocations({
                records: parsedRows,
                dry_run: false,
                import_mode: importMode,
                import_scope: importScope,
                selected_month: importMode === 'monthly' ? selectedMonth : null,
                scope_value: scopeValue,
            });
            onClose();
            onImportSuccess();
            triggerRefresh(); // trigger auto-refresh for allocations/dashboard
        } catch (err) {
            setReviewError(err.response?.data?.detail || err.message || 'Save failed. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Navigation guards ────────────────────────────────────────────────────
    const canProceed = () => {
        if (step === 1) return importScope && scopeValue;
        if (step === 2) return importMode && (importMode === 'bulk' || selectedMonth);
        if (step === 3) return true;
        if (step === 4) return parsedRows.length > 0 && !parseError;
        return false;
    };

    const goNext = () => {
        if (step === 4) {
            // Clear previous review before going to step 5
            setReviewResult(null);
            setReviewError(null);
        }
        setStep(s => s + 1);
    };

    const goBack = () => {
        if (step === 4) { setParsedRows([]); setParseError(null); }
        setStep(s => s - 1);
    };

    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    // ── Column definitions for template step ────────────────────────────────
    const templateCols = (() => {
        const cols = importMode === 'bulk' ? [...MONTHLY_COLS, ...BULK_EXTRA_COLS] : MONTHLY_COLS;
        return cols.filter(c => !(importScope === 'project' && c.name === 'project_id'));
    })();

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Import Allocations</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Step {step} of 5 — {STEP_LABELS[step - 1]}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Step progress bar */}
                <div className="flex gap-1 px-6 py-3 border-b border-slate-100 bg-white">
                    {STEP_LABELS.map((label, i) => (
                        <div key={label} className="flex-1">
                            <div className={`h-1.5 rounded-full transition-all ${i + 1 <= step ? 'bg-blue-500' : 'bg-slate-100'}`} />
                            <p className={`text-[10px] mt-1 font-medium text-center ${i + 1 === step ? 'text-blue-600' : 'text-slate-400'}`}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* ── Step 1: Scope ───────────────────────────────────── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">How would you like to organise this import?</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { key: 'department', icon: Building2, label: 'Department-wise', desc: 'Import allocations grouped by department' },
                                    { key: 'project',    icon: FolderKanban, label: 'Project-wise', desc: 'Import allocations for a specific project' },
                                ].map(({ key, icon: Icon, label, desc }) => (
                                    <button
                                        key={key}
                                        onClick={() => { setImportScope(key); setScopeValue(''); }}
                                        className={`flex flex-col items-start gap-2 p-5 rounded-xl border-2 text-left transition-all ${importScope === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${importScope === key ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-semibold ${importScope === key ? 'text-blue-700' : 'text-slate-700'}`}>{label}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {importScope && (
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                        {importScope === 'department' ? 'Select Department' : 'Select Project'}
                                    </label>
                                    <select
                                        value={scopeValue}
                                        onChange={e => setScopeValue(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="">— Select —</option>
                                        {importScope === 'department'
                                            ? departments.map(d => <option key={d} value={d}>{d}</option>)
                                            : projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)
                                        }
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 2: Period ──────────────────────────────────── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">Choose how the allocation period is defined.</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { key: 'monthly', icon: Calendar, label: 'Monthly', desc: 'All rows apply to a single month — dates auto-filled' },
                                    { key: 'bulk',    icon: Layers,   label: 'Bulk',    desc: 'Each row has its own start and end dates in the file' },
                                ].map(({ key, icon: Icon, label, desc }) => (
                                    <button
                                        key={key}
                                        onClick={() => setImportMode(key)}
                                        className={`flex flex-col items-start gap-2 p-5 rounded-xl border-2 text-left transition-all ${importMode === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${importMode === key ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-semibold ${importMode === key ? 'text-blue-700' : 'text-slate-700'}`}>{label}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {importMode === 'monthly' && (
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Month</label>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 3: Template ────────────────────────────────── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-500">Your file must have these columns. Download the template to get started.</p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Download size={14} />
                                    Download Template
                                </button>
                            </div>

                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Column</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Required</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {templateCols.map(col => (
                                            <tr key={col.name} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2.5">
                                                    <code className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{col.name}</code>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {col.required === true
                                                        ? <span className="text-xs font-medium text-red-500">Required</span>
                                                        : <span className="text-xs font-medium text-slate-400">Optional</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-slate-500">{col.desc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <AlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-700">
                                    {importScope === 'project'
                                        ? `The project_id column is not required — all rows will be automatically assigned to the selected project.`
                                        : `Both employee_id and project_id must match existing records in the system.`
                                    }
                                    {importMode === 'monthly' && ` Date columns are not required — dates are auto-filled for the selected month.`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Step 4: Upload ──────────────────────────────────── */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">Upload your completed CSV or Excel file.</p>

                            {/* Drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-12 cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                            >
                                <div className={`p-3 rounded-full ${dragOver ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                    <FileSpreadsheet size={24} className={dragOver ? 'text-blue-500' : 'text-slate-400'} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-slate-600">Drop your file here or <span className="text-blue-600">browse</span></p>
                                    <p className="text-xs text-slate-400 mt-0.5">Supports .csv and .xlsx</p>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                            </div>

                            {/* Parse error */}
                            {parseError && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-700 font-medium">{parseError}</p>
                                </div>
                            )}

                            {/* Parse success */}
                            {parsedRows.length > 0 && !parseError && (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <p className="text-xs text-emerald-700 font-medium">{parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} parsed and ready to review.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 5: Review ──────────────────────────────────── */}
                    {step === 5 && (
                        <div className="space-y-3">
                            {loading && (
                                <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                                    <Loader2 size={20} className="animate-spin" />
                                    <span className="text-sm">Analysing your file…</span>
                                </div>
                            )}

                            {reviewError && !loading && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-700 font-medium">{reviewError}</p>
                                </div>
                            )}

                            {reviewResult && !loading && (
                                <>
                                    {/* New allocations */}
                                    <ReviewSection
                                        id="new"
                                        label="New Allocations"
                                        count={reviewResult.new_records.length}
                                        color="emerald"
                                        open={openSections.new}
                                        onToggle={() => toggleSection('new')}
                                    >
                                        <ReviewTable
                                            rows={reviewResult.new_records}
                                            columns={[
                                                { key: 'employee_name', label: 'Employee' },
                                                { key: 'project_name',  label: 'Project' },
                                                { key: 'allocation_percentage', label: 'Alloc %', render: v => `${v}%` },
                                                { key: 'project_tags',  label: 'Tags' },
                                                { key: 'allocation_start_date', label: 'Start' },
                                                { key: 'allocation_end_date',   label: 'End' },
                                            ]}
                                        />
                                    </ReviewSection>

                                    {/* Updated allocations */}
                                    <ReviewSection
                                        id="updated"
                                        label="Updated Allocations"
                                        count={reviewResult.updated_records.length}
                                        color="amber"
                                        open={openSections.updated}
                                        onToggle={() => toggleSection('updated')}
                                    >
                                        <ReviewTable
                                            rows={reviewResult.updated_records}
                                            columns={[
                                                { key: 'employee_name', label: 'Employee' },
                                                { key: 'project_name',  label: 'Project' },
                                                {
                                                    key: '_change', label: 'Change',
                                                    render: (_, row) => (
                                                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                                                            {row.old_allocation_percentage}%
                                                            <ChevronRight size={12} />
                                                            {row.allocation_percentage}%
                                                        </span>
                                                    )
                                                },
                                                { key: 'project_tags', label: 'Tags' },
                                            ]}
                                        />
                                    </ReviewSection>

                                    {/* Over-allocated */}
                                    <ReviewSection
                                        id="over"
                                        label="Over-Allocated Employees"
                                        count={reviewResult.over_allocated.length}
                                        color="rose"
                                        open={openSections.over}
                                        onToggle={() => toggleSection('over')}
                                    >
                                        <ReviewTable
                                            rows={reviewResult.over_allocated}
                                            columns={[
                                                { key: 'employee_name',  label: 'Employee' },
                                                { key: 'current_total',  label: 'Current %', render: v => `${v}%` },
                                                { key: 'additional',     label: '+Additional', render: v => `+${v}%` },
                                                { key: 'combined',       label: '= Combined',  render: v => <span className="font-semibold text-red-600">{v}%</span> },
                                            ]}
                                        />
                                    </ReviewSection>

                                    {/* Errors */}
                                    <ReviewSection
                                        id="invalid"
                                        label="Errors"
                                        count={reviewResult.invalid_records.length}
                                        color="red"
                                        open={openSections.invalid}
                                        onToggle={() => toggleSection('invalid')}
                                    >
                                        <div className="divide-y divide-slate-100">
                                            {reviewResult.invalid_records.map((r, i) => (
                                                <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                                                    <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-700">
                                                            {r.row_data?.employee_id || '—'} / {r.row_data?.project_id || '—'}
                                                        </p>
                                                        <p className="text-xs text-red-600">{r.error}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ReviewSection>

                                    {!reviewResult.can_save && (
                                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                            <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
                                            <p className="text-xs text-red-700 font-medium">Fix the errors above before saving. Remove invalid rows from your file and re-upload.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                    <div className="flex gap-2">
                        {step > 1 && (
                            <button
                                onClick={goBack}
                                disabled={saving}
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                            >
                                <ChevronLeft size={15} />
                                Back
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        {step < 5 ? (
                            <button
                                onClick={goNext}
                                disabled={!canProceed()}
                                className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next
                                <ChevronRight size={15} />
                            </button>
                        ) : (
                            <button
                                onClick={handleApproveAndSave}
                                disabled={!reviewResult?.can_save || saving || loading}
                                className="flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {saving
                                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                                    : <><CheckCircle2 size={14} /> Approve & Save</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Helper: Collapsible Review Section ───────────────────────────────────────
const colorMap = {
    emerald: { header: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', title: 'text-emerald-700' },
    amber:   { header: 'bg-amber-50   border-amber-200',   badge: 'bg-amber-100   text-amber-700',   title: 'text-amber-700' },
    rose:    { header: 'bg-rose-50    border-rose-200',    badge: 'bg-rose-100    text-rose-700',    title: 'text-rose-700' },
    red:     { header: 'bg-red-50     border-red-200',     badge: 'bg-red-100     text-red-700',     title: 'text-red-700' },
};

const ReviewSection = ({ label, count, color, open, onToggle, children }) => {
    const c = colorMap[color];
    return (
        <div className={`rounded-xl border ${c.header} overflow-hidden`}>
            <button
                type="button"
                onClick={onToggle}
                className={`w-full flex items-center justify-between px-4 py-3 ${c.header}`}
            >
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${c.title}`}>{label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{count}</span>
                </div>
                {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </button>
            {open && count > 0 && (
                <div className="bg-white border-t border-slate-100 max-h-52 overflow-y-auto">
                    {children}
                </div>
            )}
            {open && count === 0 && (
                <p className="bg-white border-t border-slate-100 px-4 py-3 text-xs text-slate-400">None</p>
            )}
        </div>
    );
};

// ── Helper: Data Table ────────────────────────────────────────────────────────
const ReviewTable = ({ rows, columns }) => (
    <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
                {columns.map(col => (
                    <th key={col.key} className="px-4 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{col.label}</th>
                ))}
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
            {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                    {columns.map(col => (
                        <td key={col.key} className="px-4 py-2 text-slate-600 whitespace-nowrap">
                            {col.render
                                ? col.render(row[col.key], row)
                                : (row[col.key] ?? '—')}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

export default ImportAllocationModal;
