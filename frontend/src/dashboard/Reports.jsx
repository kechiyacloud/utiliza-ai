import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, Briefcase, Building2, Download, Loader2, ArrowLeft, BarChart2
} from 'lucide-react';
import api from '../api/axios';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

const Reports = () => {
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState(null);

    const reports = [
        {
            id: 'employees',
            title: 'Employee Directory',
            description: 'Full list of employees with their designations, departments, and contact info.',
            icon: User,
            endpoint: '/employees/list',
            fileName: 'Employee_Directory_Report',
            columns: [
                { header: 'Name', dataKey: 'name' },
                { header: 'Email', dataKey: 'email' },
                { header: 'Department', dataKey: 'department' },
                { header: 'Designation', dataKey: 'designation' },
                { header: 'Status', dataKey: 'employee_status' }
            ]
        },
        {
            id: 'projects',
            title: 'Projects Overview',
            description: 'Consolidated list of all active and historical projects with status and timelines.',
            icon: Briefcase,
            endpoint: '/projects/list',
            fileName: 'Projects_Overview_Report',
            columns: [
                { header: 'Project Name', dataKey: 'project_name' },
                { header: 'Client', dataKey: 'client_name' },
                { header: 'Status', dataKey: 'status' },
                { header: 'Start Date', dataKey: 'start_date' },
                { header: 'End Date', dataKey: 'end_date' }
            ]
        },
        {
            id: 'clients',
            title: 'Client Roster',
            description: 'Complete database of clients and associated partners.',
            icon: Building2,
            endpoint: '/clients',
            fileName: 'Client_Roster_Report',
            columns: [
                { header: 'Client Name', dataKey: 'client_name' },
                { header: 'Partner', dataKey: 'partner_name' },
                { header: 'Location', dataKey: 'location' },
                { header: 'Contact', dataKey: 'primary_contact' }
            ]
        }
    ];

    const handleDownload = async (report, format) => {
        const downloadId = `${report.id}-${format}`;
        setDownloading(downloadId);
        try {
            const res = await api.get(report.endpoint);
            // Handle different API response structures
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);

            if (format === 'csv') {
                exportToCSV(data, report.fileName);
            } else if (format === 'excel') {
                exportToExcel(data, report.fileName);
            } else if (format === 'pdf') {
                await exportToPDF(data, report.columns, report.title, report.fileName);
            }
        } catch (err) {
            console.error(`Export failed for ${report.title}`, err);
            alert(`Failed to download ${report.title}. Please try again.`);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                            <BarChart2 className="text-CD_Blue" />
                            Reports
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Export and download system data</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col hover:border-CD_Blue/20 transition-all group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-slate-50 text-CD_Blue group-hover:bg-CD_Blue group-hover:text-white transition-colors">
                                <report.icon size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-mainTheme text-lg group-hover:text-CD_Blue transition-colors">{report.title}</h3>
                                <p className="text-xs text-gray-500 font-medium line-clamp-1">{report.description}</p>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center gap-2">
                            {['csv', 'excel', 'pdf'].map((format) => (
                                <button
                                    key={format}
                                    disabled={downloading !== null}
                                    onClick={() => handleDownload(report, format)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all
                                        ${downloading === `${report.id}-${format}`
                                            ? 'bg-slate-100 text-slate-400'
                                            : 'bg-slate-50 text-gray-600 hover:bg-mainTheme hover:text-white'
                                        }`}
                                >
                                    {downloading === `${report.id}-${format}` ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Download size={12} />
                                    )}
                                    {format}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
