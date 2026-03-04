import React, { useState, useEffect } from 'react';
import { getEmployeeById, getUpcomingBench } from '../../../api/employeeApi';
import { ChevronDown, ChevronRight, Briefcase } from 'lucide-react';

const BenchPool = ({ employees, onCountLoaded }) => {
    const [expandedRow, setExpandedRow] = useState(null);
    const [expandedData, setExpandedData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [benchEmployees, setBenchEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadBench = async () => {
            setLoading(true);
            try {
                const data = await getUpcomingBench();
                if (mounted) {
                    setBenchEmployees(data);
                    if (onCountLoaded) {
                        onCountLoaded(data.length);
                    }
                }
            } catch (err) {
                console.error("Failed to load upcoming bench:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadBench();
        return () => { mounted = false; };
    }, []);

    const handleRowClick = async (employeeId) => {
        // Toggle off if already expanded
        if (expandedRow === employeeId) {
            setExpandedRow(null);
            setExpandedData(null);
            return;
        }

        // Expand and fetch data
        setExpandedRow(employeeId);
        setLoadingDetails(true);
        try {
            const data = await getEmployeeById(employeeId);
            setExpandedData(data);
        } catch (error) {
            console.error("Failed to fetch employee details", error);
            setExpandedData({ error: true });
        } finally {
            setLoadingDetails(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-500 font-medium">Loading upcoming bench...</p>
            </div>
        );
    }

    if (benchEmployees.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-500 font-medium">No upcoming bench employees found.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[400px]">
            <table className="w-full relative">
                <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100">
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-2 w-8"></th>
                        <th className="py-3 px-2 text-left">Employee</th>
                        <th className="py-3 px-2 text-left">Role</th>
                        <th className="py-3 px-2 text-left">Skills</th>
                        <th className="py-3 px-2 text-left">Bench Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {benchEmployees.map((emp) => (
                        <React.Fragment key={emp.employee_id}>
                            <tr
                                onClick={() => handleRowClick(emp.employee_id)}
                                className={`transition-colors cursor-pointer group ${expandedRow === emp.employee_id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                            >
                                <td className="py-3 px-2 text-gray-400">
                                    {expandedRow === emp.employee_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </td>
                                <td className="py-3 px-2">
                                    <div className="flex items-center gap-3">
                                        {emp.photo_url ? (
                                            <img src={emp.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                                                {(emp.employee_name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                                            </div>
                                        )}
                                        <span className={`font-semibold ${expandedRow === emp.employee_id ? 'text-blue-700' : 'text-gray-800'}`}>
                                            {emp.employee_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3 px-2 text-sm text-gray-600 font-medium">{emp.role_designation}</td>
                                <td className="py-3 px-2">
                                    <div className="flex gap-1 flex-wrap">
                                        {(emp.skills && Array.isArray(emp.skills) ? emp.skills : []).slice(0, 2).map((skill, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                                                {skill}
                                            </span>
                                        ))}
                                        {(emp.skills?.length || 0) > 2 && (
                                            <span className="px-1 py-0.5 text-gray-400 text-[10px] font-bold">
                                                +{emp.skills.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 px-2 text-sm">
                                    <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                                        {emp.bench_date ? new Date(emp.bench_date).toLocaleDateString() : 'TBD'}
                                    </span>
                                </td>
                            </tr>

                            {/* Expanded Details Row */}
                            {expandedRow === emp.employee_id && (
                                <tr className="bg-blue-50/30">
                                    <td colSpan="5" className="p-0">
                                        <div className="px-10 py-4 border-l-4 border-blue-500 animate-fade-in shadow-inner">
                                            {loadingDetails ? (
                                                <p className="text-sm text-gray-500 italic">Loading project details...</p>
                                            ) : expandedData?.error ? (
                                                <p className="text-sm text-red-500">Failed to load details.</p>
                                            ) : expandedData?.projects && expandedData.projects.length > 0 ? (
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <Briefcase size={14} /> Recent / Current Projects
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {expandedData.projects.map((proj, idx) => {
                                                            const endDate = proj.end_date ? new Date(proj.end_date) : null;
                                                            const isPast = endDate && endDate < new Date();

                                                            return (
                                                                <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col gap-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <span className="font-bold text-gray-800 text-sm">{proj.project_name}</span>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isPast ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-600'}`}>
                                                                            {proj.allocation_percentage}% Alloc
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-medium text-gray-500">{proj.role}</span>
                                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                                                        <span className="text-[10px] font-medium text-gray-400">Bench Date:</span>
                                                                        <span className={`text-xs font-bold ${isPast ? 'text-orange-600' : 'text-blue-600'}`}>
                                                                            {endDate ? endDate.toLocaleDateString() : 'TBD'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-100">
                                                    <p className="text-sm text-gray-500 font-medium">No prior project history available.</p>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BenchPool;
