import React, { useState, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet, FileText, FileJson, File,
  Download, CheckCircle2, AlertCircle, ChevronRight, Info, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createEmployee } from '../../api/employeeApi';

const FORMAT_OPTIONS = [
  {
    id: 'csv',
    icon: FileSpreadsheet,
    label: 'CSV / Excel',
    extensions: '.csv, .xlsx, .xls',
    color: 'emerald',
    description: 'Standard spreadsheet format. Download our template for the correct column order.',
    recommended: true,
    columns: ['employee_id', 'employee_name', 'email', 'phone', 'date_of_joining', 'role_designation', 'department', 'location', 'work_mode', 'employment_type', 'skills (comma-separated)']
  },
  {
    id: 'json',
    icon: FileJson,
    label: 'JSON',
    extensions: '.json',
    color: 'blue',
    description: 'Structured JSON array. Each object should match the employee schema.',
    recommended: false,
    columns: ['Same fields as CSV, but as a JSON array of objects']
  },
  {
    id: 'pdf',
    icon: FileText,
    label: 'PDF / Resume',
    extensions: '.pdf',
    color: 'rose',
    description: 'Upload employee offer letters or resumes. Basic details will be auto-extracted (AI-assisted).',
    recommended: false,
    columns: ['Name, Email, Phone, Designation will be auto-parsed from resume text']
  },
  {
    id: 'text',
    icon: File,
    label: 'Plain Text',
    extensions: '.txt, .tsv',
    color: 'amber',
    description: 'Tab-separated or comma-separated plain text with one employee per line.',
    recommended: false,
    columns: ['Same columns as CSV, separated by tab or comma']
  }
];

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500', ring: 'ring-emerald-400' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700',    icon: 'text-blue-500',    ring: 'ring-blue-400' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-300',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700',    icon: 'text-rose-500',    ring: 'ring-rose-400' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700',  icon: 'text-amber-500',   ring: 'ring-amber-400' },
};

const CSV_TEMPLATE_HEADERS = [
  'employee_id', 'employee_name', 'email', 'phone', 'date_of_joining',
  'role_designation', 'department', 'location', 'work_mode', 'employment_type',
  'skills'
];

const CSV_SAMPLE_ROW = [
  'EMP001', 'John Doe', 'john.doe@organization.com', '9876543210', '2024-01-15',
  'Senior Developer', 'Engineering', 'Chennai', 'Hybrid', 'Full Time',
  'React,Node.js,PostgreSQL'
];

function downloadCSVTemplate() {
  const csvContent = [
    CSV_TEMPLATE_HEADERS.join(','),
    CSV_SAMPLE_ROW.join(',')
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employee_bulk_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImportModal({ onClose }) {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'parsing' | 'success' | 'error'
  const [parseResult, setParseResult] = useState(null);
  const fileInputRef = useRef();

  const format = FORMAT_OPTIONS.find(f => f.id === selectedFormat);
  const colors = COLOR_MAP[format.color];

  const handleFile = (file) => {
    if (!file) return;
    setUploadedFile(file);
    setUploadStatus('parsing');
    setParseResult(null);

    const isExcelOrCSV = file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcelOrCSV) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          let validCount = 0;
          let errorsCount = 0;
          let errorDetails = [];
          const parsedEmployees = [];

          jsonData.forEach((row, index) => {
            const rowNum = index + 2; // +1 for 0-index, +1 for header
            // Normalize keys to lowercase just in case
            const normalizedRow = {};
            Object.keys(row).forEach(k => {
              normalizedRow[k.trim().toLowerCase()] = row[k];
            });

            if (!normalizedRow.employee_id || !normalizedRow.employee_name || !normalizedRow.email || !normalizedRow.date_of_joining) {
              errorsCount++;
              if (errorDetails.length < 5) errorDetails.push(`Row ${rowNum}: Missing ID, Name, Email, or DOJ`);
              return;
            }
            validCount++;
            
            // Format dates from excel (often serial numbers) or strings
            let doj = String(normalizedRow.date_of_joining);
            if (!isNaN(doj) && Number(doj) > 20000) { // likely excel serial date
               const offset = window.Date.parse("1899-12-30");
               const d = new window.Date(offset + Number(doj) * 86400000);
               doj = d.toISOString().split('T')[0];
            }

            parsedEmployees.push({
               employee_id: String(normalizedRow.employee_id),
               employee_name: String(normalizedRow.employee_name),
               email: String(normalizedRow.email),
               phone: normalizedRow.phone ? String(normalizedRow.phone) : "",
               date_of_joining: doj,
               role_designation: normalizedRow.role_designation ? String(normalizedRow.role_designation) : "Employee",
               department: normalizedRow.department ? String(normalizedRow.department) : "General",
               location: normalizedRow.location ? String(normalizedRow.location) : "Office",
               work_mode: normalizedRow.work_mode ? String(normalizedRow.work_mode) : "Hybrid",
               employment_type: normalizedRow.employment_type ? String(normalizedRow.employment_type) : "Full Time",
               skills: normalizedRow.skills ? String(normalizedRow.skills).split(',').map(s=>s.trim()).filter(Boolean) : [],
               employee_status: "Bench",
               employee_allocations: 0,
               projects: [],
               certificates: []
            });
          });

          setUploadStatus('success');
          setParseResult({
            total: jsonData.length,
            valid: validCount,
            errors: errorsCount,
            errorDetails: errorDetails,
            data: parsedEmployees
          });
        } catch (err) {
          console.error(err);
          setUploadStatus('error');
          setParseResult({ total: 0, valid: 0, errors: 1, errorDetails: ['Failed to parse file: ' + err.message] });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
        setUploadStatus('success');
        setParseResult({ total: 1, valid: 0, errors: 1, errorDetails: ['Only CSV/Excel parsing is fully supported right now.'], note: 'Auto-extract not implemented.' });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = null; // reset input
  };

  const [uploadErrors, setUploadErrors] = useState([]);

  const handleImport = async () => {
    if (!parseResult || !parseResult.data || parseResult.data.length === 0) return;
    
    setUploadStatus('uploading');
    setUploadErrors([]);
    let successCount = 0;
    let failMessages = [];
    
    // Process sequentially to not overwhelm server
    for (const emp of parseResult.data) {
       try {
         await createEmployee(emp);
         successCount++;
       } catch (err) {
         const errorDetail = err.response?.data?.detail || err.message;
         failMessages.push(`${emp.employee_name || 'Unknown'} (${emp.employee_id || 'No ID'}): ${errorDetail}`);
         console.error("Failed to import emp", emp.employee_id, err);
       }
    }
    
    if (failMessages.length > 0) {
      setUploadErrors(failMessages);
      setUploadStatus('error');
    } else {
      setUploadStatus('success');
      alert(`Successfully imported ${successCount} out of ${parseResult.data.length} employees.`);
      // Force a reload so tables fetch fresh data
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bulk Employee Import</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upload employee data in bulk using any supported format</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {uploadStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                <AlertTriangle size={18} className="text-red-500" />
                <span>Import Partially Failed</span>
              </div>
              <p className="text-red-600 text-[10px] mb-3 font-medium">The following records could not be imported. Please verify the data and try again.</p>
              <div className="max-h-40 overflow-y-auto bg-white/50 rounded-lg p-3 space-y-1.5 border border-red-100 shadow-inner">
                {uploadErrors.map((err, i) => (
                  <div key={i} className="text-[10px] text-red-500 font-medium flex gap-2">
                    <span className="text-red-300 select-none">•</span>
                    {err}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setUploadStatus('success')} 
                className="mt-4 w-full bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg text-xs font-bold transition-all"
              >
                Clear Errors & Continue
              </button>
            </div>
          )}

          {/* Step 1: Download Template */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-800">Start with our CSV Template</p>
                <p className="text-xs text-blue-600">Pre-filled with correct column headers and a sample row</p>
              </div>
            </div>
            <button
              onClick={downloadCSVTemplate}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm"
            >
              <Download size={13} />
              Download
            </button>
          </div>

          {/* Step 2: Choose Format */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Choose Upload Format</p>
            <div className="grid grid-cols-2 gap-3">
              {FORMAT_OPTIONS.map(fmt => {
                const c = COLOR_MAP[fmt.color];
                const isSelected = selectedFormat === fmt.id;
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected ? `${c.border} ${c.bg} ring-2 ${c.ring} ring-offset-1` : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {fmt.recommended && (
                      <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                        Recommended
                      </span>
                    )}
                    <div className={`p-2 rounded-lg inline-flex mb-2 ${isSelected ? c.bg : 'bg-gray-100'}`}>
                      <Icon size={18} className={isSelected ? c.icon : 'text-gray-400'} />
                    </div>
                    <p className={`text-sm font-bold ${isSelected ? c.text : 'text-gray-700'}`}>{fmt.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmt.extensions}</p>
                    <p className="text-xs text-gray-500 mt-1.5 leading-snug">{fmt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expected Columns Info */}
          <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
            <div className="flex items-start gap-2">
              <Info size={14} className={`${colors.icon} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-xs font-bold ${colors.text} mb-1`}>Expected Fields for {format.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {format.columns.map((col, i) => (
                    <span key={i} className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${colors.badge}`}>{col}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Upload Zone */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upload File</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                dragOver
                  ? `${colors.border} ${colors.bg} scale-[1.01]`
                  : uploadedFile
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={format.extensions.split(', ').join(',')}
                onChange={handleFileInput}
                className="hidden"
              />
              {uploadStatus === 'parsing' ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={36} className={`${colors.icon} animate-spin`} />
                  <p className="text-sm font-medium text-gray-600">
                    {uploadStatus === 'uploading' ? 'Importing securely...' : 'Parsing your file...'}
                  </p>
                </div>
              ) : uploadedFile && uploadStatus === 'success' ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                  <p className="text-sm font-bold text-gray-800">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <Upload size={36} className="text-gray-300" />
                  <div>
                    <p className="text-sm font-bold text-gray-600">Drag & drop your file here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{format.extensions}</span>
                </div>
              )}
            </div>
          </div>

          {/* Parse Result */}
          {parseResult && (
            <div className={`p-4 rounded-xl border ${parseResult.errors > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {parseResult.errors > 0
                  ? <AlertCircle size={16} className="text-amber-600" />
                  : <CheckCircle2 size={16} className="text-emerald-600" />
                }
                <p className={`text-sm font-bold ${parseResult.errors > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {parseResult.errors > 0 ? 'Review Required' : 'File Ready to Import'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className="text-lg font-bold text-gray-800">{parseResult.total}</p>
                  <p className="text-xs text-gray-500">Total Rows</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{parseResult.valid}</p>
                  <p className="text-xs text-gray-500">Valid</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className={`text-lg font-bold ${parseResult.errors > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{parseResult.errors}</p>
                  <p className="text-xs text-gray-500">Errors</p>
                </div>
              </div>
              {parseResult.errorDetails?.map((err, i) => (
                <p key={i} className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                  <AlertCircle size={11} /> {err}
                </p>
              ))}
              {parseResult.note && (
                <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1"><Info size={11} /> {parseResult.note}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} disabled={uploadStatus === 'uploading'} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!uploadedFile || uploadStatus !== 'success' || (parseResult?.valid === 0) || uploadStatus === 'uploading'}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-200"
          >
            {uploadStatus === 'uploading' ? 'Importing...' : `Import ${parseResult?.valid ?? ''} Employees`}
            {uploadStatus === 'uploading' ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
