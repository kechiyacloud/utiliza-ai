import React from 'react';

const OrganizationUtilization = ({ data }) => {
    // Bigger donut chart to fill space
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (data.used / 100) * circumference;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-h-[300px] flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Organization Utilization</h3>

            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Donut Chart SVG - Made larger */}
                <div className="relative w-56 h-56">
                    <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 200 200">
                        <circle
                            cx="100"
                            cy="100"
                            r={radius}
                            stroke="#f3f4f6"
                            strokeWidth="16"
                            fill="transparent"
                        />
                        <circle
                            cx="100"
                            cy="100"
                            r={radius}
                            stroke="#3b82f6"
                            strokeWidth="16"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-4xl font-extrabold text-gray-800">{data.used}%</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">Avg Util</span>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-xs font-medium text-gray-500">Bench</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                    <span className="text-xs font-medium text-gray-500">Billable</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                    <span className="text-xs font-medium text-gray-500">Internal</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    <span className="text-xs font-medium text-gray-500">Training</span>
                </div>
            </div>
        </div>
    );
};

export default OrganizationUtilization;
