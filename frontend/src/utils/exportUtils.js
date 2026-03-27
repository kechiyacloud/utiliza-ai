import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import cdBlueLogo from '../assets/CD-Blue.svg';

const BRAND_BLUE = [59, 169, 251];
const HEADING_DARK = [15, 23, 42];
const TEXT_MUTED = [100, 116, 139];

export const loadLogoAsBase64 = (src) =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 326;
            canvas.height = img.naturalHeight || 326;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });

/**
 * Adds a branded header to a jsPDF document.
 * Returns the Y position where content should start.
 */
export const buildPDFHeader = (doc, logoBase64, title, subtitle = '') => {
    const pageW = doc.internal.pageSize.getWidth();

    // Blue accent bar
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageW, 18, 'F');

    // Logo in header bar
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 12, 3, 12, 12);
    }

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Cloud Destinations', logoBase64 ? 27 : 14, 12);

    // Report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...HEADING_DARK);
    doc.text(title, 14, 32);

    let separatorY = 40;

    if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(subtitle, 14, 40);
        separatorY = 47;
    }

    // Separator line
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.4);
    doc.line(14, separatorY, pageW - 14, separatorY);

    return separatorY + 5;
};

/**
 * Adds a branded footer (line + page numbers + logo) to every page.
 */
export const addPDFFooter = (doc, logoBase64) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setDrawColor(...BRAND_BLUE);
        doc.setLineWidth(0.3);
        doc.line(14, pageH - 12, pageW - 14, pageH - 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_MUTED);
        doc.text('Cloud Destinations — Confidential', 14, pageH - 6);
        doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 6, { align: 'right' });

        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', pageW / 2 - 4, pageH - 12, 8, 8);
        }
    }
};

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
    URL.revokeObjectURL(url);
};

/**
 * Exports data to Excel (.xlsx)
 * @param {Array|Object} data - Array of objects or object with sheet names as keys
 * @param {string} fileName - Base filename
 */
export const exportToExcel = (data, fileName = 'export') => {
    if (!data) return;
    const sheets = Array.isArray(data) ? { Data: data } : data;
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([sheetName, rows]) => {
        const safeRows = Array.isArray(rows) ? rows : [];
        const ws = XLSX.utils.json_to_sheet(safeRows);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Exports data to PDF with branded header, footer, and logo
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of column definitions { header: string, dataKey: string }
 * @param {string} title - PDF Title
 * @param {string} fileName - Base filename
 */
export const exportToPDF = async (data, columns, title = 'Export', fileName = 'export') => {
    if (!data || !columns) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const logoBase64 = await loadLogoAsBase64(cdBlueLogo);
    const subtitle = `Generated on: ${new Date().toLocaleString('en-GB')}`;
    const startY = buildPDFHeader(doc, logoBase64, title, subtitle);

    const tableRows = data.map(item => columns.map(col => item[col.dataKey] || ''));
    const tableHeaders = [columns.map(col => col.header)];

    autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY,
        theme: 'striped',
        headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        margin: { left: 14, right: 14, bottom: 18 },
    });

    addPDFFooter(doc, logoBase64);
    doc.save(`${fileName}.pdf`);
};
