import { Briefcase, Calendar, User, ArrowRight } from 'lucide-react';

const ForecastBenchList = ({ employees, onEmployeeClick }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Forecast Bench</h3>
                    <p className="text-xs text-gray-500 font-medium">Employees rolling off in the next 60 days</p>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                {employees && employees.length > 0 ? (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <th className="text-left py-3 pb-2">Resource</th>
                                <th className="text-left py-3 pb-2">Current Project</th>
                                <th className="text-center py-3 pb-2">End Date</th>
                                <th className="text-right py-3 pb-2">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {employees.map((emp) => (
                                <tr key={`${emp.employee_id}-${emp.project_name}`} className="group hover:bg-blue-50/20 transition-all duration-200">
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                                                {emp.photo_url ? (
                                                    <img src={emp.photo_url} alt={emp.employee_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-blue-600" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{emp.employee_name}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{emp.role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-[13px] font-semibold">{emp.project_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-[10px] border border-orange-100">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDate(emp.end_date)}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button
                                            onClick={() => onEmployeeClick && onEmployeeClick(emp)}
                                            className="text-[10px] font-black text-blue-500 hover:text-blue-700 transition-all duration-200 uppercase tracking-tighter flex items-center gap-1 justify-end ml-auto group/btn"
                                        >
                                            See best match
                                            <ArrowRight size={12} className="transition-transform group-hover/btn:translate-x-0.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10 gap-3">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                            <User size={24} className="opacity-20" />
                        </div>
                        <p className="text-sm font-medium">No upcoming roll-offs found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForecastBenchList;
