import React from 'react';
import { useNavigate } from 'react-router-dom';

const ResourceAvailability = ({ availability }) => {
    const navigate = useNavigate();
    if (!availability) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Forecasted Resource Availability (30 Days)</h3>
                <button className="text-blue-500 text-xs font-bold hover:text-blue-700 uppercase tracking-widest transition-colors">View All</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full relative">
                    <thead className="bg-white sticky top-0 z-10">
                        <tr className="text-[10px] font-bold tracking-widest text-slate-400 border-b border-gray-100 uppercase">
                            <th className="text-left py-2">EMPLOYEE</th>
                            <th className="text-center py-2">CURRENT PROJECT</th>
                            <th className="text-center py-2">RELEASE DATE</th>
                            <th className="text-right py-2">AVAILABILITY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availability.map((item) => (
                            <tr
                                key={item.id}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => {
                                    sessionStorage.setItem('returnToResourceAvailability', 'true');
                                    navigate(`/info/employee/${item.id}`);
                                }}
                            >
                                <td className="py-3.5 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                        {item.id}
                                    </div>
                                    <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                                </td>
                                <td className="py-3.5 text-center text-slate-500 font-medium text-xs">{item.project}</td>
                                <td className="py-3.5 text-center text-slate-500 font-medium text-xs">{item.releaseDate}</td>
                                <td className="py-3.5 text-right font-extrabold text-blue-600 text-sm">{item.availability}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResourceAvailability;
