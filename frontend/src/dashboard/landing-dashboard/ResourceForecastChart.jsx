import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResourceForecastChart = ({ data }) => {
    if (!data) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Resource Forecast (Total vs. Allocated)</h3>
                <div className="flex gap-4 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-400"></span>Allocated</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400"></span>Total Employees</div>
                </div>
            </div>

            <div className="h-[300px] w-full mt-4" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        barGap={8}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="allocated" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                        <Bar dataKey="totalEmployees" fill="#9CA3AF" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ResourceForecastChart;
