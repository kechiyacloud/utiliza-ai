import React, { useState } from 'react';
import { X, Target, Award, ArrowRight, ChevronDown, ChevronUp, History, Info } from 'lucide-react';

const getMatchColor = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', progress: 'bg-emerald-500' };
    if (score >= 50) return { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', progress: 'bg-blue-500' };
    return { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', progress: 'bg-orange-500' };
};

const PossibleProjectMatches = ({ employee, projects, loading, onClose }) => {
    const [expandedProjectId, setExpandedProjectId] = useState(null);

    const toggleProject = (id) => {
        setExpandedProjectId(expandedProjectId === id ? null : id);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 h-[500px] flex flex-col">
            {/* Header with close button */}
            <div className="flex justify-between items-center mb-5 shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Project Matches</h3>
                    <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider mt-0.5">Recommendations for {employee?.employee_name}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl border border-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all duration-200"
                    title="Close"
                >
                    <X size={16} strokeWidth={2.5} />
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Analyzing fit and history...</span>
                </div>
            ) : !projects || projects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                        <Target size={24} className="opacity-20" />
                    </div>
                    <span>No suitable projects found</span>
                </div>
            ) : (
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                    <div className="space-y-3">
                        {projects.map((proj) => {
                            const isExpanded = expandedProjectId === proj.project_id;
                            const color = getMatchColor(proj.match_score);

                            return (
                                <div
                                    key={proj.project_id}
                                    className={`rounded-xl border transition-all duration-300 ${isExpanded ? 'border-blue-200 bg-blue-50/10' : 'border-gray-50 hover:border-blue-100 hover:bg-gray-50/50'}`}
                                >
                                    {/* Summary Row */}
                                    <div
                                        className="p-4 cursor-pointer flex items-center justify-between"
                                        onClick={() => toggleProject(proj.project_id)}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-700">{proj.project_name}</span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase">
                                                    {proj.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-medium">
                                                <span>ID: {proj.project_id}</span>
                                                <span className="flex items-center gap-1">
                                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                    {isExpanded ? 'Less details' : 'Know more info'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`text-sm font-black ${color.text}`}>
                                                {proj.match_score}%
                                            </span>
                                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${color.progress}`}
                                                    style={{ width: `${proj.match_score}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed View */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {/* Fit Rationalization */}
                                            <div className={`p-3 rounded-lg border ${color.bg} ${color.border} flex gap-3`}>
                                                <Info size={16} className={`${color.text} shrink-0`} />
                                                <p className="text-[11px] font-medium leading-relaxed text-gray-700">
                                                    <span className="font-bold text-gray-900 block mb-0.5">Fit Analysis</span>
                                                    {proj.fit_analysis}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Skill Gap Analysis */}
                                                <div className="space-y-2">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Award size={12} /> Skill Analysis
                                                    </h4>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {proj.all_required_skills.map((skill, idx) => {
                                                            const isMatch = proj.matching_skills.includes(skill);
                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    className={`px-2 py-0.5 rounded text-[9px] font-bold border ${isMatch
                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                        : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                                                >
                                                                    {skill} {isMatch && '✓'}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Employee Project History */}
                                                <div className="space-y-2">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <History size={12} /> Past Projects
                                                    </h4>
                                                    <div className="space-y-1.5">
                                                        {proj.employee_project_history.length > 0 ? proj.employee_project_history.map((hist, idx) => (
                                                            <div key={idx} className="flex flex-col border-l-2 border-blue-50 pl-2">
                                                                <span className="text-[10px] font-bold text-gray-700 truncate">{hist.name}</span>
                                                                <span className="text-[9px] text-gray-400">{hist.role}</span>
                                                            </div>
                                                        )) : (
                                                            <span className="text-[10px] text-gray-400 italic">No past project data</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PossibleProjectMatches;
