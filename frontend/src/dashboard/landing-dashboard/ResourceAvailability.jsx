import React from 'react';

const ResourceAvailability = ({ availability }) => {
    if (!availability) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Forecasted Resource Availability (30 Days)</h3>
                <button className="text-blue-500 text-sm font-semibold hover:text-blue-700">View All</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs font-semibold text-gray-400 border-b border-gray-100">
                            <th className="text-left py-2">EMPLOYEE</th>
                            <th className="text-center py-2">CURRENT PROJECT</th>
                            <th className="text-center py-2">RELEASE DATE</th>
                            <th className="text-right py-2">AVAILABILITY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availability.map((item) => (
                            <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                        {item.id}
                                    </div>
                                    <span className="font-semibold text-gray-800">{item.name}</span>
                                </td>
                                <td className="py-3 text-center text-gray-500 text-sm">{item.project}</td>
                                <td className="py-3 text-center text-gray-500 text-sm font-medium">{item.releaseDate}</td>
                                <td className="py-3 text-right font-bold text-gray-800">{item.availability}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResourceAvailability;
