import React from 'react';
import { Users, Briefcase, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Card = ({ icon: Icon, value, label, subtext, alertCount, onClick, colorTheme = 'blue' }) => {
    const themeStyles = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' }
    };
    const theme = themeStyles[colorTheme] || themeStyles.blue;

    return (
        <div
            onClick={onClick}
            className={`bg-white p-3 rounded-2xl shadow-sm border ${theme.border} flex flex-col items-start relative min-w-[140px] h-full flex-1 cursor-pointer group hover:-translate-y-1 transition-transform duration-300 overflow-hidden`}
        >
            {alertCount > 0 && (
                <div className="absolute top-2 right-2 flex items-center justify-center min-w-3.5 h-3.5 text-red-600 text-[9px] font-black bg-red-50 border border-red-100 px-1 rounded-full z-20">
                    {alertCount}
                </div>
            )}
            <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${theme.bg}`}></div>

            <div className="flex w-full items-start justify-between z-10 mb-2">
                <div className={`p-1.5 rounded-lg transition-colors ${theme.bg} ${theme.text}`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
            </div>

            <div className="relative z-10 flex flex-col justify-end flex-1 w-full text-left">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-0.5">{value || 0}</h3>
                <p className="text-slate-500 text-[9px] font-bold tracking-wider uppercase mb-0.5">{label}</p>
                {subtext && <p className="text-[9px] text-slate-400 font-medium leading-tight">{subtext}</p>}
            </div>
        </div>
    );
};

const ExecutiveDashboardCards = ({ data, selectedDepartments }) => {
    const navigate = useNavigate();
    if (!data) return null;

    const deptFilterParam = selectedDepartments && selectedDepartments.length > 0 ? selectedDepartments.join(',') : undefined;

    return (
        <>
            <Card
                icon={Users}
                value={data.totalEmployees?.value}
                label={data.totalEmployees?.label}
                subtext={data.totalEmployees?.change}
                colorTheme="slate"
                onClick={() => {
                    localStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/employees/list', { 
                        state: { 
                            showBack: true,
                            departmentFilter: deptFilterParam,
                            fromDashboard: true
                        } 
                    });
                }}
            />
            <Card
                icon={Building2}
                value={data.activeClients?.value}
                label={data.activeClients?.label}
                subtext={data.activeClients?.change}
                colorTheme="blue"
                onClick={() => {
                    localStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/client', { 
                        state: { 
                            showBack: true,
                            departmentFilter: deptFilterParam,
                            fromDashboard: true
                        } 
                    });
                }}
            />
            <Card
                icon={Briefcase}
                value={data.runningProjects?.value}
                label={data.runningProjects?.label}
                subtext={data.runningProjects?.change}
                alertCount={data.runningProjects?.alertCount}
                colorTheme="amber"
                onClick={() => {
                    localStorage.setItem('returnToDashboardCards', 'true');
                    navigate('/info/projects', { 
                        state: { 
                            showBack: true,
                            departmentFilter: deptFilterParam,
                            fromDashboard: true
                        } 
                    });
                }}
            />
        </>
    );
};

export default ExecutiveDashboardCards;
