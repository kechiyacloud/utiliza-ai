import React from 'react';

const ProjectUtilization = ({ projects, onProjectClick }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-h-[450px] max-h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Project Utilization</h3>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                            <th className="text-left py-3 pb-2">Project Name</th>
                            <th className="text-center py-3 pb-2">Billable</th>
                            <th className="text-center py-3 pb-2">Non-Billable</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {projects && projects.length > 0 ? (
                            projects.filter(p => !(p.status || p.project_status || "").toLowerCase().includes('end')).map((project) => (
                                <tr
                                    key={project.project_id}
                                    className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 group cursor-pointer transition-colors"
                                    onClick={() => onProjectClick && onProjectClick(project)}
                                >
                                    <td className="py-4 font-bold text-gray-700 text-sm group-hover:text-blue-600 transition-colors">
                                        {project.project_name}
                                    </td>
                                    <td className="py-4 text-center text-sm">
                                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold">
                                            {project.billable_count}
                                        </span>
                                    </td>
                                    <td className="py-4 text-center text-sm">
                                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-500 font-bold">
                                            {project.non_billable_count}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="py-8 text-center text-gray-400 text-sm">No projects found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProjectUtilization;
