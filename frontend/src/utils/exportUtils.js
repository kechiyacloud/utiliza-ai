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
    const headers = Object.keys(data[0] || {});
    const csvRows = [
        headers.join(','),
        ...data.map((row) =>
            headers
                .map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`)
                .join(',')
        )
    ];
    const csv = csvRows.join('\n');
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
    const sheets = Array.isArray(data) ? { Data: data } : data;
    const workbookHtml = Object.entries(sheets)
        .map(([sheetName, rows]) => {
            const safeRows = Array.isArray(rows) ? rows : [];
            const headers = Object.keys(safeRows[0] || {});
            const headerHtml = headers.map((header) => `<th>${header}</th>`).join('');
            const rowHtml = safeRows
                .map((row) => {
                    const cells = headers.map((header) => `<td>${String(row[header] ?? '')}</td>`).join('');
                    return `<tr>${cells}</tr>`;
                })
                .join('');

            return `
                <table>
                    <caption>${sheetName}</caption>
                    <thead><tr>${headerHtml}</tr></thead>
                    <tbody>${rowHtml}</tbody>
                </table>
                <br/>
            `;
        })
        .join('');

    const blob = new Blob(
        [
            `<html><head><meta charset="UTF-8"></head><body>${workbookHtml}</body></html>`
        ],
        { type: 'application/vnd.ms-excel' }
    );
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
