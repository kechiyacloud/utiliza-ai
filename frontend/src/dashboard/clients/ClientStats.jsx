import React from 'react';
import { Users, Briefcase, DollarSign, Star } from 'lucide-react';

const StatCard = ({ label, value, trend, icon: Icon, colorClass }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-2xl font-extrabold text-gray-800">{value}</h3>
            <p className={`text-xs font-bold mt-1 ${trend.includes('+') || trend === 'High' || trend === 'Top Tier' ? 'text-emerald-500' : 'text-gray-500'}`}>
                {trend}
            </p>
        </div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100`}>
            <Icon size={24} className={colorClass.replace('bg-', 'text-').replace('10', '500')} />
        </div>
    </div>
);

const ClientStats = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Clients" value={stats.totalClients.value} trend={stats.totalClients.trend} icon={Users} colorClass="bg-blue-500" />
            <StatCard label="Active Engagement" value={stats.activeProjects.value} trend={stats.activeProjects.trend} icon={Briefcase} colorClass="bg-purple-500" />
            <StatCard label="Total Revenue" value={stats.totalRevenue.value} trend={stats.totalRevenue.trend} icon={DollarSign} colorClass="bg-emerald-500" />
            <StatCard label="Avg Satisfaction" value={stats.clientSatisfaction.value} trend={stats.clientSatisfaction.trend} icon={Star} colorClass="bg-orange-500" />
        </div>
    );
};

export default ClientStats;
