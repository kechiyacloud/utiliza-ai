import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const ProjectTypeChart = ({ projects }) => {
    // Calculate distribution from the projects array
    const data = useMemo(() => {
        if (!projects || projects.length === 0) return [];

        const typeCounts = {
            Client: 0,
            Internal: 0,
            Partner: 0
        };

        projects.forEach(p => {
            const typeLower = (p.type || '').toLowerCase();
            if (typeLower === 'client') {
                typeCounts.Client += 1;
            } else if (typeLower === 'internal') {
                typeCounts.Internal += 1;
            } else if (typeLower === 'partner') {
                typeCounts.Partner += 1;
            } else {
                // We'll map anything else to Internal or Partner if it contains Partner
                if (typeLower.includes('partner')) typeCounts.Partner += 1;
                else typeCounts.Internal += 1;
            }
        });

        // Only return segments that have at least 1 project to avoid empty slices
        return [
            { name: 'External Projects', value: typeCounts.Client, color: '#5B21B6' }, // Billable Text color
            { name: 'Internal Projects', value: typeCounts.Internal, color: '#374151' }, // Non-Billable Text color
            { name: 'Partner Projects', value: typeCounts.Partner, color: '#F59E0B' }  // amber-500
        ].filter(item => item.value > 0);

    }, [projects]);

    const totalProjects = data.reduce((sum, item) => sum + item.value, 0);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 font-semibold text-sm">
                    <p className="text-gray-600 mb-1">{payload[0].name}</p>
                    <p className="text-gray-900 text-lg flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>
                        {payload[0].value} <span className="text-gray-400 text-xs font-medium ml-1">Projects</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full h-full flex flex-col relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -z-0"></div>

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Project Type Distribution</h3>
                    <p className="text-sm text-gray-500 font-medium">Breakdown of {totalProjects} projects</p>
                </div>

                <div className="flex-1 min-h-[250px] relative">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={6}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-gray-700 font-semibold text-sm ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-sm">
                            No project data available
                        </div>
                    )}

                    {/* Inner Donut Text */}
                    {data.length > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-36px]">
                            <span className="text-3xl font-extrabold text-gray-800 leading-none">{totalProjects}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectTypeChart;
