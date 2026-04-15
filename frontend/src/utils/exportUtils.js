import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 * Exports data to PDF with consistent branded styling.
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of column definitions { header: string, dataKey: string }
 * @param {string} title - PDF Title
 * @param {string} fileName - Base filename
 * @param {Object} options - { subtitle, logoUrl, columnStyles }
 */
export const exportToPDF = async (data, columns, title = 'Export', fileName = 'export', options = {}) => {
    const { subtitle = '', logoUrl = null, columnStyles = {} } = options;
    if (!data || !columns) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let logoBase64 = null;
    if (logoUrl) {
        try { logoBase64 = await loadLogoAsBase64(logoUrl); } catch { /* skip */ }
    }

    const sub = subtitle || `Generated: ${new Date().toLocaleString('en-GB')}`;
    const startY = buildPDFHeader(doc, logoBase64, title, sub);

    const tableRows = data.map(item => columns.map(col => String(item[col.dataKey] ?? '')));
    const tableHeaders = [columns.map(col => col.header)];

    autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY,
        theme: 'striped',
        headStyles: { fillColor: [59, 169, 251], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica', textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        margin: { left: 14, right: 14, bottom: 18 },
        columnStyles,
    });

    addPDFFooter(doc);
    doc.save(`${fileName}.pdf`);
};

/**
 * Loads a logo asset URL and returns it as a base64 data URL.
 * @param {string} logoUrl - The URL or import path of the logo asset
 * @returns {Promise<string>} base64 data URL
 */
export const loadLogoAsBase64 = (logoUrl) => {
    return new Promise((resolve, reject) => {
        fetch(logoUrl)
            .then((res) => res.blob())
            .then((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })
            .catch(reject);
    });
};

/**
 * Draws a branded header on the first page of a jsPDF doc.
 * @param {jsPDF} doc
 * @param {string|null} logoBase64 - base64 data URL of the logo (or null to skip)
 * @param {string} title
 * @param {string} subtitle
 * @returns {number} Y position immediately after the header (use as startY for autoTable)
 */
export const buildPDFHeader = (doc, logoBase64, title, subtitle) => {
    const pageW = doc.internal.pageSize.getWidth();
    const BRAND_BLUE = [59, 169, 251];

    // Header background band
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageW, 22, 'F');

    // Logo
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'SVG', 8, 3, 30, 16);
        } catch {
            // SVG embed not supported in all jsPDF builds — skip gracefully
        }
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageW / 2, 11, { align: 'center' });

    // Subtitle line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(220, 237, 255);
    doc.text(subtitle, pageW / 2, 18, { align: 'center' });

    // Reset text colour for body
    doc.setTextColor(15, 23, 42);

    return 28; // startY for the first table
};

/**
 * Adds a footer with page numbers and generation date to every page of a jsPDF doc.
 * @param {jsPDF} doc
 * @param {string|null} logoBase64 - unused but kept for API compatibility
 */
export const addPDFFooter = (doc) => {
    const totalPages = doc.internal.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const generated = new Date().toLocaleString('en-GB');

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 214, 229);
        doc.setLineWidth(0.3);
        doc.line(14, pageH - 10, pageW - 14, pageH - 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 140, 160);
        doc.text(`Generated: ${generated}`, 14, pageH - 5.5);
        doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 5.5, { align: 'right' });
        doc.text('Cloud Destination', pageW / 2, pageH - 5.5, { align: 'center' });
    }
};
