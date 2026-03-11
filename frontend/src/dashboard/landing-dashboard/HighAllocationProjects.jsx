import React from 'react';
import { MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HighAllocationProjects = ({ projects }) => {
    const navigate = useNavigate();
    if (!projects) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1 min-w-[300px] flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-800 tracking-tight">High Allocation Projects</h3>
                <button
                    onClick={() => navigate('/info/projects', { state: { showBack: true } })}
                    className="text-blue-500 text-[10px] font-black hover:text-blue-700 uppercase tracking-widest transition-colors"
                >
                    View All
                </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[250px] flex-1">
                <table className="w-full">
                    <thead>
                        <tr className="text-[9px] font-black tracking-widest text-slate-400 border-b border-gray-100 uppercase">
                            <th className="text-left py-1.5">PROJECT</th>
                            <th className="text-center py-1.5">UTIL %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((project) => (
                            <tr
                                key={project.id}
                                onClick={() => {
                                    sessionStorage.setItem('returnToHighAllocation', 'true');
                                    navigate('/info/projects', { state: { showBack: true } });
                                }}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <td className="py-2">
                                    <div className="font-bold text-slate-800 text-xs uppercase tracking-tight">{project.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{project.resources} Resources</div>
                                </td>
                                <td className="py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${project.utilization >= 90 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
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
