import React from 'react';
import { Edit2, Briefcase, Phone, Trash2, LayoutDashboard, BarChart3, Users } from 'lucide-react';
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

    // Calculate Metrics
    const totalProjectBudget = (client.projects || []).reduce((acc, p) => acc + parseFloat(p.budget || 0), 0);
    const budgetUtilization = client.budget > 0 ? (totalProjectBudget / client.budget) * 100 : 0;
    
    // Determine Health
    const hasAtRisk = (client.projects || []).some(p => p.status === 'At Risk');
    const healthStatus = hasAtRisk ? 'At Risk' : client.status || 'Stable';
    const healthColor = healthStatus === 'At Risk' ? 'text-red-500 bg-red-50 border-red-100' : 
                       healthStatus === 'Growing' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 
                       'text-blue-500 bg-blue-50 border-blue-100';

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#3BA9FB] to-blue-600 rounded-2xl flex items-center justify-center text-xl font-semibold text-white shadow-lg shadow-blue-500/20 border-2 border-white">
                        {client.logo || (client.name ? client.name.charAt(0) : '?')}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-semibold text-slate-900">{client.name}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${healthColor}`}>
                                {healthStatus}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 text-xs font-medium">
                                {client.industry}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <a href={client.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#3BA9FB] transition-colors flex items-center gap-1">
                                {client.url ? client.url.replace(/^https?:\/\//, '') : 'No website'}
                            </a>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onEdit}
                        className="p-3 text-slate-400 hover:text-[#3BA9FB] hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100"
                        title="Edit Client"
                    >
                        <Edit2 size={20} />
                    </button>
                    <button
                        onClick={() => onDeleteClient(client.id)}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                        title="Delete Client"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-8 py-0 border-b border-slate-100 flex gap-8 bg-white sticky top-0 z-10 shadow-sm shadow-slate-50">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm font-medium ${activeTab === 'overview' ? 'border-[#3BA9FB] text-[#3BA9FB]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <LayoutDashboard size={14} />
                    <span>Overview</span>
                </button>
                <button 
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm font-medium ${activeTab === 'insights' ? 'border-[#3BA9FB] text-[#3BA9FB]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <BarChart3 size={14} />
                    <span>Insights</span>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto custom-scrollbar p-8 space-y-10 bg-slate-50/20">
                {activeTab === 'overview' ? (
                    <>
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Revenue Consumption Card */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-[#3BA9FB]/30 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-medium text-slate-400 mb-1">Revenue Consumption</p>
                                    <h4 className="text-xl font-semibold text-slate-800">
                                        ${totalProjectBudget.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ ${parseFloat(client.budget || 0).toLocaleString()}</span>
                                    </h4>
                                </div>
                                <div className="p-2 bg-blue-50 text-[#3BA9FB] rounded-xl group-hover:scale-110 transition-transform">
                                    <BarChart3 size={16} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-400">Utilization</span>
                                    <span className={budgetUtilization > 100 ? 'text-red-500' : 'text-blue-500'}>{budgetUtilization.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${budgetUtilization > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-400 to-[#3BA9FB]'}`}
                                        style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Team Size Card */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-purple-300/30 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-medium text-slate-400 mb-1">Active Team Size</p>
                                    <h4 className="text-3xl font-bold text-slate-800">{client.stakeholders?.length || 0}</h4>
                                    <p className="text-xs text-slate-400 font-normal mt-1">Allocated across all projects</p>
                                </div>
                                <div className="p-2 bg-purple-50 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                                    <Users size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Projects Summary Card */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-emerald-300/30 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-medium text-slate-400 mb-1">Project Portfolio</p>
                                    <h4 className="text-3xl font-bold text-slate-800">{client.projects?.length || 0}</h4>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                        <p className="text-xs text-emerald-600 font-medium">{client.projects?.filter(p => p.status === 'On Track').length || 0} Healthy</p>
                                    </div>
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                                    <Briefcase size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Strategic Health Trend (Suggestion) */}
                    <div className="bg-gradient-to-r from-[#0B1423] to-[#121D2D] p-6 rounded-3xl border border-white/5 shadow-xl flex items-center justify-between">
                        <div>
                            <h3 className="text-white text-sm font-semibold mb-1">Strategic Health Trend</h3>
                            <p className="text-white/40 text-xs font-normal">Consistency index across last 6 months</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="h-10 w-32">
                                <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                                    <path 
                                        d="M0 25 L10 20 L20 22 L30 15 L40 18 L50 10 L60 12 L70 5 L80 8 L90 2 L100 4" 
                                        fill="none" 
                                        stroke="#3BA9FB" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        className="animate-draw"
                                    />
                                    <circle cx="100" cy="4" r="2" fill="#3BA9FB" className="animate-pulse" />
                                </svg>
                            </div>
                            <div className="text-right">
                                <div className="text-[#3BA9FB] text-sm font-semibold">+14.2%</div>
                                <div className="text-emerald-500 text-xs font-medium">Growth</div>
                            </div>
                        </div>
                    </div>

                    {/* Active Projects Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#3BA9FB]"></div>
                                Project Performance
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-400 text-xs font-medium border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Project</th>
                                        <th className="px-6 py-4">Lead</th>
                                        <th className="px-6 py-4">Timeline</th>
                                        <th className="px-6 py-4 text-right">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {client.projects && client.projects.map((project, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="font-medium text-slate-800">{project.name}</div>
                                                <div className="text-xs text-slate-400 font-normal mt-0.5">${parseFloat(project.budget || 0).toLocaleString()} Budget</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-medium border border-slate-200">
                                                        {project.lead ? project.lead.split(' ').map(n => n[0]).slice(0, 2).join('') : '?'}
                                                    </div>
                                                    <span className="text-slate-600 font-normal text-sm">{project.lead || 'Unassigned'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-slate-500 font-mono text-[10px] bg-slate-100 px-2 py-1 rounded-md inline-block">
                                                    {project.end_date || 'TBD'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border
                                                    ${project.status === 'On Track' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        project.status === 'At Risk' ? 'bg-red-50 text-red-600 border-red-100' :
                                                            'bg-orange-50 text-orange-600 border-orange-100'}
                                                `}>
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse
                                                        ${project.status === 'On Track' ? 'bg-emerald-500' :
                                                            project.status === 'At Risk' ? 'bg-red-500' :
                                                                'bg-orange-500'}
                                                    `} />
                                                    {project.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => onDeleteProject(client.id, idx)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!client.projects || client.projects.length === 0) && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">
                                                No active projects found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Key Stakeholders Grid */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                Team Members & Stakeholders
                            </h3>
                            <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium border border-purple-100">
                                {client.stakeholders?.length || 0} Members
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(client.stakeholders || []).map((s, i) => (
                                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group relative overflow-hidden">
                                    <div className="absolute -top-6 -right-6 w-16 h-16 bg-purple-50 rounded-full opacity-0 group-hover:opacity-50 transition-all duration-500"></div>
                                    
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-medium text-white shadow-md shadow-purple-200 group-hover:scale-110 transition-transform">
                                            {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <div className="text-slate-800 text-sm font-semibold truncate">{s.name}</div>
                                            <div className="text-slate-400 text-xs font-normal mt-0.5">{s.role || 'Contributor'}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between relative z-10">
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                            <div className="w-5 h-5 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center">
                                                <Phone size={8} className="text-slate-400" />
                                            </div>
                                        </div>
                                        <button className="text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors">
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!client.stakeholders || client.stakeholders.length === 0) && (
                                <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                    <Users size={32} className="text-slate-200 mx-auto mb-3" />
                                    <p className="text-xs font-normal text-slate-400">No team members identified</p>
                                </div>
                            )}
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
