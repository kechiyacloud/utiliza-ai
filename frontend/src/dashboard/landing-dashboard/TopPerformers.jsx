import React from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HighlyAllocatedEmployees = ({ employees }) => {
    const navigate = useNavigate();
    if (!employees) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-full flex flex-col" id="dashboard-high-allocation-list">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Highly Allocated Employees</h3>
                <button
                    onClick={() => navigate('/info/employees/list', { state: { showBack: true } })}
                    className="text-blue-500 text-[10px] font-black hover:text-blue-700 uppercase tracking-widest transition-colors"
                >
                    View All
                </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[250px] flex-1">
                <table className="w-full relative">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                        <tr className="text-[9px] font-black tracking-widest text-slate-400 border-b border-gray-100 uppercase">
                            <th className="text-left py-1.5 px-2">EMPLOYEE</th>
                            <th className="text-center py-1.5 px-2">ROLE</th>
                            <th className="text-right py-1.5 px-2">ALLOC %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr
                                key={emp.id}
                                onClick={() => {
                                    sessionStorage.setItem('returnToHighlyAllocated', 'true');
                                    navigate(`/info/employee/${emp.id}`);
                                }}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <td className="py-2 px-2 flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 border border-slate-200 uppercase">
                                        {emp.avatar}
                                    </div>
                                    <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{emp.name}</span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[9px] font-black border border-slate-100 uppercase">
                                        {emp.role}
                                    </span>
                                </td>
                                <td className="py-2 px-2 text-right">
                                    <div className="flex items-center justify-end gap-1 text-blue-600 font-black text-[11px]">
                                        {emp.allocation}%
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HighlyAllocatedEmployees;
