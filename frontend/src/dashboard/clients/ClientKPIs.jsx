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
                <div key={index} className="bg-white p-6 rounded-2xl flex items-start justify-between group hover:bg-slate-50 transition-colors shadow-sm border border-slate-100">
                    <div>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{kpi.label}</p>
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-3xl font-bold text-slate-800">{kpi.value}</h3>
                            {kpi.sub && <span className="text-slate-400 text-sm font-medium">{kpi.sub}</span>}
                        </div>
                        <p className="text-slate-500 text-xs mt-2">{kpi.change}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
                        <kpi.icon size={22} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ClientKPIs;
