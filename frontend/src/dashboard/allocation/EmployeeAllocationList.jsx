import React from 'react';

const EmployeeAllocationList = ({ employees }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full lg:w-1/2 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Employee Allocation Details</h3>
                <div className="px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Focus:</span>
                    <span className="text-xs font-bold text-gray-800">Utilization</span>
                </div>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                            <th className="text-left py-3 pb-2">Employee</th>
                            <th className="text-left py-3 pb-2">Project(s)</th>
                            <th className="text-right py-3 pb-2">Allocation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {employees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold 
                                            ${emp.allocation > 100 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                            {emp.avatar}
                                        </div>
                                        <div className={`text-sm font-medium ${emp.allocation > 100 ? 'text-red-700' : 'text-gray-700'}`}>
                                            {emp.name}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 text-sm text-gray-500">{emp.project}</td>
                                <td className="py-3 text-right">
                                    <span className={`px-2 py-1 rounded text-xs font-bold 
                                        ${emp.allocation > 100 ? 'bg-red-50 text-red-600' :
                                            emp.allocation === 0 ? 'bg-gray-100 text-blue-600' :
                                                'bg-blue-50 text-blue-600'}`}>
                                        {emp.allocation}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployeeAllocationList;
