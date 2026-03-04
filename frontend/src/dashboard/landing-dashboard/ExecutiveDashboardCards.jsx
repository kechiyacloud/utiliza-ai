import React from 'react';
import { Users, Briefcase, FolderOpen, Armchair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Card = ({ icon: Icon, value, label, subtext, alertCount, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start relative min-w-[180px] h-full flex-1 cursor-pointer group hover:-translate-y-1 transition-transform duration-300 overflow-hidden"
        >
            {alertCount > 0 && (
                <div className="absolute top-4 right-4 flex items-center justify-center min-w-5 h-5 text-red-600 text-[10px] font-bold bg-red-50 border border-red-100 px-1.5 rounded-full z-10">
                    {alertCount}
                </div>
            )}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity bg-blue-100"></div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl mb-4 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors z-10">
                <Icon size={22} strokeWidth={2.5} />
            </div>
            <div className="relative z-10 flex flex-col justify-end flex-1">
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{value}</h3>
                <p className="text-slate-500 text-xs font-semibold tracking-wide uppercase mb-1.5">{label}</p>
                <p className="text-[11px] text-slate-400 font-medium">{subtext}</p>
            </div>
        </div>
    );
};

const ExecutiveDashboardCards = ({ data }) => {
    const navigate = useNavigate();
    if (!data) return null;

    return (
        <>
            <Card
                icon={Users}
                value={data.totalEmployees?.value}
                label={data.totalEmployees?.label}
                subtext={data.totalEmployees?.change}
                onClick={() => {
                    sessionStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/employees/list');
                }}
            />
            <Card
                icon={Briefcase}
                value={data.activeClients?.value}
                label={data.activeClients?.label}
                subtext={data.activeClients?.change}
                onClick={() => {
                    sessionStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/client');
                }}
            />
            <Card
                icon={FolderOpen}
                value={data.runningProjects?.value}
                label={data.runningProjects?.label}
                subtext={data.runningProjects?.change}
                alertCount={data.runningProjects?.alertCount}
                onClick={() => {
                    sessionStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/projects');
                }}
            />
            <Card
                icon={Armchair}
                value={data.benchStrength?.value}
                label={data.benchStrength?.label}
                subtext={data.benchStrength?.change}
                onClick={() => {
                    sessionStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/employees/list', { state: { cardFilter: 'bench' } });
                }}
            />
        </>
    );
};

export default ExecutiveDashboardCards;
