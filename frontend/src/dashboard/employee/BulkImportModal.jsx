import React, { useState, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet,
  Download, CheckCircle2, AlertCircle, ChevronRight, Info, Loader2, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createEmployee } from '../../api/employeeApi';
import { clearDashboardCache } from '../../api/dashboardApi';

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
  }
];

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500', ring: 'ring-emerald-400' }
};

const CSV_HEADERS = [
  'Employee ID', 'Full Name', 'Email', 'Phone', 'Joining Date', 
  'Designation', 'Department', 'Location', 'Work Mode', 'Employment Type', 
  'Skills (Comma Separated)', 'Reporting Manager ID'
];

function downloadCSVTemplate() {
  const csvContent = [
    CSV_HEADERS.join(',')
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
  const [shouldOverwrite, setShouldOverwrite] = useState(false);
  const [importSummary, setImportSummary] = useState(null); // { success, skipped, overwritten, errors }
  const fileInputRef = useRef();

  const format = FORMAT_OPTIONS.find(f => f.id === selectedFormat);
  const colors = COLOR_MAP[format.color];

  const handleFile = (file) => {
    if (!file) return;
    setUploadedFile(file);
    setUploadStatus('parsing');
    setParseResult(null);

    const fileName = file.name.toLowerCase();
    const isExcelOrCSV = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let jsonData = [];

        if (isExcelOrCSV) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        }

        let validCount = 0;
        let errorsCount = 0;
        let errorDetails = [];
        const parsedEmployees = [];

        jsonData.forEach((row, index) => {
          const rowNum = index + 2;
          const normalizedRow = {};
          Object.keys(row).forEach(k => {
            normalizedRow[k.trim().toLowerCase()] = row[k];
          });

          // Validation logic (consistent across all formats)
          const empId = normalizedRow.employee_id || normalizedRow.id;
          const empName = normalizedRow.employee_name || normalizedRow.name || normalizedRow.full_name;
          const email = normalizedRow.email || normalizedRow.email_id;
          const dobRaw = normalizedRow.date_of_birth || normalizedRow.dob || normalizedRow.birth_date;
          const dojRaw = normalizedRow.date_of_joining || normalizedRow.doj || normalizedRow.joining_date;

          const managerId = normalizedRow.reporting_manager_id || normalizedRow.manager_id || normalizedRow.manager;
          
          if (!empId || !empName || !email || !dojRaw || !managerId) {
            errorsCount++;
            if (errorDetails.length < 5) errorDetails.push(`Entry ${index + 1}: Missing ID, Name, Email, DOJ, or Reporting Manager`);
            return;
          }

          let doj = String(dojRaw);
          let dob = dobRaw ? String(dobRaw) : null;

          try {
            // Excel serial date conversion
            if (isExcelOrCSV && !isNaN(doj) && Number(doj) > 20000) {
               const offset = window.Date.parse("1899-12-30");
               const d = new window.Date(offset + Number(doj) * 86400000);
               doj = d.toISOString().split('T')[0];
            }
            if (dob && isExcelOrCSV && !isNaN(dob) && Number(dob) > 10000) {
               const offset = window.Date.parse("1899-12-30");
               const d = new window.Date(offset + Number(dob) * 86400000);
               dob = d.toISOString().split('T')[0];
            }

            // DOJ vs DOB validation
            if (dob && doj && new window.Date(doj) < new window.Date(dob)) {
               errorsCount++;
               if (errorDetails.length < 5) errorDetails.push(`Entry ${index + 1}: DOJ (${doj}) cannot be before DOB (${dob})`);
               return;
            }
          } catch (dateErr) {
            errorsCount++;
            if (errorDetails.length < 5) errorDetails.push(`Entry ${index + 1}: Invalid date format`);
            return;
          }

          validCount++;

          parsedEmployees.push({
             employee_id: String(empId),
             employee_name: String(empName),
             email: String(email),
             phone: normalizedRow.phone || normalizedRow.phone_number ? String(normalizedRow.phone || normalizedRow.phone_number) : "",
             date_of_joining: doj,
             role_designation: normalizedRow.role_designation || normalizedRow.designation || normalizedRow.role || "Employee",
             department: normalizedRow.department || "General",
             location: normalizedRow.location || "Office",
             work_mode: normalizedRow.work_mode || normalizedRow.mode || "Hybrid",
             employment_type: normalizedRow.employment_type || normalizedRow.employee_type || "Full Time",
             skills: normalizedRow.skills ? String(normalizedRow.skills).split(',').map(s=>s.trim()).filter(Boolean) : [],
             employee_status: "Bench",
             employee_allocations: 0,
             reporting_manager_id: String(managerId || ""),
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
        console.error("Parsing error:", err);
        setUploadStatus('error');
        setParseResult({ total: 0, valid: 0, errors: 1, errorDetails: ['Failed to parse file: ' + err.message] });
      }
    };

    if (isExcelOrCSV) {
      reader.readAsArrayBuffer(file);
    } else {
      setUploadStatus('error');
      setUploadedFile(null); // Clear invalid file
      setParseResult({ total: 0, valid: 0, errors: 1, errorDetails: ['Unsupported file format. Please use CSV or Excel (.xlsx, .xls).'] });
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
    
    let stats = {
      success: 0,
      skipped: 0,
      overwritten: 0,
      errors: []
    };
    
    // Process sequentially to not overwhelm server
    for (const emp of parseResult.data) {
       try {
         const res = await createEmployee(emp, shouldOverwrite);
         
         if (res?.detail?.toLowerCase().includes('upsert')) {
            stats.overwritten++;
         } else {
            stats.success++;
         }
       } catch (err) {
         const errorMsg = err.response?.data?.detail || err.message;
         
         // Handle duplicate when overwrite is OFF
         if (!shouldOverwrite && errorMsg?.toLowerCase().includes('already exists')) {
            stats.skipped++;
         } else {
            stats.errors.push(`${emp.employee_name || 'Unknown'} (${emp.employee_id || 'No ID'}): ${errorMsg}`);
            console.error("Failed to import emp", emp.employee_id, err);
         }
       }
    }
    
    setImportSummary(stats);
    setUploadErrors(stats.errors);

    // Sync dashboard if anything changed
    if (stats.success > 0 || stats.overwritten > 0) {
      try {
        await clearDashboardCache();
      } catch (cacheErr) {
        console.error("Failed to clear cache", cacheErr);
      }
    }

    setUploadStatus('completed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bulk Employee Import</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upload employee data using CSV or Excel formats</p>
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
                <p className="text-xs text-blue-600">Pre-filled with the correct column headers</p>
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

          {/* Upload Format Info - Only one supported now, so we just show the info */}
          <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                <FileSpreadsheet size={20} className={colors.icon} />
              </div>
              <div>
                <p className={`text-sm font-bold ${colors.text}`}>CSV / Excel Support</p>
                <p className="text-xs text-gray-500 mt-0.5">Supported extensions: .csv, .xlsx, .xls</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{format.description}</p>
              </div>
            </div>
          </div>

          {/* Expected Columns Info */}
          <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
            <div className="flex items-start gap-2">
              <Info size={14} className={`${colors.icon} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-xs font-bold ${colors.text} mb-1`}>Expected Template Fields</p>
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Upload File</p>
              
              {/* Overwrite Toggle */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">Overwrite existing records?</span>
                <div 
                  onClick={(e) => { e.stopPropagation(); setShouldOverwrite(!shouldOverwrite); }}
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${shouldOverwrite ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 ${shouldOverwrite ? 'translate-x-3.5' : 'translate-x-0'} shadow-sm`} />
                </div>
              </label>
            </div>

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
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileInput}
                className="hidden"
              />
              {['parsing', 'uploading'].includes(uploadStatus) ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={36} className={`${colors.icon} animate-spin`} />
                  <p className="text-sm font-medium text-gray-600">
                    {uploadStatus === 'uploading' ? 'Importing securely...' : 'Parsing your file...'}
                  </p>
                </div>
              ) : uploadedFile && (uploadStatus === 'success' || uploadStatus === 'completed') ? (
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

          {/* Completed Summary / Results View */}
          {uploadStatus === 'completed' && importSummary && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm animate-in fade-in zoom-in duration-300">
               <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Import Process Completed</h3>
                    <p className="text-[11px] text-slate-500">Summary of actions performed on {uploadedFile?.name}</p>
                  </div>
               </div>

               <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                    <p className="text-lg font-black text-emerald-600">{importSummary.success}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Created</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                    <p className="text-lg font-black text-blue-600">{importSummary.overwritten}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Updated</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                    <p className="text-lg font-black text-amber-500">{importSummary.skipped}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Skipped</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                    <p className="text-lg font-black text-rose-500">{importSummary.errors.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Failed</p>
                  </div>
               </div>

               {importSummary.errors.length > 0 && (
                  <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-100">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[11px] mb-2">
                       <AlertCircle size={12} />
                       Critical Errors
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                       {importSummary.errors.map((e, idx) => (
                          <div key={idx} className="text-[10px] text-rose-500 font-medium leading-tight pl-2 border-l-2 border-rose-200">{e}</div>
                       ))}
                    </div>
                  </div>
               )}
            </div>
          )}

          {/* Initial Parse Result Screen (Before Import) */}
          {parseResult && uploadStatus === 'success' && (
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
          <button 
            onClick={onClose} 
            disabled={uploadStatus === 'uploading'} 
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {uploadStatus === 'completed' ? 'Close' : 'Cancel'}
          </button>
          
          {uploadStatus === 'completed' ? (
            <button
               onClick={() => window.location.reload()}
               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-200"
            >
               Finish & Refresh Data
               <CheckCircle2 size={16} />
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={!uploadedFile || uploadStatus !== 'success' || (parseResult?.valid === 0) || uploadStatus === 'uploading'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-200"
            >
              {uploadStatus === 'uploading' ? 'Importing...' : `Import ${parseResult?.valid ?? ''} Employees`}
              {uploadStatus === 'uploading' ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
