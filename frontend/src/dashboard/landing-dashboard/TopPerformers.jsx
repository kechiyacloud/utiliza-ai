import React from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TopPerformers = ({ employees }) => {
    const navigate = useNavigate();
    if (!employees) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Top Performers</h3>
                <button className="text-blue-500 text-sm font-semibold hover:text-blue-700">View All</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs font-semibold text-gray-400 border-b border-gray-100">
                            <th className="text-left py-2">EMPLOYEE</th>
                            <th className="text-center py-2">ROLE</th>
                            <th className="text-right py-2">ALLOCATION %</th>
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
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                        {emp.avatar}
                                    </div>
                                    <span className="font-semibold text-gray-800">{emp.name}</span>
                                </td>
                                <td className="py-3 text-center">
                                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                        {emp.role}
                                    </span>
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 text-blue-600 font-bold">
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
