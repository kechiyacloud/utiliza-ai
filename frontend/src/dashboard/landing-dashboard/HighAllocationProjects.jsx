import React from 'react';
import { MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HighAllocationProjects = ({ projects }) => {
    const navigate = useNavigate();
    if (!projects) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-w-[300px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">High Allocation Projects</h3>
                <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs font-semibold text-gray-400 border-b border-gray-100">
                            <th className="text-left py-2">PROJECT</th>
                            <th className="text-center py-2">UTIL %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((project) => (
                            <tr
                                key={project.id}
                                onClick={() => {
                                    sessionStorage.setItem('returnToHighAllocation', 'true');
                                    navigate('/info/projects');
                                }}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <td className="py-2">
                                    <div className="font-semibold text-gray-800">{project.name}</div>
                                    <div className="text-xs text-gray-500">{project.resources} Resources</div>
                                </td>
                                <td className="py-2 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${project.utilization >= 90 ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-500'
                                        }`}>
                                        {project.utilization}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HighAllocationProjects;
