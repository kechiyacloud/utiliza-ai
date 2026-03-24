import React from 'react';
import { Users, Briefcase, Star, UserCheck } from 'lucide-react';

const ClientKPIs = ({ stats }) => {
    const kpiData = [
        { label: 'Total Clients', value: stats?.totalClients?.value || '0', change: stats?.totalClients?.trend || 'Stable', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Active Projects', value: stats?.activeProjects?.value || '0', change: stats?.activeProjects?.trend || 'Active', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { label: 'Total Budget (DB)', value: stats?.totalRevenue?.value || '$0', change: stats?.totalRevenue?.trend || 'Current', icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: 'Avg Satisfaction', value: stats?.clientSatisfaction?.value || 'N/A', sub: stats?.clientSatisfaction?.value !== 'N/A' ? '/5.0' : '', change: stats?.clientSatisfaction?.trend || 'Normal', icon: Star, color: 'text-amber-400', bg: 'bg-amber-50' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => (
                <div key={index} className="bg-white p-6 rounded-2xl flex items-start justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-slate-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-2">{kpi.label}</p>
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{kpi.value}</h3>
                            {kpi.sub && <span className="text-slate-400 text-sm font-bold">{kpi.sub}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{kpi.change}</p>
                        </div>
                    </div>
                    <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative z-10 shadow-sm shadow-current/10`}>
                        <kpi.icon size={22} strokeWidth={2.5} />
                    </div>

                    {/* Subtle background decoration */}
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${kpi.bg} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500`}></div>
                </div>
            ))}
        </div>
    );
};

export default ClientKPIs;
