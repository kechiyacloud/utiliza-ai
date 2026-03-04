import React from 'react';
import { MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HighAllocationProjects = ({ projects }) => {
    const navigate = useNavigate();
    if (!projects) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 min-w-[300px] flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">High Allocation Projects</h3>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full">
                    <thead>
                        <tr className="text-[10px] font-bold tracking-widest text-slate-400 border-b border-gray-100 uppercase">
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
                                <td className="py-2.5">
                                    <div className="font-semibold text-slate-800 text-sm">{project.name}</div>
                                    <div className="text-xs text-slate-500 font-medium">{project.resources} Resources</div>
                                </td>
                                <td className="py-2.5 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${project.utilization >= 90 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
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
