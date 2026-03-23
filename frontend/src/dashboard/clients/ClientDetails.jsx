import React from 'react';
import { Edit2, Briefcase, Phone, Trash2, LayoutDashboard, BarChart3 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import ClientInsights from './ClientInsights';
import { useState } from 'react';

const ClientDetails = ({ client, onEdit, onDeleteClient, onDeleteProject }) => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'insights'

    if (!client) return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>Select a client to view details</p>
        </div>
    );

    // Data for Charts (Derived from client props or static for demo)
    const resourceDistData = [
        { name: 'Engineering', value: 65, color: '#3BA9FB' },
        { name: 'Product', value: 20, color: '#A855F7' },
        { name: 'QA', value: 15, color: '#10B981' },
    ];

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#3BA9FB] rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-blue-500/20">
                        {client.logo}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                            <span className="font-mono">{client.industry}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {client.contact}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Client"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => onDeleteClient(client.id)}
                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Client"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 py-2 border-b border-slate-100 flex gap-6 bg-white sticky top-0 z-10">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 py-2 border-b-2 transition-all text-sm font-bold ${activeTab === 'overview' ? 'border-[#3BA9FB] text-[#3BA9FB]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <LayoutDashboard size={14} />
                    <span>Overview</span>
                </button>
                <button 
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-2 py-2 border-b-2 transition-all text-sm font-bold ${activeTab === 'insights' ? 'border-[#3BA9FB] text-[#3BA9FB]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <BarChart3 size={14} />
                    <span>Insights</span>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-8">
                {activeTab === 'overview' ? (
                    <>

                {/* Active Projects Table */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Briefcase size={16} className="text-[#3BA9FB]" />
                            Active Projects
                        </h3>
                        <span className="text-xs text-slate-400">{client.projects?.length || 0} Projects</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Project Name</th>
                                    <th className="px-4 py-3 font-medium">Lead</th>
                                    <th className="px-4 py-3 font-medium">Deadline</th>
                                    <th className="px-4 py-3 font-medium text-right">Status</th>
                                    <th className="px-4 py-3 font-medium text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {client.projects && client.projects.map((project, idx) => (
                                    <tr key={idx} className="hover:bg-white transition-colors group">
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {project.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-xs font-bold border border-indigo-100">
                                                    {project.lead ? project.lead.charAt(0) : '?'}
                                                </div>
                                                <span className="text-slate-600">{project.lead || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                                            {project.end_date || 'TBD'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border
                                                ${project.status === 'On Track' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    project.status === 'At Risk' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        'bg-orange-50 text-orange-600 border-orange-100'}
                                            `}>
                                                <div className={`w-1.5 h-1.5 rounded-full
                                                    ${project.status === 'On Track' ? 'bg-emerald-500' :
                                                        project.status === 'At Risk' ? 'bg-red-500' :
                                                            'bg-orange-500'}
                                                `} />
                                                {project.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => onDeleteProject(client.id, idx)}
                                                className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Project"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!client.projects || client.projects.length === 0) && (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic">
                                            No active projects found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Resource Dist & Stakeholders */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Donut */}
                    <div className="flex flex-col">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Resource Mix</h3>
                        <div className="flex-1 flex items-center gap-4">
                            <div className="h-24 w-24 relative">
                                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                                    <RePieChart>
                                        <Pie
                                            data={resourceDistData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={25}
                                            outerRadius={40}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {resourceDistData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-slate-800 font-bold text-xs">85%</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                {resourceDistData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                                            <span className="text-slate-600">{d.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{d.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stakeholders */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Key Stakeholders (From Projects)</h3>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {(client.stakeholders || []).map((s, i) => (
                                <div key={i} className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white uppercase text-center">
                                        {s.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <div className="text-slate-800 text-xs font-semibold">{s.name}</div>
                                        <div className="text-slate-500 text-[10px]">{s.role || 'Project Member'}</div>
                                    </div>
                                </div>
                            ))}
                            {(!client.stakeholders || client.stakeholders.length === 0) && (
                                <div className="text-xs text-slate-400 italic p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                    No stakeholders identified from projects.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </>
                ) : (
                    <ClientInsights client={client} />
                )}
            </div>
        </div>
    );
};

export default ClientDetails;
