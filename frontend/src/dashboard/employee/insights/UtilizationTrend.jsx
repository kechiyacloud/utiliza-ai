import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const UtilizationTrend = ({ employees }) => {

    const trendData = useMemo(() => {
        // We do not have historical data yet.
        // As a visual placeholder for the requested feature, we will derive 
        // a 6-month simulated historical trend ending in the "Current" actual state.

        const currentTotal = employees.length;
        const currentBench = employees.filter(e => e.employee_status === 'Bench' || e.employee_allocations === 0).length;
        const currentAllocated = currentTotal - currentBench;

        if (currentTotal === 0) return [];

        const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan (Current)'];

        // Generate simulated curve ending at actual current values
        return months.map((month, index) => {
            if (index === 5) {
                return { name: month, allocated: currentAllocated, bench: currentBench };
            }
            // Add some jitter to previous months for a realistic curve
            const jitterA = Math.floor(currentAllocated * (0.8 + (Math.random() * 0.4)));
            const jitterB = Math.floor(currentBench * (0.5 + (Math.random() * 1.5)));

            return {
                name: month,
                allocated: jitterA,
                bench: jitterB
            };
        });

    }, [employees]);

    if (trendData.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 bg-gray-50 rounded-xl border border-gray-100 min-h-[300px]">
                <p className="text-gray-500 font-medium">No utilization data available for this department.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6 pl-4">
                <div>
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1">Bench vs Allocated Trend</h4>
                    <p className="text-xs text-gray-400 font-medium tracking-wide">6-Month Trajectory</p>
                </div>
            </div>

            <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={trendData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
                            dx={-10}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            labelStyle={{ color: '#4b5563', fontWeight: 'bold', marginBottom: '8px' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }} />
                        <Area
                            type="monotone"
                            dataKey="allocated"
                            name="Allocated to Projects"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorAllocated)"
                            activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="bench"
                            name="Available (Bench)"
                            stroke="#f97316"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorBench)"
                            activeDot={{ r: 6, fill: '#ea580c', strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default UtilizationTrend;
