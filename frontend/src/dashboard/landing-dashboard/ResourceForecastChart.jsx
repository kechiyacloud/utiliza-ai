import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const ResourceForecastChart = ({ data }) => {
    const navigate = useNavigate();
    if (!data) return null;

    return (
        <div
            onClick={() => navigate('/info/allocation', { state: { showBack: true } })}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full h-full flex flex-col cursor-pointer hover:border-slate-300 transition-colors group"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Resource Forecast</h3>
                <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Allocated</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>Total Employees</div>
                </div>
            </div>

            <div className="h-[300px] w-full mt-4" style={{ minHeight: '300px' }}>
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            barGap={8}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9', opacity: 0.8 }}
                                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600, fontSize: '13px' }}
                            />
                            <Bar dataKey="allocated" name="Allocated Employees" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                            <Bar dataKey="totalEmployees" name="Total Employees" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                        No forecast data available
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceForecastChart;
