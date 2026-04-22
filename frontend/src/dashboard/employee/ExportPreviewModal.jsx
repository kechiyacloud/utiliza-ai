import React, { useState } from 'react';
import { X, Download, Filter, Check, Eye } from 'lucide-react';

const EXPORT_COLUMNS = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'employee_name', label: 'Full Name' },
    { key: 'email_id', label: 'Email' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'department', label: 'Department' },
    { key: 'role_designation', label: 'Designation' },
    { key: 'location', label: 'Location' },
    { key: 'employee_status', label: 'Status' },
    { key: 'billable', label: 'Billing Status' },
    { key: 'employee_type', label: 'Employment Type' },
    { key: 'date_of_joining', label: 'Joining Date' },
    { key: 'employee_allocations', label: 'Allocation %' },
    { key: 'skills', label: 'Skills' },
];

export default function ExportPreviewModal({ employees, onClose }) {
    const [selectedCols, setSelectedCols] = useState(
        EXPORT_COLUMNS.map(c => c.key).filter(k => k !== 'employee_id') // Hide ID by default per user request hint
    );

    const toggleCol = (key) => {
        setSelectedCols(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleDownload = () => {
        if (!employees || employees.length === 0) return;

        const activeCols = EXPORT_COLUMNS.filter(c => selectedCols.includes(c.key));
        const headers = activeCols.map(c => c.label);
        
        const rows = employees.map(emp => {
            return activeCols.map(col => {
                let val = emp[col.key] || '';
                if (col.key === 'skills' && Array.isArray(val)) {
                    val = val.join(', ');
                }
                // Quote values for CSV safety
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `active_employees_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    };

    // Preview data - only first 5
    const previewData = employees.slice(0, 5);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                <Filter size={18} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Export Configuration</h2>
                        </div>
                        <p className="text-sm text-slate-500">Select columns to include and preview your data before download</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-2xl hover:bg-slate-200 text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8">
                    {/* Column Selection Sidebar */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Visible Columns</h3>
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            {EXPORT_COLUMNS.map(col => {
                                const isSelected = selectedCols.includes(col.key);
                                return (
                                    <button
                                        key={col.key}
                                        onClick={() => toggleCol(col.key)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                            isSelected 
                                                ? 'bg-white text-blue-600 shadow-sm border border-blue-100' 
                                                : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                                        }`}>
                                            {isSelected && <Check size={12} strokeWidth={4} />}
                                        </div>
                                        {col.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-4">
                            <Eye size={16} className="text-slate-400" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Preview (Top 5 Active Records)</h3>
                        </div>
                        
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {EXPORT_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => (
                                                <th key={col.key} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.length > 0 ? (
                                            previewData.map((emp, i) => (
                                                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                                    {EXPORT_COLUMNS.filter(c => selectedCols.includes(c.key)).map(col => {
                                                        let val = emp[col.key] || '—';
                                                        if (col.key === 'skills' && Array.isArray(val)) val = val.slice(0, 2).join(', ') + (val.length > 2 ? '...' : '');
                                                        return (
                                                            <td key={col.key} className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                                                                {String(val)}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={100} className="px-8 py-12 text-center text-slate-400 italic">
                                                    No active records found matching the filters
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-6 flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                            <Filter size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-900 mb-1">Export Filtering Applied</p>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    We have automatically filtered out **Resigned**, **Notice Period**, and **Deleted** employees to ensure your report only contains active talent.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <p className="text-sm text-slate-500">
                        <span className="font-bold text-slate-800">{employees.length}</span> active records will be exported as CSV
                    </p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={selectedCols.length === 0 || employees.length === 0}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Download size={18} />
                            Download CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
