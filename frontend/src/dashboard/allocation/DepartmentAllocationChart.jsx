import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { fetchDepartmentBreakdown } from '../../api/allocationApi';

const DepartmentAllocationChart = ({ filters }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const params = {
                location: filters?.location === 'All Locations' ? null : filters?.location,
                resource_type: filters?.resourceType === 'All Resources' ? null : filters?.resourceType
            };
            const breakdown = await fetchDepartmentBreakdown(params);
            setData(breakdown);
            setLoading(false);
        };
        loadData();
    }, [filters]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-h-[450px] max-h-[450px] flex flex-col items-center justify-center text-gray-400 gap-3">
                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Loading department breakdown...</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-h-[450px] max-h-[450px] flex flex-col">
            <div className="flex flex-col mb-4">
                <h3 className="text-lg font-bold text-gray-800 tracking-tight">Department Allocation</h3>
            </div>

            <div className="flex-1 w-full">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barSize={32}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="department"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '11px',
                                fontWeight: 'bold'
                            }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{
                                paddingTop: '10px',
                                fontSize: '10px',
                                fontWeight: '600',
                                textTransform: 'none',
                                letterSpacing: 'normal'
                            }}
                        />
                        <Bar
                            dataKey="allocated_billable"
                            stackId="a"
                            fill="#10b981"
                            radius={[0, 0, 0, 0]}
                            name="Allocated: Billable"
                        />
                        <Bar
                            dataKey="allocated_non_billable"
                            stackId="a"
                            fill="#3b82f6"
                            radius={[0, 0, 0, 0]}
                            name="Allocated: Non-Billable"
                        />
                        <Bar
                            dataKey="not_allocated_billable"
                            stackId="a"
                            fill="#cbd5e1"
                            radius={[6, 6, 0, 0]}
                            name="Not Allocated: Billable"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DepartmentAllocationChart;
