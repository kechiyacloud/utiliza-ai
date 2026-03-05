import React from 'react';
import { Users, Briefcase, FolderOpen, Armchair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Card = ({ icon: Icon, value, label, subtext, alertCount, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start relative min-w-[150px] h-full flex-1 cursor-pointer group hover:-translate-y-1 transition-transform duration-300 overflow-hidden"
        >
            {alertCount > 0 && (
                <div className="absolute top-3 right-3 flex items-center justify-center min-w-4 h-4 text-red-600 text-[10px] font-bold bg-red-50 border border-red-100 px-1.5 rounded-full z-10">
                    {alertCount}
                </div>
            )}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity bg-blue-100"></div>

            <div className="flex w-full items-start justify-between z-10 mb-3">
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                    <Icon size={20} strokeWidth={2.5} />
                </div>
            </div>

            <div className="relative z-10 flex flex-col justify-end flex-1 w-full text-left">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{value}</h3>
                <p className="text-slate-500 text-[10px] font-bold tracking-wider uppercase mb-1">{label}</p>
                <p className="text-[10px] text-slate-400 font-medium">{subtext}</p>
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
                    navigate('/info/employees/list', { state: { showBack: true } });
                }}
            />
            <Card
                icon={Briefcase}
                value={data.activeClients?.value}
                label={data.activeClients?.label}
                subtext={data.activeClients?.change}
                onClick={() => {
                    sessionStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/client', { state: { showBack: true } });
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
                    navigate('/info/projects', { state: { showBack: true } });
                }}
            />
        </>
    );
};

export default ExecutiveDashboardCards;
