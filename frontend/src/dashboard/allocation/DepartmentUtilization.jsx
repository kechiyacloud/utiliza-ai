import React from 'react';

const DepartmentUtilization = ({ departments }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full lg:w-1/2">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Department Utilization</h3>

            <div className="flex flex-col gap-5">
                {/* Header Row */}
                <div className="flex text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <div className="w-1/3">Department</div>
                    <div className="flex-1 text-center">Utilization</div>
                    <div className="w-1/6 text-right">Bench</div>
                </div>

                {departments.map((dept, index) => (
                    <div key={index} className="flex items-center group">
                        <div className="w-1/3 font-bold text-gray-700 text-sm">{dept.name}</div>
                        <div className="flex-1 px-4">
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full relative"
                                    style={{ width: `${dept.utilization}%` }}
                                ></div>
                            </div>
                            <div className="text-right text-xs text-gray-400 mt-1">{dept.utilization}%</div>
                        </div>
                        <div className="w-1/6 text-right text-sm text-gray-500 font-medium">
                            {dept.bench}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DepartmentUtilization;
