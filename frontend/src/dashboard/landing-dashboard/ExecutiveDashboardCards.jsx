import React from 'react';
import { Users, Briefcase, FolderOpen, Armchair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Card = ({ icon: Icon, value, label, subtext, alertCount, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start relative min-w-[180px] flex-1 cursor-pointer hover:shadow-md transition-shadow"
        >
            {alertCount > 0 && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-red-500 text-[10px] font-bold bg-red-50 px-2 py-0.5 rounded-full">
                    <span>{alertCount}</span>
                </div>
            )}
            <div className="p-2 bg-blue-50 rounded-lg mb-3 text-blue-600">
                <Icon size={20} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-0.5">{value}</h3>
            <p className="text-gray-500 font-medium text-sm mb-2">{label}</p>
            <p className="text-[10px] text-gray-400 font-light">{subtext}</p>
        </div>
    );
};

const ExecutiveDashboardCards = ({ data }) => {
    const navigate = useNavigate();
    if (!data) return null;

    return (
        <div className="flex gap-6 w-full flex-wrap" id="dashboard-cards">
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
        </div>
    );
};

export default ExecutiveDashboardCards;
