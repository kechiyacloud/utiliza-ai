import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Exports data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Base filename
 */
export const exportToCSV = (data, fileName = 'export') => {
    if (!data || data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Exports data to Excel (.xlsx)
 * @param {Array|Object} data - Array of objects or object with sheet names as keys
 * @param {string} fileName - Base filename
 */
export const exportToExcel = (data, fileName = 'export') => {
    if (!data) return;
    const workbook = XLSX.utils.book_new();
    
    if (Array.isArray(data)) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    } else {
        // Multi-sheet support
        Object.keys(data).forEach(sheetName => {
            const worksheet = XLSX.utils.json_to_sheet(data[sheetName]);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });
    }

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exports data to PDF
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of column definitions { header: string, dataKey: string }
 * @param {string} title - PDF Title
 * @param {string} fileName - Base filename
 */
export const exportToPDF = (data, columns, title = 'Export', fileName = 'export') => {
    if (!data || !columns) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Add Title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 22);
    
    // Add Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableRows = data.map(item => columns.map(col => item[col.dataKey] || ''));
    const tableHeaders = [columns.map(col => col.header)];

    doc.autoTable({
        head: tableHeaders,
        body: tableRows,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`${fileName}.pdf`);
};
