import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchProjectEmployees } from '../../api/allocationApi';

const getAllocationColor = (pct) => {
    if (pct === 0) return { bg: 'bg-gray-50', text: 'text-gray-400' };
    if (pct < 70) return { bg: 'bg-blue-50', text: 'text-blue-600' };
    if (pct <= 100) return { bg: 'bg-emerald-50', text: 'text-emerald-600' };
    return { bg: 'bg-red-50', text: 'text-red-600' };
};

const ProjectEmployeeAllocation = ({ project, onClose }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEmployees = async () => {
            setLoading(true);
            const data = await fetchProjectEmployees(project.project_id);
            setEmployees(data);
            setLoading(false);
        };
        loadEmployees();
    }, [project.project_id]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-h-[450px] max-h-[450px] flex flex-col">
            {/* Header with close button */}
            <div className="flex justify-between items-center mb-5 shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">{project.project_name}</h3>
                    <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider mt-0.5">Allocation Details</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl border border-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all duration-200"
                    title="Close"
                >
                    <X size={16} strokeWidth={2.5} />
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Loading resources...</span>
                </div>
            ) : employees.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                        <X size={24} className="opacity-20" />
                    </div>
                    <span>No employees allocated</span>
                </div>
            ) : (
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <th className="text-left py-3 pb-2">Resource</th>
                                <th className="text-center py-3 pb-2">Status</th>
                                <th className="text-right py-3 pb-2">Utilization</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {employees.map((emp) => {
                                const color = getAllocationColor(emp.allocation_percentage);
                                const isBillable = emp.project_tags && emp.project_tags.toLowerCase().includes('billable') && !emp.project_tags.toLowerCase().includes('non');
                                return (
                                    <tr key={emp.employee_id} className="group hover:bg-blue-50/30 transition-all duration-200">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs uppercase group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                    {emp.employee_name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{emp.employee_name}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">Emp ID: {emp.employee_id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${isBillable ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                                {isBillable ? 'BILLABLE' : 'INTERNAL'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className={`text-sm font-black ${color.text}`}>
                                                    {emp.allocation_percentage}%
                                                </span>
                                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${color.bg.replace('bg-', 'bg-opacity-100 bg-')}`}
                                                        style={{
                                                            width: `${Math.min(emp.allocation_percentage, 100)}%`,
                                                            backgroundColor: emp.allocation_percentage > 100 ? '#ef4444' :
                                                                emp.allocation_percentage >= 70 ? '#10b981' :
                                                                    emp.allocation_percentage > 0 ? '#3b82f6' : '#94a3b8'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-50 shrink-0">
                <div className="flex flex-col items-center">
                    <div className="w-full h-1 rounded bg-gray-200 mb-1.5"></div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Bench</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-full h-1 rounded bg-blue-500 mb-1.5"></div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Partial</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-full h-1 rounded bg-emerald-500 mb-1.5"></div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Full</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-full h-1 rounded bg-red-500 mb-1.5"></div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Critical</span>
                </div>
            </div>
        </div>
    );
};

export default ProjectEmployeeAllocation;
