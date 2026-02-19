import React from 'react';

const ProjectUtilization = ({ projects }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Project Utilization</h3>
                <button className="text-xs font-bold text-blue-500 hover:text-blue-600">View All</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                            <th className="text-left py-3 pb-2">Project Name</th>
                            <th className="text-center py-3 pb-2">Billable</th>
                            <th className="text-center py-3 pb-2">Non-Billable</th>
                            <th className="text-right py-3 pb-2">Utilization</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((project) => (
                            <tr key={project.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 group">
                                <td className="py-4 font-bold text-gray-700 text-sm">{project.name}</td>
                                <td className="py-4 text-center text-gray-500 text-sm">{project.billable}</td>
                                <td className="py-4 text-center text-gray-500 text-sm">{project.nonBillable}</td>
                                <td className="py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <div className={`font-bold text-sm ${project.utilization > 90 ? 'text-blue-600' : project.utilization < 70 ? 'text-orange-500' : 'text-gray-600'}`}>
                                            {project.utilization}%
                                        </div>
                                        <div className="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center text-[10px] font-bold text-blue-500">
                                            {project.utilization}%
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProjectUtilization;
