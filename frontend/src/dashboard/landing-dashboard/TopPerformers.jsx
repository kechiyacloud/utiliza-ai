import React from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TopPerformers = ({ employees }) => {
    const navigate = useNavigate();
    if (!employees) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Top Performers</h3>
                <button
                    onClick={() => navigate('/info/employees/list', { state: { showBack: true } })}
                    className="text-blue-500 text-xs font-bold hover:text-blue-700 uppercase tracking-widest transition-colors"
                >
                    View All
                </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[300px] flex-1">
                <table className="w-full relative">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                        <tr className="text-[10px] font-bold tracking-widest text-slate-400 border-b border-gray-100 uppercase">
                            <th className="text-left py-2 px-2">EMPLOYEE</th>
                            <th className="text-center py-2 px-2">ROLE</th>
                            <th className="text-right py-2 px-2">ALLOCATION %</th>
                            <th className="w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr
                                key={emp.id}
                                onClick={() => {
                                    sessionStorage.setItem('returnToTopPerformers', 'true');
                                    navigate(`/info/employee/${emp.id}`);
                                }}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <td className="py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {emp.avatar}
                                    </div>
                                    <span className="font-semibold text-slate-800 text-sm">{emp.name}</span>
                                </td>
                                <td className="py-3 text-center">
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                                        {emp.role}
                                    </span>
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 text-blue-600 font-extrabold text-sm">
                                        {emp.allocation}%
                                    </div>
                                </td>
                                <td className="py-3 text-right text-gray-400">
                                    &gt;
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopPerformers;
