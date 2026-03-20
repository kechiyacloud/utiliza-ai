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
    const tableHeaders = columns.map((col) => `<th>${col.header}</th>`).join('');
    const tableRows = data
        .map((item) => {
            const cells = columns
                .map((col) => `<td>${String(item[col.dataKey] ?? '')}</td>`)
                .join('');
            return `<tr>${cells}</tr>`;
        })
        .join('');

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
        <html>
            <head>
                <title>${fileName}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                    h1 { margin: 0 0 8px; font-size: 24px; }
                    p { margin: 0 0 20px; color: #64748b; font-size: 12px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
                    th { background: #dbeafe; color: #1e3a8a; font-weight: 700; }
                    tr:nth-child(even) td { background: #f8fafc; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <table>
                    <thead>
                        <tr>${tableHeaders}</tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};
